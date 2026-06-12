use axum::Json;
use axum::extract::{Path, Query, State};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Arc;

use crate::error::AppError;
use crate::models::Agent;
use crate::models::Skill;
use crate::store::Store;

#[derive(Debug, Clone)]
pub struct AppState {
    pub store: Arc<Store>,
    pub registry_path: PathBuf,
    pub agents: Vec<Agent>,
    pub http_client: reqwest::Client,
    pub anthropic_api_key: String,
    pub anthropic_base_url: String,
    pub anthropic_model: String,
}

impl AppState {
    pub fn get_agent(&self, agent_id: &str) -> Option<&Agent> {
        self.agents.iter().find(|a| a.id == agent_id)
    }
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
    let frontmatter =
        crate::parser::parse_skill_frontmatter(&content).map_err(|e| AppError::BadRequest(e))?;

    let skill_name = frontmatter.name.clone();
    let dest = state.registry_path.join(&skill_name);
    if dest.exists() {
        return Err(AppError::BadRequest(format!(
            "Skill '{}' already exists in registry",
            skill_name
        )));
    }

    copy_dir_recursive(&source, &dest)?;

    let skill = Skill {
        name: skill_name.clone(),
        description: frontmatter.description,
        version: frontmatter.version,
        user_invocable: frontmatter.user_invocable,
        tags: vec![],
        path: skill_name,
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

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::State;
    use tempfile::TempDir;

    fn test_state(registry_dir: &TempDir, db_dir: &TempDir) -> AppState {
        AppState {
            store: Arc::new(Store::open(&db_dir.path().join("test.db")).unwrap()),
            registry_path: registry_dir.path().to_path_buf(),
            agents: Vec::new(),
            http_client: reqwest::Client::new(),
            anthropic_api_key: String::new(),
            anthropic_base_url: String::new(),
            anthropic_model: String::new(),
        }
    }

    #[tokio::test]
    async fn add_skill_uses_frontmatter_name_for_registry_path() {
        let source_dir = TempDir::new().unwrap();
        let registry_dir = TempDir::new().unwrap();
        let db_dir = TempDir::new().unwrap();
        let skill_source = source_dir.path().join("tweetclaw-source");
        fs::create_dir_all(&skill_source).unwrap();
        fs::write(
            skill_source.join("SKILL.md"),
            indoc::indoc! {r#"
                ---
                name: tweetclaw-social-research
                description: "TweetClaw social research workflow"
                version: "1.0.0"
                user_invocable: true
                ---

                Use TweetClaw to inspect public X/Twitter data.
            "#},
        )
        .unwrap();

        let state = test_state(&registry_dir, &db_dir);
        let Json(skill) = add_skill(
            State(state.clone()),
            Json(AddSkillRequest {
                source_path: skill_source.to_string_lossy().to_string(),
            }),
        )
        .await
        .unwrap();

        assert_eq!(skill.name, "tweetclaw-social-research");
        assert_eq!(skill.path, "tweetclaw-social-research");
        assert!(
            registry_dir
                .path()
                .join("tweetclaw-social-research")
                .join("SKILL.md")
                .exists()
        );
        assert!(!registry_dir.path().join("tweetclaw-source").exists());
        let stored_skill = state
            .store
            .get_skill("tweetclaw-social-research")
            .unwrap()
            .unwrap();
        assert_eq!(stored_skill.path, "tweetclaw-social-research");
    }
}
