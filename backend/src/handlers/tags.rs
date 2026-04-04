use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppError;
use crate::handlers::skills::AppState;

#[derive(Debug, Deserialize)]
pub struct AddTagRequest {
    pub tag: String,
}

pub async fn list_tags(
    State(state): State<AppState>,
) -> Result<Json<serde_json::Value>, AppError> {
    let tags = state.store.get_all_tags()?;
    Ok(Json(serde_json::json!({ "tags": tags })))
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
