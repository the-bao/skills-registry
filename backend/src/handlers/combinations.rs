use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::error::AppError;
use crate::handlers::skills::AppState;
use crate::models::Combination;
use crate::models::Workflow;

#[derive(Debug, Serialize)]
pub struct CombinationListResponse {
    pub combinations: Vec<Combination>,
    pub total: usize,
}

pub async fn list_combinations(
    State(state): State<AppState>,
) -> Result<Json<CombinationListResponse>, AppError> {
    let combos = state.store.list_combinations()?;
    let total = combos.len();
    Ok(Json(CombinationListResponse {
        combinations: combos,
        total,
    }))
}

pub async fn get_combination(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<Combination>, AppError> {
    let combo = state
        .store
        .get_combination(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Combination '{}' not found", name)))?;
    Ok(Json(combo))
}

#[derive(Debug, Deserialize)]
pub struct CreateCombinationRequest {
    pub name: String,
    pub description: String,
    pub skills: Vec<String>,
    #[serde(default)]
    pub workflow: Option<Workflow>,
}

pub async fn create_combination(
    State(state): State<AppState>,
    Json(body): Json<CreateCombinationRequest>,
) -> Result<Json<Combination>, AppError> {
    let name = body.name.trim();
    if name.is_empty() {
        return Err(AppError::BadRequest("Combination name is required".into()));
    }

    if state.store.get_combination(name)?.is_some() {
        return Err(AppError::BadRequest(format!(
            "Combination '{}' already exists",
            name
        )));
    }

    let combo = Combination {
        name: name.to_string(),
        description: body.description,
        skills: body.skills,
        workflow: body.workflow,
    };

    state.store.put_combination(&combo)?;
    Ok(Json(combo))
}

#[derive(Debug, Deserialize)]
pub struct UpdateCombinationRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub skills: Option<Vec<String>>,
    pub workflow: Option<Workflow>,
}

pub async fn update_combination(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(body): Json<UpdateCombinationRequest>,
) -> Result<Json<Combination>, AppError> {
    let mut combo = state
        .store
        .get_combination(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Combination '{}' not found", name)))?;

    if let Some(new_name) = body.name {
        let new_name = new_name.trim();
        if !new_name.is_empty() && new_name != name {
            if state.store.get_combination(new_name)?.is_some() {
                return Err(AppError::BadRequest(format!(
                    "Combination '{}' already exists",
                    new_name
                )));
            }
            state.store.delete_combination(&name)?;
            combo.name = new_name.to_string();
        }
    }
    if let Some(desc) = body.description {
        combo.description = desc;
    }
    if let Some(skills) = body.skills {
        combo.skills = skills;
    }
    if let Some(workflow) = body.workflow {
        combo.workflow = Some(workflow);
    }

    state.store.put_combination(&combo)?;
    Ok(Json(combo))
}

pub async fn delete_combination(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    state.store.delete_combination(&name)?;
    Ok(Json(serde_json::json!({ "deleted": name })))
}

#[derive(Debug, Serialize)]
pub struct InstallCombinationResponse {
    pub installed: Vec<String>,
    pub failed: Vec<String>,
}

#[derive(Debug, Deserialize)]
pub struct InstallCombinationRequest {
    pub agent: String,
}

pub async fn install_combination(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(body): Json<InstallCombinationRequest>,
) -> Result<Json<InstallCombinationResponse>, AppError> {
    let agent = state
        .get_agent(&body.agent)
        .ok_or_else(|| AppError::BadRequest(format!("Unknown agent '{}'", body.agent)))?;

    let combo = state
        .store
        .get_combination(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Combination '{}' not found", name)))?;

    let mut installed = Vec::new();
    let mut failed = Vec::new();
    let install_path = agent.skills_path.clone();

    for skill_name in &combo.skills {
        let skill = match state.store.get_skill(skill_name)? {
            Some(s) => s,
            None => {
                failed.push(skill_name.clone());
                continue;
            }
        };

        let src = state.registry_path.join(&skill.path);
        if !src.exists() {
            failed.push(skill_name.clone());
            continue;
        }

        let dest = install_path.join(skill_name);
        match copy_dir_recursive(&src, &dest) {
            Ok(_) => installed.push(skill_name.clone()),
            Err(_) => failed.push(skill_name.clone()),
        }
    }

    Ok(Json(InstallCombinationResponse { installed, failed }))
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
