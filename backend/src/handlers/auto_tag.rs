use axum::extract::{Path, State};
use axum::Json;
use serde::Serialize;

use crate::error::AppError;
use crate::handlers::skills::AppState;

#[derive(Debug, Serialize)]
pub struct SuggestTagsResponse {
    pub suggested: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct SkillAutoTagResult {
    pub name: String,
    pub tags_added: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct BatchAutoTagResponse {
    pub results: Vec<SkillAutoTagResult>,
    pub total_skills: usize,
    pub tagged_skills: usize,
}

/// Suggest tags for a single skill using AI (no DB writes).
pub async fn suggest_tags(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<SuggestTagsResponse>, AppError> {
    let skill = state
        .store
        .get_skill(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Skill '{}' not found", name)))?;

    let suggested = crate::ai::suggest_tags(
        &state.http_client,
        &state.anthropic_base_url,
        &state.anthropic_api_key,
        &state.anthropic_model,
        &skill.name,
        &skill.description,
        &skill.tags,
    )
    .await?;

    Ok(Json(SuggestTagsResponse { suggested }))
}

/// Auto-tag all skills that have no tags using AI.
pub async fn auto_tag_all(
    State(state): State<AppState>,
) -> Result<Json<BatchAutoTagResponse>, AppError> {
    let skills = state.store.list_skills()?;

    // Filter to skills with no tags
    let untagged: Vec<_> = skills.into_iter().filter(|s| s.tags.is_empty()).collect();
    let total_skills = untagged.len();

    let mut results = Vec::new();
    let mut tagged_count = 0;

    for skill in &untagged {
        match crate::ai::suggest_tags(
            &state.http_client,
            &state.anthropic_base_url,
            &state.anthropic_api_key,
            &state.anthropic_model,
            &skill.name,
            &skill.description,
            &skill.tags,
        )
        .await
        {
            Ok(suggested) => {
                let mut tags_added = Vec::new();
                for tag in &suggested {
                    if !skill.tags.contains(tag) {
                        match state.store.add_tag(&skill.name, tag) {
                            Ok(_) => tags_added.push(tag.clone()),
                            Err(e) => {
                                tracing::warn!(
                                    "Failed to add tag '{}' to '{}': {}",
                                    tag,
                                    skill.name,
                                    e
                                )
                            }
                        }
                    }
                }
                if !tags_added.is_empty() {
                    tagged_count += 1;
                }
                results.push(SkillAutoTagResult {
                    name: skill.name.clone(),
                    tags_added,
                });
            }
            Err(e) => {
                tracing::warn!("Failed to auto-tag '{}': {}", skill.name, e);
                results.push(SkillAutoTagResult {
                    name: skill.name.clone(),
                    tags_added: vec![],
                });
            }
        }
    }

    Ok(Json(BatchAutoTagResponse {
        results,
        total_skills,
        tagged_skills: tagged_count,
    }))
}
