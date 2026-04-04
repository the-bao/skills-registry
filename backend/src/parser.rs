use crate::models::SkillFrontmatter;

/// Parse SKILL.md frontmatter (YAML between --- delimiters)
pub fn parse_skill_frontmatter(content: &str) -> Result<SkillFrontmatter, String> {
    let trimmed = content.trim_start();
    if !trimmed.starts_with("---") {
        return Err("SKILL.md must start with --- frontmatter delimiter".into());
    }

    let rest = &trimmed[3..];
    let end = rest
        .find("\n---")
        .ok_or("Missing closing --- in frontmatter")?;

    let yaml_str = &rest[..end];

    // Minimal YAML parsing for our known fields
    let mut name = None;
    let mut description = None;
    let mut version = None;
    let mut user_invocable = None;

    for line in yaml_str.lines() {
        let line = line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }

        if let Some((key, value)) = line.split_once(':') {
            let key = key.trim();
            let value = value.trim();

            match key {
                "name" => {
                    name = Some(unquote(value));
                }
                "description" => {
                    description = Some(unquote(value));
                }
                "version" => {
                    version = Some(unquote(value));
                }
                "user_invocable" => {
                    user_invocable = value.parse::<bool>().ok();
                }
                _ => {}
            }
        }
    }

    Ok(SkillFrontmatter {
        name: name.ok_or("Missing required field: name")?,
        description: description.ok_or("Missing required field: description")?,
        version,
        user_invocable,
    })
}

fn unquote(s: &str) -> String {
    if (s.starts_with('"') && s.ends_with('"'))
        || (s.starts_with('\'') && s.ends_with('\''))
    {
        s[1..s.len() - 1].to_string()
    } else {
        s.to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_basic_frontmatter() {
        let content = indoc::indoc! {r#"
            ---
            name: test-skill
            description: "A test skill"
            version: "1.0.0"
            user_invocable: true
            ---
            # Skill content here
        "#};

        let result = parse_skill_frontmatter(content).unwrap();
        assert_eq!(result.name, "test-skill");
        assert_eq!(result.description, "A test skill");
        assert_eq!(result.version, Some("1.0.0".into()));
        assert_eq!(result.user_invocable, Some(true));
    }

    #[test]
    fn test_parse_minimal_frontmatter() {
        let content = indoc::indoc! {r#"
            ---
            name: minimal
            description: Just the basics
            ---
            Content
        "#};

        let result = parse_skill_frontmatter(content).unwrap();
        assert_eq!(result.name, "minimal");
        assert_eq!(result.description, "Just the basics");
        assert_eq!(result.version, None);
        assert_eq!(result.user_invocable, None);
    }

    #[test]
    fn test_parse_no_frontmatter() {
        let content = "No frontmatter here";
        assert!(parse_skill_frontmatter(content).is_err());
    }

    #[test]
    fn test_parse_missing_name() {
        let content = indoc::indoc! {r#"
            ---
            description: "No name field"
            ---
        "#};
        assert!(parse_skill_frontmatter(content).is_err());
    }

    #[test]
    fn test_parse_missing_closing_delimiter() {
        let content = "---\nname: test\ndescription: test";
        assert!(parse_skill_frontmatter(content).is_err());
    }
}
