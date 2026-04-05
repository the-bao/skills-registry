use axum::extract::{Path, Query, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use crate::error::AppError;
use crate::models::Skill;
use crate::store::Store;

#[derive(Debug, Clone)]
pub struct AppState {
    pub store: Arc<Store>,
    pub registry_path: PathBuf,
    pub skills_install_path: PathBuf,
    pub http_client: reqwest::Client,
    pub anthropic_api_key: String,
    pub anthropic_base_url: String,
    pub anthropic_model: String,
}

#[derive(Debug, Deserialize)]
pub struct ListQuery {
    pub q: Option<String>,
    pub tag: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SkillListResponse {
    pub skills: Vec<Skill>,
    pub total: usize,
}

pub async fn list_skills(
    State(state): State<AppState>,
    Query(query): Query<ListQuery>,
) -> Result<Json<SkillListResponse>, AppError> {
    let q = query.q.unwrap_or_default();
    let tag = query.tag;

    let skills = state.store.search_skills(&q, tag.as_deref())?;
    let total = skills.len();

    Ok(Json(SkillListResponse { skills, total }))
}

pub async fn get_skill(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Skill>, AppError> {
    let skill = state
        .store
        .get_skill(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Skill '{}' not found", name)))?;

    Ok(Json(skill))
}

#[derive(Debug, Deserialize)]
pub struct AddSkillRequest {
    pub source_path: String,
}

pub async fn add_skill(
    State(state): State<AppState>,
    Json(body): Json<AddSkillRequest>,
) -> Result<Json<Skill>, AppError> {
    let source = PathBuf::from(&body.source_path);

    if !source.exists() || !source.is_dir() {
        return Err(AppError::BadRequest(format!(
            "Source path '{}' does not exist or is not a directory",
            body.source_path
        )));
    }

    let skill_file = source.join("SKILL.md");
    if !skill_file.exists() {
        return Err(AppError::BadRequest(format!(
            "No SKILL.md found in '{}'",
            body.source_path
        )));
    }

    let content = fs::read_to_string(&skill_file)?;
    let frontmatter = crate::parser::parse_skill_frontmatter(&content)
        .map_err(|e| AppError::BadRequest(e))?;

    let dest = state.registry_path.join(&frontmatter.name);
    if dest.exists() {
        return Err(AppError::BadRequest(format!(
            "Skill '{}' already exists in registry",
            frontmatter.name
        )));
    }

    copy_dir_recursive(&source, &dest)?;

    let skill = Skill {
        name: frontmatter.name,
        description: frontmatter.description,
        version: frontmatter.version,
        user_invocable: frontmatter.user_invocable,
        tags: vec![],
        path: source
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
    };

    state.store.put_skill(&skill)?;

    Ok(Json(skill))
}

pub async fn delete_skill(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let skill = state
        .store
        .get_skill(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Skill '{}' not found", name)))?;

    let skill_dir = state.registry_path.join(&skill.path);
    if skill_dir.exists() {
        fs::remove_dir_all(&skill_dir)?;
    }

    state.store.delete_skill(&name)?;

    Ok(Json(serde_json::json!({ "deleted": name })))
}

fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), AppError> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}
