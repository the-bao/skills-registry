use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub version: Option<String>,
    pub user_invocable: Option<bool>,
    pub tags: Vec<String>,
    pub path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillFrontmatter {
    pub name: String,
    pub description: String,
    pub version: Option<String>,
    pub user_invocable: Option<bool>,
}

/// Parallel execution group - skills in the same group run in parallel
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParallelGroup {
    pub name: Option<String>,
    pub skills: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Workflow {
    /// Ordered list of groups - groups execute sequentially, skills within each group execute in parallel
    pub groups: Vec<ParallelGroup>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Combination {
    pub name: String,
    pub description: String,
    /// @deprecated Use workflow.groups instead for ordered skills
    pub skills: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub workflow: Option<Workflow>,
}

/// A configured AI agent that can receive skill installs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Agent {
    /// Machine identifier, e.g. "claude-code"
    pub id: String,
    /// Human-readable name, e.g. "Claude Code"
    pub name: String,
    /// Absolute path to this agent's global skills directory
    pub skills_path: PathBuf,
}
