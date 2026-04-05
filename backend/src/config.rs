use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub registry_path: PathBuf,
    pub db_path: PathBuf,
    pub skills_install_path: PathBuf,
    pub port: u16,
    pub anthropic_api_key: String,
    pub anthropic_base_url: String,
    pub anthropic_model: String,
}

impl Config {
    /// Walk up from current dir to find the project root (directory containing Cargo.toml with our package name)
    fn find_project_root() -> PathBuf {
        let start = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
        let mut dir = start.clone();
        loop {
            // Look for the project root by finding a directory that has both registry/ and data/
            if dir.join("registry").join(".gitkeep").exists() && dir.join("data").is_dir() {
                return dir;
            }
            if !dir.pop() {
                return start;
            }
        }
    }

    pub fn from_env() -> Self {
        let home = dirs_sys::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let base = Self::find_project_root();

        let registry_path = std::env::var("REGISTRY_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| base.join("registry"));

        let db_path = std::env::var("DB_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| base.join("data").join("registry.db"));

        let skills_install_path = std::env::var("SKILLS_INSTALL_PATH")
            .map(PathBuf::from)
            .unwrap_or_else(|_| home.join(".claude").join("skills"));

        let port = std::env::var("PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(3000);

        let anthropic_api_key = std::env::var("ANTHROPIC_AUTH_TOKEN").unwrap_or_default();
        let anthropic_base_url = std::env::var("ANTHROPIC_BASE_URL")
            .unwrap_or_else(|_| "https://api.anthropic.com".to_string());
        let anthropic_model = std::env::var("ANTHROPIC_MODEL")
            .unwrap_or_else(|_| "claude-sonnet-4-20250514".to_string());

        Self {
            registry_path,
            db_path,
            skills_install_path,
            port,
            anthropic_api_key,
            anthropic_base_url,
            anthropic_model,
        }
    }
}

mod dirs_sys {
    use std::path::PathBuf;

    pub fn home_dir() -> Option<PathBuf> {
        std::env::var("HOME")
            .or_else(|_| std::env::var("USERPROFILE"))
            .ok()
            .map(PathBuf::from)
    }
}
