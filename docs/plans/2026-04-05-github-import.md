# GitHub Repo Import Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to import skills from GitHub repositories by entering `owner/repo` format (e.g., `slavingia/skills`), auto-detecting skill directories and importing all into the registry.

**Architecture:** New backend endpoint `POST /api/skills/import-github` clones a GitHub repo to a temp directory via `git clone`, scans for `SKILL.md` files (root-level = single skill, subdirectories = multi-skill collection), copies each into `registry/`, indexes in redb, then cleans up. Frontend adds a "GitHub" button next to the existing "Import" button that opens a modal where user enters a repo URL or `owner/repo` shorthand.

**Tech Stack:** Rust `std::process::Command` for git clone, React modal component, existing API patterns.

---

### Task 1: Backend - Add GitHub Import Handler

**Files:**
- Modify: `backend/src/handlers/install.rs`

**Step 1: Add request/response types and handler**

Add to `backend/src/handlers/install.rs`:

```rust
use std::process::Command;
use serde::Deserialize;

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

/// Parse "owner/repo" or full GitHub URL into "owner/repo"
fn parse_repo(input: &str) -> Result<String, AppError> {
    let input = input.trim().trim_end_matches('/');
    // Handle full URLs: https://github.com/owner/repo or git@github.com:owner/repo
    if input.starts_with("https://github.com/") {
        let part = input.strip_prefix("https://github.com/").unwrap();
        return if part.split('/').count() == 2 {
            Ok(part.to_string())
        } else {
            Err(AppError::BadRequest("Invalid GitHub URL format. Use: https://github.com/owner/repo".into()))
        };
    }
    if input.starts_with("git@github.com:") {
        let part = input.strip_prefix("git@github.com:").unwrap().trim_end_matches(".git");
        return if part.split('/').count() == 2 {
            Ok(part.to_string())
        } else {
            Err(AppError::BadRequest("Invalid GitHub SSH URL format".into()))
        };
    }
    // Handle owner/repo shorthand
    if input.split('/').count() == 2 && !input.contains(' ') {
        Ok(input.to_string())
    } else {
        Err(AppError::BadRequest("Invalid format. Use: owner/repo or https://github.com/owner/repo".into()))
    }
}

/// Import all skills from a GitHub repository
pub async fn import_from_github(
    State(state): State<AppState>,
    Json(body): Json<GithubImportRequest>,
) -> Result<Json<GithubImportResponse>, AppError> {
    let repo = parse_repo(&body.repo)?;
    let clone_url = format!("https://github.com/{}.git", repo);

    // Create temp directory
    let temp_dir = std::env::temp_dir().join(format!("skills-registry-github-{}", repo.replace('/', "-")));
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)?;
    }

    // git clone
    let output = Command::new("git")
        .args(["clone", "--depth", "1", &clone_url, &temp_dir.to_string_lossy()])
        .output()
        .map_err(|e| AppError::Internal(format!("Failed to run git: {}. Is git installed?", e)))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(AppError::BadRequest(format!("git clone failed: {}", stderr.trim())));
    }

    // Scan for skills
    let mut imported = Vec::new();
    let mut failed = Vec::new();
    let mut skipped = Vec::new();

    let skill_dirs = scan_skill_dirs(&temp_dir)?;

    for dir in skill_dirs {
        let skill_file = dir.join("SKILL.md");
        let content = match fs::read_to_string(&skill_file) {
            Ok(c) => c,
            Err(_) => { failed.push(dir.file_name().unwrap_or_default().to_string_lossy().to_string()); continue; }
        };

        let frontmatter = match crate::parser::parse_skill_frontmatter(&content) {
            Ok(f) => f,
            Err(_) => { failed.push(dir.file_name().unwrap_or_default().to_string_lossy().to_string()); continue; }
        };

        let dest = state.registry_path.join(&frontmatter.name);
        if dest.exists() {
            skipped.push(frontmatter.name);
            continue;
        }

        let dir_name = dir.file_name().unwrap_or_default().to_string_lossy().to_string();
        match copy_dir_recursive(&dir, &dest) {
            Ok(_) => {
                let skill = Skill {
                    name: frontmatter.name.clone(),
                    description: frontmatter.description,
                    version: frontmatter.version,
                    user_invocable: frontmatter.user_invocable,
                    tags: vec![],
                    path: dir_name,
                };
                state.store.put_skill(&skill)?;
                imported.push(frontmatter.name);
            }
            Err(_) => {
                failed.push(dir.file_name().unwrap_or_default().to_string_lossy().to_string());
            }
        }
    }

    // Cleanup temp directory
    let _ = fs::remove_dir_all(&temp_dir);

    Ok(Json(GithubImportResponse { imported, failed, skipped }))
}

/// Scan a directory for SKILL.md files.
/// If root has SKILL.md -> single skill, return [root].
/// Otherwise scan immediate subdirectories for SKILL.md.
fn scan_skill_dirs(base: &PathBuf) -> Result<Vec<PathBuf>, AppError> {
    let mut dirs = Vec::new();

    if base.join("SKILL.md").exists() {
        dirs.push(base.clone());
        return Ok(dirs);
    }

    for entry in fs::read_dir(base)? {
        let entry = entry?;
        if !entry.file_type()?.is_dir() {
            continue;
        }
        // Skip hidden dirs like .git
        let name = entry.file_name();
        if name.to_string_lossy().starts_with('.') {
            continue;
        }
        if entry.path().join("SKILL.md").exists() {
            dirs.push(entry.path());
        }
    }

    Ok(dirs)
}
```

**Step 2: Register the route in `main.rs`**

Add to the `api_routes` in `backend/src/main.rs` after the existing import routes:

```rust
.route("/skills/import-github", post(handlers::install::import_from_github))
```

**Step 3: Build and verify compilation**

Run: `cd backend && cargo build`
Expected: Compiles successfully with no errors.

**Step 4: Commit**

```bash
git add backend/src/handlers/install.rs backend/src/main.rs
git commit -m "feat: add GitHub repo import endpoint"
```

---

### Task 2: Frontend - Add TypeScript Types and API Client

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/client.ts`

**Step 1: Add types**

Add to `frontend/src/api/types.ts`:

```typescript
export interface GithubImportRequest {
  repo: string;
}

export interface GithubImportResponse {
  imported: string[];
  failed: string[];
  skipped: string[];
}
```

**Step 2: Add API method**

Add to the `api` object in `frontend/src/api/client.ts`:

```typescript
importGithub: (body: GithubImportRequest) =>
  request<GithubImportResponse>("/skills/import-github", {
    method: "POST",
    body: JSON.stringify(body),
  }),
```

Also add `GithubImportRequest` and `GithubImportResponse` to the import statement.

**Step 3: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/client.ts
git commit -m "feat: add GitHub import types and API client"
```

---

### Task 3: Frontend - Add GithubImportModal Component

**Files:**
- Create: `frontend/src/components/GithubImportModal.tsx`
- Modify: `frontend/src/App.tsx`

**Step 1: Create GithubImportModal**

Create `frontend/src/components/GithubImportModal.tsx`:

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GithubImportResponse } from "../api/types";

interface GithubImportModalProps {
  onClose: () => void;
  onSubmit: (repo: string) => Promise<GithubImportResponse>;
}

export function GithubImportModal({ onClose, onSubmit }: GithubImportModalProps) {
  const [repo, setRepo] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GithubImportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!repo.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await onSubmit(repo.trim());
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-md bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">Import from GitHub</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Enter a GitHub repo in owner/repo format or full URL
          </p>

          {!result ? (
            <>
              <input
                type="text"
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && handleSubmit()}
                placeholder="e.g. slavingia/skills"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all mb-2"
                disabled={loading}
                autoFocus
              />

              {error && (
                <p className="text-xs text-red-500 mb-3">{error}</p>
              )}

              <div className="flex gap-2 justify-end mt-4">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!repo.trim() || loading}
                  className="text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? "Importing..." : "Import"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {result.imported.length > 0 && (
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">Imported ({result.imported.length}):</span>{" "}
                    <span className="text-text-secondary">{result.imported.join(", ")}</span>
                  </div>
                )}
                {result.skipped.length > 0 && (
                  <div className="text-sm">
                    <span className="text-yellow-600 font-medium">Skipped (already exist):</span>{" "}
                    <span className="text-text-secondary">{result.skipped.join(", ")}</span>
                  </div>
                )}
                {result.failed.length > 0 && (
                  <div className="text-sm">
                    <span className="text-red-500 font-medium">Failed:</span>{" "}
                    <span className="text-text-secondary">{result.failed.join(", ")}</span>
                  </div>
                )}
                {result.imported.length === 0 && result.skipped.length === 0 && result.failed.length === 0 && (
                  <p className="text-sm text-text-tertiary">No skills found in this repository.</p>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={onClose}
                  className="text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Wire into App.tsx**

In `frontend/src/App.tsx`:

1. Add import: `import { GithubImportModal } from "./components/GithubImportModal";`
2. Add state: `const [showGithubModal, setShowGithubModal] = useState(false);`
3. Add mutation:
```tsx
const githubImportMutation = useMutation({
  mutationFn: api.importGithub,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["skills"] });
    queryClient.invalidateQueries({ queryKey: ["tags"] });
  },
});
```
4. Add a "GitHub" button next to the existing "Import" button:
```tsx
<button
  onClick={() => setShowGithubModal(true)}
  className="shrink-0 text-sm px-4 py-2.5 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
>
  GitHub
</button>
```
5. Add modal rendering after the existing ImportModal:
```tsx
{showGithubModal && (
  <GithubImportModal
    onClose={() => setShowGithubModal(false)}
    onSubmit={(repo) => githubImportMutation.mutateAsync({ repo })}
  />
)}
```

**Step 3: Build frontend**

Run: `cd frontend && npm run build`
Expected: Builds successfully.

**Step 4: Commit**

```bash
git add frontend/src/components/GithubImportModal.tsx frontend/src/App.tsx
git commit -m "feat: add GitHub import modal with result display"
```

---

### Task 4: End-to-End Manual Test

**Step 1: Start backend**

Run: `cd backend && cargo run`

**Step 2: Open frontend (dev mode)**

Run: `cd frontend && npm run dev`

**Step 3: Test in browser**

1. Open http://localhost:5173
2. Click "GitHub" button
3. Enter `slavingia/skills` (or any repo with SKILL.md files)
4. Click Import
5. Verify: loading state shows, then results appear (imported/skipped/failed)
6. Verify: imported skills show up in the grid
7. Verify: importing same repo again shows skills as "skipped"

**Step 4: Test error cases**

1. Enter an invalid repo like `nonexistent/repo-12345` → should show error message
2. Enter an empty string → Import button disabled

**Step 5: Final commit if any fixes needed**

```bash
git add -u
git commit -m "fix: address issues from manual testing"
```
