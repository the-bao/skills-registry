use std::collections::HashSet;
use std::fs;
use std::path::Path;

use redb::{Database, ReadableTable, TableDefinition};

use crate::error::AppError;
use crate::models::Combination;
use crate::models::Skill;
use crate::parser::parse_skill_frontmatter;

const SKILLS_TABLE: TableDefinition<&str, &str> = TableDefinition::new("skills");
const TAGS_TABLE: TableDefinition<&str, &str> = TableDefinition::new("tags");
const COMBINATIONS_TABLE: TableDefinition<&str, &str> = TableDefinition::new("combinations");

#[derive(Debug)]
pub struct Store {
    db: Database,
}

impl Store {
    pub fn open(path: &Path) -> Result<Self, AppError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let db = Database::create(path)?;
        let write_txn = db.begin_write()?;
        write_txn.open_table(SKILLS_TABLE)?;
        write_txn.open_table(TAGS_TABLE)?;
        write_txn.open_table(COMBINATIONS_TABLE)?;
        write_txn.commit()?;

        Ok(Store { db })
    }

    pub fn sync_from_fs(&self, registry_path: &Path) -> Result<(), AppError> {
        if !registry_path.exists() {
            fs::create_dir_all(registry_path)?;
            return Ok(());
        }

        // Scan filesystem for current skills
        let mut fs_skills: HashSet<String> = HashSet::new();
        for entry in fs::read_dir(registry_path)? {
            let entry = entry?;
            if !entry.file_type()?.is_dir() {
                continue;
            }

            let skill_file = entry.path().join("SKILL.md");
            if !skill_file.exists() {
                continue;
            }

            let content = fs::read_to_string(&skill_file)?;
            let frontmatter = match parse_skill_frontmatter(&content) {
                Ok(f) => f,
                Err(e) => {
                    tracing::warn!(
                        "Skipping {}: parse error: {}",
                        entry.path().display(),
                        e
                    );
                    continue;
                }
            };

            let dir_name = entry
                .file_name()
                .to_string_lossy()
                .to_string();

            let name = frontmatter.name.clone();
            let skill = Skill {
                name: frontmatter.name,
                description: frontmatter.description,
                version: frontmatter.version,
                user_invocable: frontmatter.user_invocable,
                tags: self.get_tags_for_skill(&name).unwrap_or_default(),
                path: dir_name,
            };

            self.put_skill(&skill)?;
            fs_skills.insert(skill.name.clone());
        }

        // Remove skills from db that no longer exist on filesystem
        let db_skills = self.list_skills()?;
        for skill in db_skills {
            if !fs_skills.contains(&skill.name) {
                self.delete_skill(&skill.name)?;
            }
        }

        Ok(())
    }

    pub fn list_skills(&self) -> Result<Vec<Skill>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(SKILLS_TABLE)?;

        let mut skills = Vec::new();
        for result in table.iter()? {
            let (_, value) = result?;
            let skill: Skill = serde_json::from_str(value.value())
                .map_err(|e| AppError::Internal(format!("Deserialize error: {}", e)))?;
            skills.push(skill);
        }

        Ok(skills)
    }

    pub fn get_skill(&self, name: &str) -> Result<Option<Skill>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(SKILLS_TABLE)?;

        match table.get(name)? {
            Some(value) => {
                let skill: Skill = serde_json::from_str(value.value())
                    .map_err(|e| AppError::Internal(format!("Deserialize error: {}", e)))?;
                Ok(Some(skill))
            }
            None => Ok(None),
        }
    }

    pub fn put_skill(&self, skill: &Skill) -> Result<(), AppError> {
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(SKILLS_TABLE)?;
            let json = serde_json::to_string(skill)
                .map_err(|e| AppError::Internal(format!("Serialize error: {}", e)))?;
            table.insert(skill.name.as_str(), json.as_str())?;
        }
        txn.commit()?;
        Ok(())
    }

    pub fn delete_skill(&self, name: &str) -> Result<(), AppError> {
        // Remove from all combinations
        if let Err(e) = self.cleanup_combination_refs(name) {
            tracing::warn!("Failed to cleanup combination refs for '{}': {}", name, e);
        }

        // Remove from all tags first
        if let Ok(tags) = self.get_all_tags() {
            for tag in tags {
                self.remove_skill_from_tag(name, &tag)?;
            }
        }

        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(SKILLS_TABLE)?;
            table.remove(name)?;
        }
        txn.commit()?;
        Ok(())
    }

    pub fn add_tag(&self, skill_name: &str, tag: &str) -> Result<(), AppError> {
        let mut skill = self
            .get_skill(skill_name)?
            .ok_or_else(|| AppError::NotFound(skill_name.to_string()))?;

        if !skill.tags.contains(&tag.to_string()) {
            skill.tags.push(tag.to_string());
            self.put_skill(&skill)?;
        }

        self.add_skill_to_tag(skill_name, tag)?;
        Ok(())
    }

    pub fn remove_tag(&self, skill_name: &str, tag: &str) -> Result<(), AppError> {
        let mut skill = self
            .get_skill(skill_name)?
            .ok_or_else(|| AppError::NotFound(skill_name.to_string()))?;

        skill.tags.retain(|t| t != tag);
        self.put_skill(&skill)?;

        self.remove_skill_from_tag(skill_name, tag)?;
        Ok(())
    }

    pub fn get_all_tags(&self) -> Result<Vec<String>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(TAGS_TABLE)?;

        let mut tags = Vec::new();
        for result in table.iter()? {
            let (key, _) = result?;
            let key_str = key.value();
            // Skip internal keys used for tag->skills mapping
            if key_str.starts_with("__") {
                continue;
            }
            tags.push(key_str.to_string());
        }
        Ok(tags)
    }

    pub fn search_skills(&self, query: &str, tag: Option<&str>) -> Result<Vec<Skill>, AppError> {
        let skills = self.list_skills()?;
        let query_lower = query.to_lowercase();

        let mut results: Vec<Skill> = skills
            .into_iter()
            .filter(|s| {
                let matches_query = query.is_empty()
                    || s.name.to_lowercase().contains(&query_lower)
                    || s.description.to_lowercase().contains(&query_lower);

                let matches_tag = match tag {
                    Some(t) => s.tags.iter().any(|st| st == t),
                    None => true,
                };

                matches_query && matches_tag
            })
            .collect();

        results.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(results)
    }

    fn get_tags_for_skill(&self, skill_name: &str) -> Result<Vec<String>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(TAGS_TABLE)?;

        let mut tags = Vec::new();
        for result in table.iter()? {
            let (tag_key, _) = result?;
            let tag_name = tag_key.value();

            // Check if this tag contains the skill
            let tag_skills_key = format!("__tag_skills__{}", tag_name);
            if let Ok(Some(skills_json)) = table.get(tag_skills_key.as_str()) {
                let skill_names: Vec<String> =
                    serde_json::from_str(skills_json.value()).unwrap_or_default();
                if skill_names.contains(&skill_name.to_string()) {
                    tags.push(tag_name.to_string());
                }
            }
        }

        Ok(tags)
    }

    fn add_skill_to_tag(&self, skill_name: &str, tag: &str) -> Result<(), AppError> {
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(TAGS_TABLE)?;

            // Store tag name for listing
            table.insert(tag, tag)?;

            // Store skill list for this tag
            let key = format!("__tag_skills__{}", tag);
            let existing: Vec<String> = match table.get(key.as_str())? {
                Some(v) => serde_json::from_str(v.value()).unwrap_or_default(),
                None => Vec::new(),
            };

            let mut skills = existing;
            if !skills.contains(&skill_name.to_string()) {
                skills.push(skill_name.to_string());
            }
            let json = serde_json::to_string(&skills)
                .map_err(|e| AppError::Internal(format!("Serialize error: {}", e)))?;
            table.insert(key.as_str(), json.as_str())?;
        }
        txn.commit()?;
        Ok(())
    }

    fn remove_skill_from_tag(&self, skill_name: &str, tag: &str) -> Result<(), AppError> {
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(TAGS_TABLE)?;

            let key = format!("__tag_skills__{}", tag);
            let existing: Vec<String> = match table.get(key.as_str())? {
                Some(v) => serde_json::from_str(v.value()).unwrap_or_default(),
                None => Vec::new(),
            };

            let skills: Vec<String> = existing
                .into_iter()
                .filter(|s| s != skill_name)
                .collect();

            if skills.is_empty() {
                table.remove(tag)?;
                table.remove(key.as_str())?;
            } else {
                let json = serde_json::to_string(&skills)
                    .map_err(|e| AppError::Internal(format!("Serialize error: {}", e)))?;
                table.insert(key.as_str(), json.as_str())?;
            }
        }
        txn.commit()?;
        Ok(())
    }

    pub fn get_skills_with_tag(&self, tag: &str) -> Result<Vec<String>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(TAGS_TABLE)?;
        let key = format!("__tag_skills__{}", tag);
        match table.get(key.as_str())? {
            Some(v) => Ok(serde_json::from_str(v.value()).unwrap_or_default()),
            None => Ok(Vec::new()),
        }
    }

    pub fn rename_tag(&self, old_name: &str, new_name: &str) -> Result<(), AppError> {
        // Get all skills that have the old_name tag
        let skills_with_tag: Vec<String> = {
            let txn = self.db.begin_read()?;
            let table = txn.open_table(TAGS_TABLE)?;
            let key = format!("__tag_skills__{}", old_name);
            match table.get(key.as_str())? {
                Some(v) => serde_json::from_str(v.value()).unwrap_or_default(),
                None => Vec::new(),
            }
        };

        // Update each skill: replace old_name with new_name in tags array
        for skill_name in &skills_with_tag {
            let mut skill = match self.get_skill(skill_name)? {
                Some(s) => s,
                None => continue,
            };
            if let Some(pos) = skill.tags.iter().position(|t| t == old_name) {
                skill.tags[pos] = new_name.to_string();
                self.put_skill(&skill)?;
            }
        }

        // Update TAGS_TABLE: delete old key, insert new key with same value
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(TAGS_TABLE)?;

            // Get the value for the old tag (if any)
            let tag_value: Option<String> = match table.get(old_name)? {
                Some(v) => Some(v.value().to_string()),
                None => None,
            };

            // Remove old tag entry
            table.remove(old_name)?;

            // Insert new tag entry with same value
            if let Some(val) = tag_value {
                table.insert(new_name, val.as_str())?;
            }

            // Update reverse index: delete old key, insert new key with same skill list
            let reverse_key_old = format!("__tag_skills__{}", old_name);
            let reverse_key_new = format!("__tag_skills__{}", new_name);

            let skills_json: String = match table.get(reverse_key_old.as_str())? {
                Some(v) => v.value().to_string(),
                None => String::from("[]"),
            };

            table.remove(reverse_key_old.as_str())?;
            table.insert(reverse_key_new.as_str(), skills_json.as_str())?;
        }
        txn.commit()?;
        Ok(())
    }

    pub fn delete_tag(&self, tag_name: &str) -> Result<(), AppError> {
        // Get all skills that have this tag
        let skills_with_tag: Vec<String> = {
            let txn = self.db.begin_read()?;
            let table = txn.open_table(TAGS_TABLE)?;
            let key = format!("__tag_skills__{}", tag_name);
            match table.get(key.as_str())? {
                Some(v) => serde_json::from_str(v.value()).unwrap_or_default(),
                None => Vec::new(),
            }
        };

        // Remove tag from each skill's tags array
        for skill_name in &skills_with_tag {
            let mut skill = match self.get_skill(skill_name)? {
                Some(s) => s,
                None => continue,
            };
            skill.tags.retain(|t| t != tag_name);
            self.put_skill(&skill)?;
        }

        // Delete from TAGS_TABLE and reverse index
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(TAGS_TABLE)?;
            table.remove(tag_name)?;
            table.remove(format!("__tag_skills__{}", tag_name).as_str())?;
        }
        txn.commit()?;
        Ok(())
    }

    // --- Combination methods ---

    pub fn list_combinations(&self) -> Result<Vec<Combination>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(COMBINATIONS_TABLE)?;

        let mut combos = Vec::new();
        for result in table.iter()? {
            let (_, value) = result?;
            let combo: Combination = serde_json::from_str(value.value())
                .map_err(|e| AppError::Internal(format!("Deserialize combination error: {}", e)))?;
            combos.push(combo);
        }

        combos.sort_by(|a, b| a.name.cmp(&b.name));
        Ok(combos)
    }

    pub fn get_combination(&self, name: &str) -> Result<Option<Combination>, AppError> {
        let txn = self.db.begin_read()?;
        let table = txn.open_table(COMBINATIONS_TABLE)?;

        match table.get(name)? {
            Some(value) => {
                let combo: Combination = serde_json::from_str(value.value())
                    .map_err(|e| AppError::Internal(format!("Deserialize combination error: {}", e)))?;
                Ok(Some(combo))
            }
            None => Ok(None),
        }
    }

    pub fn put_combination(&self, combo: &Combination) -> Result<(), AppError> {
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(COMBINATIONS_TABLE)?;
            let json = serde_json::to_string(combo)
                .map_err(|e| AppError::Internal(format!("Serialize combination error: {}", e)))?;
            table.insert(combo.name.as_str(), json.as_str())?;
        }
        txn.commit()?;
        Ok(())
    }

    pub fn delete_combination(&self, name: &str) -> Result<(), AppError> {
        let txn = self.db.begin_write()?;
        {
            let mut table = txn.open_table(COMBINATIONS_TABLE)?;
            table.remove(name)?;
        }
        txn.commit()?;
        Ok(())
    }

    pub fn cleanup_combination_refs(&self, skill_name: &str) -> Result<(), AppError> {
        let combos = self.list_combinations()?;
        for mut combo in combos {
            let original_len = combo.skills.len();
            combo.skills.retain(|s| s != skill_name);
            if combo.skills.len() != original_len {
                self.put_combination(&combo)?;
            }
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn test_store() -> (Store, TempDir) {
        let dir = TempDir::new().unwrap();
        let db_path = dir.path().join("test.db");
        let store = Store::open(&db_path).unwrap();
        (store, dir)
    }

    fn sample_skill(name: &str) -> Skill {
        Skill {
            name: name.to_string(),
            description: format!("Description for {}", name),
            version: Some("1.0.0".into()),
            user_invocable: Some(true),
            tags: vec![],
            path: name.to_string(),
        }
    }

    #[test]
    fn test_put_and_get() {
        let (store, _dir) = test_store();
        let skill = sample_skill("test-skill");
        store.put_skill(&skill).unwrap();

        let got = store.get_skill("test-skill").unwrap().unwrap();
        assert_eq!(got.name, "test-skill");
        assert_eq!(got.description, "Description for test-skill");
    }

    #[test]
    fn test_get_nonexistent() {
        let (store, _dir) = test_store();
        assert!(store.get_skill("nope").unwrap().is_none());
    }

    #[test]
    fn test_list_skills() {
        let (store, _dir) = test_store();
        store.put_skill(&sample_skill("a")).unwrap();
        store.put_skill(&sample_skill("b")).unwrap();

        let skills = store.list_skills().unwrap();
        assert_eq!(skills.len(), 2);
    }

    #[test]
    fn test_delete_skill() {
        let (store, _dir) = test_store();
        store.put_skill(&sample_skill("to-delete")).unwrap();
        store.delete_skill("to-delete").unwrap();
        assert!(store.get_skill("to-delete").unwrap().is_none());
    }

    #[test]
    fn test_add_and_remove_tag() {
        let (store, _dir) = test_store();
        store.put_skill(&sample_skill("tagged")).unwrap();

        store.add_tag("tagged", "rust").unwrap();
        store.add_tag("tagged", "cli").unwrap();

        let skill = store.get_skill("tagged").unwrap().unwrap();
        assert!(skill.tags.contains(&"rust".to_string()));
        assert!(skill.tags.contains(&"cli".to_string()));

        let tags = store.get_all_tags().unwrap();
        assert!(tags.contains(&"rust".to_string()));

        store.remove_tag("tagged", "rust").unwrap();
        let skill = store.get_skill("tagged").unwrap().unwrap();
        assert!(!skill.tags.contains(&"rust".to_string()));
    }

    #[test]
    fn test_search_skills() {
        let (store, _dir) = test_store();
        store.put_skill(&sample_skill("rust-web")).unwrap();
        store.put_skill(&sample_skill("python-cli")).unwrap();
        store.put_skill(&Skill {
            name: "rust-tui".into(),
            description: "A terminal UI tool".into(),
            version: None,
            user_invocable: None,
            tags: vec!["rust".into()],
            path: "rust-tui".into(),
        }).unwrap();

        let results = store.search_skills("rust", None).unwrap();
        assert_eq!(results.len(), 2);

        let results = store.search_skills("", Some("rust")).unwrap();
        assert_eq!(results.len(), 1);
        assert_eq!(results[0].name, "rust-tui");
    }

    #[test]
    fn test_sync_from_fs() {
        let (store, dir) = test_store();
        let registry = dir.path().join("registry");
        fs::create_dir_all(registry.join("my-skill")).unwrap();

        let skill_content = indoc::indoc! {r#"
            ---
            name: my-skill
            description: "From filesystem"
            version: "0.1.0"
            ---
            Content here
        "#};
        fs::write(registry.join("my-skill").join("SKILL.md"), skill_content).unwrap();

        store.sync_from_fs(&registry).unwrap();

        let skill = store.get_skill("my-skill").unwrap().unwrap();
        assert_eq!(skill.name, "my-skill");
        assert_eq!(skill.description, "From filesystem");
    }
}
