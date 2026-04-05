use serde::Deserialize;

use crate::error::AppError;

#[derive(Debug, Deserialize)]
struct AnthropicResponse {
    content: Vec<ContentBlock>,
}

#[derive(Debug, Deserialize)]
struct ContentBlock {
    text: String,
}

#[derive(Debug, serde::Serialize)]
struct MessageRequest {
    model: String,
    max_tokens: u32,
    messages: Vec<Message>,
}

#[derive(Debug, serde::Serialize)]
struct Message {
    role: String,
    content: String,
}

/// Call the Anthropic Messages API to suggest tags for a skill.
pub async fn suggest_tags(
    client: &reqwest::Client,
    base_url: &str,
    api_key: &str,
    model: &str,
    skill_name: &str,
    skill_description: &str,
    existing_tags: &[String],
) -> Result<Vec<String>, AppError> {
    if api_key.is_empty() {
        return Err(AppError::BadRequest(
            "AI API key not configured. Set ANTHROPIC_AUTH_TOKEN env var.".into(),
        ));
    }

    let existing = if existing_tags.is_empty() {
        "无".to_string()
    } else {
        existing_tags.join(", ")
    };

    let prompt = format!(
        r#"你是一个标签分类系统。根据技能的名称和描述，生成恰好3个简洁的中文标签。

规则：
- 必须返回恰好3个标签，不多不少
- 每个标签2-6个字
- 3个标签必须从不同维度描述技能，避免语义重叠。例如一个描述用途，一个描述领域，一个描述技术特点
- 只选最贴切的标签，宁缺毋滥
- 只返回一个JSON数组，不要其他内容
- 不要包含已有标签
- 示例：["前端开发", "UI设计", "代码生成"] — 三个标签分别对应技术栈、设计领域、核心功能

技能名称：{name}
技能描述：{description}
已有标签：{existing}"#,
        name = skill_name,
        description = skill_description,
        existing = existing,
    );

    let url = format!("{}/v1/messages", base_url.trim_end_matches('/'));

    let body = MessageRequest {
        model: model.to_string(),
        max_tokens: 256,
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
    };

    let resp = client
        .post(&url)
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "AI API error ({}): {}",
            status, text
        )));
    }

    let api_resp: AnthropicResponse = resp.json().await?;

    let text = api_resp
        .content
        .first()
        .map(|b| b.text.as_str())
        .unwrap_or("");

    // Strip markdown code fences if present
    let text = text.trim();
    let text = text
        .strip_prefix("```json")
        .or_else(|| text.strip_prefix("```"))
        .unwrap_or(text)
        .trim();
    let text = text.strip_suffix("```").unwrap_or(text).trim();

    let mut tags: Vec<String> = serde_json::from_str(text).unwrap_or_else(|e| {
        tracing::warn!("Failed to parse AI tags from '{}': {}", text, e);
        Vec::new()
    });

    // Hard cap at 3 tags
    tags.truncate(3);

    Ok(tags)
}
