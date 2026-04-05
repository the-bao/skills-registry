use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;
use serde::Serialize;

use crate::error::AppError;
use crate::handlers::skills::AppState;

#[derive(Debug, Deserialize)]
pub struct AddTagRequest {
    pub tag: String,
}

#[derive(Debug, Deserialize)]
pub struct RenameTagRequest {
    pub new_name: String,
}

#[derive(Debug, Serialize)]
pub struct TagDetail {
    pub name: String,
    pub skill_count: usize,
}

pub async fn list_tags(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tags = state.store.get_all_tags()?;
    Ok(Json(serde_json::json!({ "tags": tags })))
}

pub async fn list_tag_details(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tags = state.store.get_all_tags()?;
    let details: Vec<TagDetail> = tags
        .into_iter()
        .map(|name| {
            let skill_count = state.store.get_skills_with_tag(&name).unwrap_or_default().len();
            TagDetail { name, skill_count }
        })
        .collect();
    Ok(Json(serde_json::json!({ "tags": details })))
}

pub async fn add_tag(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(body): Json<AddTagRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.store.add_tag(&name, &body.tag)?;
    Ok(Json(serde_json::json!({ "added": body.tag })))
}

pub async fn remove_tag(
    State(state): State<AppState>,
    Path((name, tag)): Path<(String, String)>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.store.remove_tag(&name, &tag)?;
    Ok(Json(serde_json::json!({ "removed": tag })))
}

pub async fn rename_tag(
    State(state): State<AppState>,
    Path(old_name): Path<String>,
    Json(body): Json<RenameTagRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.store.rename_tag(&old_name, &body.new_name)?;
    Ok(Json(serde_json::json!({ "renamed": { "from": old_name, "to": body.new_name } })))
}

pub async fn delete_tag(
    State(state): State<AppState>,
    Path(tag_name): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.store.delete_tag(&tag_name)?;
    Ok(Json(serde_json::json!({ "deleted": tag_name })))
}
