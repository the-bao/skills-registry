use axum::extract::{Path, State};
use axum::Json;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;

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

/// List all configured AI agents
pub async fn list_agents(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::models::Agent>>, AppError> {
    Ok(Json(state.agents.clone()))
}

/// List skills available for import from ~/.claude/skills/
pub async fn list_importable(
    State(state): State<AppState>,
) -> Result<Json<Vec<ImportableSkill>>, AppError> {
    let mut importable = Vec::new();

    let install_path = state.agents.first().map(|a| a.skills_path.clone()).unwrap_or_default();
    if !install_path.exists() {
        return Ok(Json(importable));
    }

    for entry in fs::read_dir(&install_path)? {
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
    let install_path = state.agents.first().map(|a| a.skills_path.clone()).unwrap_or_default();

    for name in body.names {
        let src = install_path.join(&name);
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

#[derive(Debug, Deserialize)]
pub struct InstallSkillRequest {
    pub target_dir: Option<String>,
}

/// Install a skill from registry to {target_dir}/.claude/skills/{skill_name}
pub async fn install_skill(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(body): Json<InstallSkillRequest>,
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

    let install_base = match &body.target_dir {
        Some(dir) => {
            let base = PathBuf::from(dir);
            let claude_dir = base.join(".claude");
            let skills_dir = claude_dir.join("skills");

            // Check if the specific skill already exists in .claude/skills/
            if skills_dir.join(&name).exists() {
                return Err(AppError::BadRequest(format!(
                    "Skill '{}' is already installed in '{}'/.claude/skills. \
                    Please choose a different directory or remove the existing skill first.",
                    name, dir
                )));
            }

            fs::create_dir_all(&skills_dir)?;
            skills_dir
        }
        None => {
            let install_path = state.agents.first().map(|a| a.skills_path.clone()).unwrap_or_default();
            let dest = install_path.join(&name);

            // Check if this skill already exists in the global install path
            if dest.exists() {
                return Err(AppError::BadRequest(format!(
                    "Skill '{}' is already installed globally. Please remove it first or use a custom directory.",
                    name
                )));
            }

            fs::create_dir_all(&install_path)?;
            copy_dir_recursive(&src, &dest)?;
            return Ok(Json(serde_json::json!({ "installed": name, "path": dest.to_string_lossy() })));
        }
    };

    let dest = install_base.join(&name);
    copy_dir_recursive(&src, &dest)?;

    Ok(Json(serde_json::json!({ "installed": name, "path": dest.to_string_lossy() })))
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

// --- GitHub Import ---

#[derive(Debug, Deserialize)]
pub struct GithubImportRequest {
    pub repo: String,
}

#[derive(Debug, Serialize)]
pub struct GithubImportResponse {
    pub imported: Vec<String>,
    pub failed: Vec<String>,
    pub skipped: Vec<String>,
}

/// Parse "owner/repo" or full GitHub URL into "owner/repo" format.
fn parse_repo(input: &str) -> Result<String, AppError> {
    let trimmed = input.trim();

    // Already in "owner/repo" format
    if let Some((owner, repo)) = trimmed.split_once('/') {
        // Make sure there's no extra path segments or scheme
        if !owner.is_empty()
            && !owner.contains(':')
            && !owner.contains('/')
            && !repo.is_empty()
            && !repo.contains('/')
        {
            let repo = repo.trim_end_matches(".git");
            return Ok(format!("{}/{}", owner, repo));
        }
    }

    // https://github.com/owner/repo or https://github.com/owner/repo.git
    if let Some(rest) = trimmed
        .strip_prefix("https://github.com/")
        .or_else(|| trimmed.strip_prefix("http://github.com/"))
    {
        let rest = rest.trim_end_matches('/');
        let rest = rest.trim_end_matches(".git");
        let parts: Vec<&str> = rest.splitn(3, '/').collect();
        if parts.len() >= 2 && !parts[0].is_empty() && !parts[1].is_empty() {
            return Ok(format!("{}/{}", parts[0], parts[1]));
        }
    }

    // git@github.com:owner/repo.git
    if let Some(rest) = trimmed.strip_prefix("git@github.com:") {
        let rest = rest.trim_end_matches('/');
        let rest = rest.trim_end_matches(".git");
        let parts: Vec<&str> = rest.splitn(3, '/').collect();
        if parts.len() >= 2 && !parts[0].is_empty() && !parts[1].is_empty() {
            return Ok(format!("{}/{}", parts[0], parts[1]));
        }
    }

    Err(AppError::BadRequest(format!(
        "Invalid repo format '{}'. Expected 'owner/repo', 'https://github.com/owner/repo', or 'git@github.com:owner/repo.git'",
        trimmed
    )))
}

/// If root has SKILL.md, return [root]. Otherwise recursively scan subdirectories
/// (skip hidden dirs like .git) for SKILL.md.
fn scan_skill_dirs(base: &PathBuf) -> Result<Vec<PathBuf>, AppError> {
    let mut skill_dirs = Vec::new();

    if base.join("SKILL.md").exists() {
        skill_dirs.push(base.clone());
        return Ok(skill_dirs);
    }

    for entry in fs::read_dir(base)? {
        let entry = entry?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        // Skip hidden directories (e.g. .git)
        let dir_name = entry.file_name();
        let name_str = dir_name.to_string_lossy();
        if name_str.starts_with('.') {
            continue;
        }

        if path.join("SKILL.md").exists() {
            skill_dirs.push(path);
        } else {
            // Recurse into subdirectories that don't contain SKILL.md themselves
            let nested = scan_skill_dirs(&path)?;
            skill_dirs.extend(nested);
        }
    }

    Ok(skill_dirs)
}

/// Import skills from a GitHub repository.
pub async fn import_from_github(
    State(state): State<AppState>,
    Json(body): Json<GithubImportRequest>,
) -> Result<Json<GithubImportResponse>, AppError> {
    let repo = parse_repo(&body.repo)?;
    let repo_slug = repo.replace('/', "-");

    let temp_dir = std::env::temp_dir().join(format!("skills-registry-github-{}", repo_slug));

    // Clean up any previous clone at this path
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)?;
    }

    let clone_url = format!("https://github.com/{}.git", repo);

    // Run git clone --depth 1
    let output = Command::new("git")
        .args(["clone", "--depth", "1", &clone_url, temp_dir.to_string_lossy().as_ref()])
        .output()
        .map_err(|e| AppError::Internal(format!("Failed to execute git: {}", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        // Clean up failed clone directory if it was created
        if temp_dir.exists() {
            let _ = fs::remove_dir_all(&temp_dir);
        }
        return Err(AppError::Internal(format!(
            "git clone failed: {}",
            stderr.trim()
        )));
    }

    let skill_dirs = scan_skill_dirs(&temp_dir)?;

    let mut imported = Vec::new();
    let mut failed = Vec::new();
    let mut skipped = Vec::new();

    for skill_dir in &skill_dirs {
        let skill_file = skill_dir.join("SKILL.md");
        let content = match fs::read_to_string(&skill_file) {
            Ok(c) => c,
            Err(e) => {
                tracing::warn!("Failed to read SKILL.md in {:?}: {}", skill_dir, e);
                let name = skill_dir
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                failed.push(name);
                continue;
            }
        };

        let frontmatter = match crate::parser::parse_skill_frontmatter(&content) {
            Ok(f) => f,
            Err(e) => {
                tracing::warn!("Failed to parse frontmatter in {:?}: {}", skill_dir, e);
                let name = skill_dir
                    .file_name()
                    .unwrap_or_default()
                    .to_string_lossy()
                    .to_string();
                failed.push(name);
                continue;
            }
        };

        let skill_name = frontmatter.name.clone();
        let dest = state.registry_path.join(&skill_name);

        // Skip if already exists in registry
        if dest.exists()
            || state
                .store
                .get_skill(&skill_name)
                .unwrap_or_default()
                .is_some()
        {
            skipped.push(skill_name);
            continue;
        }

        match copy_dir_recursive(skill_dir, &dest) {
            Ok(_) => {
                let skill = Skill {
                    name: frontmatter.name.clone(),
                    description: frontmatter.description,
                    version: frontmatter.version,
                    user_invocable: frontmatter.user_invocable,
                    tags: vec![],
                    path: skill_name.clone(),
                };
                match state.store.put_skill(&skill) {
                    Ok(_) => imported.push(skill_name),
                    Err(e) => {
                        tracing::warn!("Failed to index skill '{}': {}", skill_name, e);
                        // Clean up copied directory
                        let _ = fs::remove_dir_all(&dest);
                        failed.push(skill_name);
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to copy skill '{}': {}", skill_name, e);
                failed.push(skill_name);
            }
        }
    }

    // Clean up temp dir
    if temp_dir.exists() {
        let _ = fs::remove_dir_all(&temp_dir);
    }

    Ok(Json(GithubImportResponse {
        imported,
        failed,
        skipped,
    }))
}
