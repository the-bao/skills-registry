use serde_json::Value;

use crate::error::AppError;

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
    all_tags: &[String],
) -> Result<Vec<String>, AppError> {
    if api_key.is_empty() {
        return Err(AppError::BadRequest(
            "AI API key not configured. Set ANTHROPIC_AUTH_TOKEN env var.".into(),
        ));
    }

    let skill_existing = if existing_tags.is_empty() {
        "无".to_string()
    } else {
        existing_tags.join(", ")
    };

    let all_existing_tags = if all_tags.is_empty() {
        "（当前系统中暂无标签）".to_string()
    } else {
        format!("{}", all_tags.join(", "))
    };

    let prompt = format!(
        r#"你是一个标签分类系统。根据技能的名称和描述，从已有标签库中选择最贴切的标签。

## 已有标签库（优先从中选择）
{all_tags}

## 当前技能已有标签
{skill_existing}

## 规则
- 必须返回恰好3个标签，不多不少
- 优先从已有标签库中选择已有标签，保持标签一致性
- 如果已有标签库中没有合适的，可以生成新的中文标签（2-6字）
- 3个标签必须从不同维度描述技能，避免语义重叠
- 只返回一个JSON数组，不要其他内容
- 示例：["前端开发", "UI设计", "代码生成"]

技能名称：{name}
技能描述：{description}"#,
        all_tags = all_existing_tags,
        skill_existing = skill_existing,
        name = skill_name,
        description = skill_description,
    );

    let url = format!("{}/v1/messages", base_url.trim_end_matches('/'));

    let body = MessageRequest {
        model: model.to_string(),
        max_tokens: 1024,
        messages: vec![Message {
            role: "user".to_string(),
            content: prompt,
        }],
    };

    let resp = if base_url.contains("bigmodel") || base_url.contains("zhipu") {
        // GLM uses Authorization Bearer header
        client
            .post(&url)
            .header("Authorization", format!("Bearer {}", api_key))
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?
    } else {
        // Anthropic/MiniMax use x-api-key header
        client
            .post(&url)
            .header("x-api-key", api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await?
    };

    if !resp.status().is_success() {
        let status = resp.status();
        let text = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!(
            "AI API error ({}): {}",
            status, text
        )));
    }

    let api_resp: Value = resp.json().await?;

    // Extract text from content blocks — prefer "text" type, fall back to "thinking" type
    let text = api_resp["content"]
        .as_array()
        .and_then(|arr| {
            arr.iter()
                .find(|b| b["type"] == "text")
                .or_else(|| arr.iter().find(|b| b["type"] == "thinking"))
        })
        .and_then(|b| b.get("text").or_else(|| b.get("thinking")))
        .and_then(|v| v.as_str())
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
