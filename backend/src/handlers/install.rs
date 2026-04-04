use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::error::AppError;
use crate::handlers::skills::AppState;
use crate::models::Skill;

#[derive(Debug, Serialize)]
pub struct ImportableSkill {
    pub name: String,
    pub path: String,
}

#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub names: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct ImportResponse {
    pub imported: Vec<String>,
    pub failed: Vec<String>,
}

/// List skills available for import from ~/.claude/skills/
pub async fn list_importable(
    State(state): State<AppState>,
) -> Result<Json<Vec<ImportableSkill>>, AppError> {
    let mut importable = Vec::new();

    if !state.skills_install_path.exists() {
        return Ok(Json(importable));
    }

    for entry in fs::read_dir(&state.skills_install_path)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }

        let skill_file = entry.path().join("SKILL.md");
        if !skill_file.exists() {
            continue;
        }

        let content = fs::read_to_string(&skill_file)?;
        let frontmatter = match crate::parser::parse_skill_frontmatter(&content) {
            Ok(f) => f,
            Err(_) => continue,
        };

        // Skip if already in registry
        if state
            .store
            .get_skill(&frontmatter.name)
            .unwrap_or_default()
            .is_some()
        {
            continue;
        }

        importable.push(ImportableSkill {
            name: frontmatter.name,
            path: entry.path().to_string_lossy().to_string(),
        });
    }

    Ok(Json(importable))
}

/// Import selected skills from ~/.claude/skills/ to registry
pub async fn import_skills(
    State(state): State<AppState>,
    Json(body): Json<ImportRequest>,
) -> Result<Json<ImportResponse>, AppError> {
    let mut imported = Vec::new();
    let mut failed = Vec::new();

    for name in body.names {
        let src = state.skills_install_path.join(&name);
        if !src.exists() || !src.join("SKILL.md").exists() {
            failed.push(name);
            continue;
        }

        let content = fs::read_to_string(src.join("SKILL.md"))?;
        let frontmatter = match crate::parser::parse_skill_frontmatter(&content) {
            Ok(f) => f,
            Err(_) => {
                failed.push(name);
                continue;
            }
        };

        let dest = state.registry_path.join(&name);
        if dest.exists() {
            failed.push(name);
            continue;
        }

        match copy_dir_recursive(&src, &dest) {
            Ok(_) => {
                let skill = Skill {
                    name: frontmatter.name.clone(),
                    description: frontmatter.description,
                    version: frontmatter.version,
                    user_invocable: frontmatter.user_invocable,
                    tags: vec![],
                    path: name.clone(),
                };
                state.store.put_skill(&skill)?;
                imported.push(name);
            }
            Err(_) => {
                failed.push(name);
            }
        }
    }

    Ok(Json(ImportResponse { imported, failed }))
}

/// Install a skill from registry to ~/.claude/skills/
pub async fn install_skill(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<serde_json::Value>, AppError> {
    let skill = state
        .store
        .get_skill(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Skill '{}' not found", name)))?;

    let src = state.registry_path.join(&skill.path);
    if !src.exists() {
        return Err(AppError::Internal(format!(
            "Skill directory '{}' not found in registry",
            skill.path
        )));
    }

    let dest = state.skills_install_path.join(&name);
    fs::create_dir_all(&state.skills_install_path)?;

    copy_dir_recursive(&src, &dest)?;

    Ok(Json(serde_json::json!({ "installed": name })))
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
