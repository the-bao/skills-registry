# Skill Combinations Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "combinations" feature — named, installable groups of skills with one-click batch install.

**Architecture:** New `combinations` table in redb (key=combination name, value=JSON). New backend handler module `handlers/combinations.rs`. Frontend gets a Tab switcher (Skills / Combinations) with a dedicated Combinations page containing a card grid, detail modal, and create modal.

**Tech Stack:** Rust/Axum (backend), redb (storage), React/TypeScript/TanStack Query (frontend), Tailwind CSS v4 + Framer Motion (UI).

---

### Task 1: Add Combination data model

**Files:**
- Modify: `backend/src/models.rs`

**Step 1: Add Combination struct**

Add after the existing `SkillFrontmatter` struct in `backend/src/models.rs`:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Combination {
    pub name: String,
    pub description: String,
    pub skills: Vec<String>,
}
```

**Step 2: Verify compilation**

Run: `cd backend && cargo check`
Expected: compiles with no errors

**Step 3: Commit**

```bash
git add backend/src/models.rs
git commit -m "feat: add Combination data model"
```

---

### Task 2: Add combination storage methods

**Files:**
- Modify: `backend/src/store.rs`

**Step 1: Add COMBINATIONS_TABLE constant**

In `store.rs`, add alongside the existing table definitions (after line 12):

```rust
const COMBINATIONS_TABLE: TableDefinition<&str, &str> = TableDefinition::new("combinations");
```

**Step 2: Open the table in Store::open**

In the `Store::open` method (around line 29), add after `write_txn.open_table(TAGS_TABLE)?;`:

```rust
write_txn.open_table(COMBINATIONS_TABLE)?;
```

**Step 3: Add CRUD methods for combinations**

Add these methods to the `impl Store` block, before the `#[cfg(test)]` section:

```rust
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
```

Also add the import at the top of store.rs (after line 8):

```rust
use crate::models::Combination;
```

**Step 4: Call cleanup on skill delete**

In `Store::delete_skill` method (around line 137), add at the beginning of the method, before the existing tag cleanup:

```rust
// Remove from all combinations
if let Err(e) = self.cleanup_combination_refs(name) {
    tracing::warn!("Failed to cleanup combination refs for '{}': {}", name, e);
}
```

**Step 5: Verify compilation**

Run: `cd backend && cargo check`
Expected: compiles with no errors

**Step 6: Commit**

```bash
git add backend/src/store.rs
git commit -m "feat: add combination storage methods with skill deletion cleanup"
```

---

### Task 3: Add combination API handlers

**Files:**
- Create: `backend/src/handlers/combinations.rs`
- Modify: `backend/src/handlers/mod.rs`
- Modify: `backend/src/main.rs`

**Step 1: Create handlers/combinations.rs**

Create `backend/src/handlers/combinations.rs` with:

```rust
use axum::extract::{Path, State};
use axum::Json;
use serde::Deserialize;

use crate::error::AppError;
use crate::handlers::skills::AppState;
use crate::models::Combination;

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
    };

    state.store.put_combination(&combo)?;
    Ok(Json(combo))
}

#[derive(Debug, Deserialize)]
pub struct UpdateCombinationRequest {
    pub name: Option<String>,
    pub description: Option<String>,
    pub skills: Option<Vec<String>>,
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
        if new_name != name {
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

pub async fn install_combination(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<Json<InstallCombinationResponse>, AppError> {
    let combo = state
        .store
        .get_combination(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Combination '{}' not found", name)))?;

    let mut installed = Vec::new();
    let mut failed = Vec::new();

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

        let dest = state.skills_install_path.join(skill_name);
        match copy_dir_recursive(&src, &dest) {
            Ok(_) => installed.push(skill_name.clone()),
            Err(_) => failed.push(skill_name.clone()),
        }
    }

    Ok(Json(InstallCombinationResponse { installed, failed }))
}

fn copy_dir_recursive(src: &std::path::PathBuf, dst: &std::path::PathBuf) -> Result<(), AppError> {
    std::fs::create_dir_all(dst)?;
    for entry in std::fs::read_dir(src)? {
        let entry = entry?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path)?;
        }
    }
    Ok(())
}
```

Also add `use serde::Serialize;` to the imports.

**Step 2: Register the module**

Modify `backend/src/handlers/mod.rs` to add:

```rust
pub mod combinations;
```

**Step 3: Add routes in main.rs**

In `backend/src/main.rs`, add combination routes to the `api_routes` (after the Tags routes, before Install/Import):

```rust
// Combinations
.route("/combinations", get(handlers::combinations::list_combinations).post(handlers::combinations::create_combination))
.route("/combinations/{name}", get(handlers::combinations::get_combination).delete(handlers::combinations::delete_combination).put(handlers::combinations::update_combination))
.route("/combinations/{name}/install", post(handlers::combinations::install_combination))
```

**Step 4: Verify compilation**

Run: `cd backend && cargo check`
Expected: compiles with no errors

**Step 5: Commit**

```bash
git add backend/src/handlers/combinations.rs backend/src/handlers/mod.rs backend/src/main.rs
git commit -m "feat: add combination API endpoints (CRUD + batch install)"
```

---

### Task 4: Add frontend API types and client

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/client.ts`

**Step 1: Add Combination types to types.ts**

Append to `frontend/src/api/types.ts`:

```typescript
export interface Combination {
  name: string;
  description: string;
  skills: string[];
}

export interface CombinationListResponse {
  combinations: Combination[];
  total: number;
}

export interface CreateCombinationRequest {
  name: string;
  description: string;
  skills: string[];
}

export interface UpdateCombinationRequest {
  name?: string;
  description?: string;
  skills?: string[];
}

export interface InstallCombinationResponse {
  installed: string[];
  failed: string[];
}
```

**Step 2: Add API methods to client.ts**

Add the new types to the import in `client.ts`, then append to the `api` object:

```typescript
// Combinations
listCombinations: () => request<CombinationListResponse>("/combinations"),

getCombination: (name: string) =>
  request<Combination>(`/combinations/${encodeURIComponent(name)}`),

createCombination: (body: CreateCombinationRequest) =>
  request<Combination>("/combinations", { method: "POST", body: JSON.stringify(body) }),

updateCombination: (name: string, body: UpdateCombinationRequest) =>
  request<Combination>(`/combinations/${encodeURIComponent(name)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  }),

deleteCombination: (name: string) =>
  request<{ deleted: string }>(`/combinations/${encodeURIComponent(name)}`, { method: "DELETE" }),

installCombination: (name: string) =>
  request<InstallCombinationResponse>(`/combinations/${encodeURIComponent(name)}/install`, {
    method: "POST",
  }),
```

**Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

**Step 4: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/client.ts
git commit -m "feat: add combination API types and client methods"
```

---

### Task 5: Add CombinationCard component

**Files:**
- Create: `frontend/src/components/CombinationCard.tsx`

**Step 1: Create CombinationCard.tsx**

```tsx
import { motion } from "framer-motion";
import type { Combination } from "../api/types";

interface CombinationCardProps {
  combination: Combination;
  onClick: () => void;
}

export function CombinationCard({ combination, onClick }: CombinationCardProps) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, boxShadow: "var(--shadow-card-hover)" }}
      onClick={onClick}
      className="text-left p-5 rounded-[var(--radius-card)] bg-white border border-glass-border cursor-pointer transition-shadow"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-text-primary leading-tight">
          {combination.name}
        </h3>
        <span className="shrink-0 text-[11px] text-text-tertiary bg-tag-bg px-1.5 py-0.5 rounded">
          {combination.skills.length} skills
        </span>
      </div>
      <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-3">
        {combination.description}
      </p>
      <div className="flex flex-wrap gap-1">
        {combination.skills.slice(0, 4).map((skill) => (
          <span
            key={skill}
            className="text-[11px] px-2 py-0.5 rounded-[var(--radius-tag)] bg-accent/10 text-accent"
          >
            {skill}
          </span>
        ))}
        {combination.skills.length > 4 && (
          <span className="text-[11px] px-2 py-0.5 rounded-[var(--radius-tag)] bg-tag-bg text-tag-text">
            +{combination.skills.length - 4}
          </span>
        )}
      </div>
    </motion.button>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/CombinationCard.tsx
git commit -m "feat: add CombinationCard component"
```

---

### Task 6: Add CombinationDetail modal

**Files:**
- Create: `frontend/src/components/CombinationDetail.tsx`

**Step 1: Create CombinationDetail.tsx**

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Combination, Skill } from "../api/types";

interface CombinationDetailProps {
  combination: Combination;
  allSkills: Skill[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string) => void;
  onUpdate: (name: string, data: { description?: string; skills?: string[] }) => void;
}

export function CombinationDetail({
  combination,
  allSkills,
  onClose,
  onDelete,
  onInstall,
  onUpdate,
}: CombinationDetailProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSkills, setEditSkills] = useState(combination.skills);
  const [editDescription, setEditDescription] = useState(combination.description);
  const [addInput, setAddInput] = useState("");

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(combination.name);
  };

  const handleSave = () => {
    onUpdate(combination.name, {
      description: editDescription,
      skills: editSkills,
    });
    setEditing(false);
  };

  const handleAddSkill = () => {
    const skillName = addInput.trim();
    if (skillName && !editSkills.includes(skillName)) {
      setEditSkills([...editSkills, skillName]);
      setAddInput("");
    }
  };

  const handleRemoveSkill = (skillName: string) => {
    setEditSkills(editSkills.filter((s) => s !== skillName));
  };

  const missingSkills = combination.skills.filter(
    (s) => !allSkills.some((as_) => as_.name === s)
  );

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
          className="w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4 max-h-[85vh] flex flex-col"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-text-primary">{combination.name}</h2>
              <p className="text-xs text-text-tertiary mt-0.5">
                {combination.skills.length} skills
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditing(!editing)}
                className="text-xs px-3 py-1.5 rounded-lg border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
              >
                {editing ? "Cancel" : "Edit"}
              </button>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer text-text-tertiary"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {editing ? (
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="mb-4">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Description
                </p>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-lg border border-glass-border bg-white/50 outline-none focus:border-accent/40 resize-none"
                  rows={2}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Skills
                </p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editSkills.map((skill) => (
                    <span
                      key={skill}
                      className="group inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-accent/10 text-accent"
                    >
                      {skill}
                      <button
                        onClick={() => handleRemoveSkill(skill)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer hover:text-danger"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={addInput}
                    onChange={(e) => setAddInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSkill()}
                    placeholder="Add skill name..."
                    className="flex-1 text-xs px-2.5 py-1.5 rounded-lg border border-glass-border bg-white/50 outline-none focus:border-accent/40"
                    list="skill-names"
                  />
                  <datalist id="skill-names">
                    {allSkills
                      .filter((s) => !editSkills.includes(s.name))
                      .map((s) => (
                        <option key={s.name} value={s.name} />
                      ))}
                  </datalist>
                  <button
                    onClick={handleAddSkill}
                    className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto mb-4">
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {combination.description}
              </p>
              <div className="mb-4">
                <p className="text-xs font-medium text-text-tertiary uppercase tracking-wider mb-2">
                  Included Skills
                </p>
                <div className="flex flex-col gap-1">
                  {combination.skills.map((skillName) => {
                    const exists = allSkills.some((s) => s.name === skillName);
                    return (
                      <div
                        key={skillName}
                        className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg bg-surface"
                      >
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${exists ? "bg-green-400" : "bg-gray-300"}`}
                        />
                        <span className={exists ? "text-text-primary" : "text-text-tertiary line-through"}>
                          {skillName}
                        </span>
                        {!exists && (
                          <span className="text-[10px] text-text-tertiary ml-auto">missing</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {missingSkills.length > 0 && (
                <p className="text-xs text-danger">
                  {missingSkills.length} skill(s) no longer exist and will be skipped during install
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-3 border-t border-glass-border">
            {editing ? (
              <button
                onClick={handleSave}
                className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
              >
                Save Changes
              </button>
            ) : (
              <>
                <button
                  onClick={() => onInstall(combination.name)}
                  className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
                >
                  Install All ({combination.skills.length})
                </button>
                <button
                  onClick={handleDelete}
                  className={`text-sm px-4 py-2 rounded-xl border transition-colors cursor-pointer font-medium ${
                    confirmDelete
                      ? "bg-danger text-white border-danger hover:bg-danger-hover"
                      : "border-glass-border text-text-secondary hover:border-danger hover:text-danger"
                  }`}
                >
                  {confirmDelete ? "Confirm Delete" : "Delete"}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/CombinationDetail.tsx
git commit -m "feat: add CombinationDetail modal with edit/install/delete"
```

---

### Task 7: Add CreateCombinationModal

**Files:**
- Create: `frontend/src/components/CreateCombinationModal.tsx`

**Step 1: Create CreateCombinationModal.tsx**

```tsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Skill } from "../api/types";

interface CreateCombinationModalProps {
  allSkills: Skill[];
  onClose: () => void;
  onSubmit: (data: { name: string; description: string; skills: string[] }) => void;
}

export function CreateCombinationModal({ allSkills, onClose, onSubmit }: CreateCombinationModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName && selectedSkills.length > 0) {
      onSubmit({ name: trimmedName, description: description.trim(), skills: selectedSkills });
      onClose();
    }
  };

  const toggleSkill = (skillName: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skillName)
        ? prev.filter((s) => s !== skillName)
        : [...prev, skillName]
    );
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
          className="w-full max-w-lg bg-white/90 backdrop-blur-2xl rounded-2xl border border-glass-border p-6 mx-4 max-h-[85vh] flex flex-col"
          style={{ boxShadow: "var(--shadow-modal)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-text-primary mb-1">Create Combination</h2>
          <p className="text-xs text-text-tertiary mb-4">
            Group multiple skills into an installable combination
          </p>

          <div className="flex-1 overflow-y-auto mb-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. fullstack-dev"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this combination for?"
                className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-glass-border bg-white/50 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all resize-none"
                rows={2}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-text-tertiary uppercase tracking-wider block mb-1.5">
                Skills ({selectedSkills.length} selected)
              </label>
              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                {allSkills.map((skill) => {
                  const isSelected = selectedSkills.includes(skill.name);
                  return (
                    <button
                      key={skill.name}
                      onClick={() => toggleSkill(skill.name)}
                      className={`flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-accent/10 text-accent"
                          : "hover:bg-black/[0.03] text-text-secondary"
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-accent border-accent" : "border-gray-300"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-xs truncate">{skill.name}</p>
                        <p className="text-[11px] text-text-tertiary truncate">{skill.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-3 border-t border-glass-border">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-xl border border-glass-border text-text-secondary hover:bg-black/[0.03] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!name.trim() || selectedSkills.length === 0}
              className="flex-1 text-sm px-4 py-2 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Combination
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/CreateCombinationModal.tsx
git commit -m "feat: add CreateCombinationModal with skill selection"
```

---

### Task 8: Add CombinationsPage component

**Files:**
- Create: `frontend/src/components/CombinationsPage.tsx`

**Step 1: Create CombinationsPage.tsx**

```tsx
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { api } from "../api/client";
import type { Combination, Skill } from "../api/types";
import { CombinationCard } from "./CombinationCard";
import { CombinationDetail } from "./CombinationDetail";
import { CreateCombinationModal } from "./CreateCombinationModal";

interface CombinationsPageProps {
  allSkills: Skill[];
}

export function CombinationsPage({ allSkills }: CombinationsPageProps) {
  const queryClient = useQueryClient();
  const [selectedCombo, setSelectedCombo] = useState<Combination | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: combosData } = useQuery({
    queryKey: ["combinations"],
    queryFn: api.listCombinations,
  });

  const createMutation = useMutation({
    mutationFn: api.createCombination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinations"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ name, data }: { name: string; data: Parameters<typeof api.updateCombination>[1] }) =>
      api.updateCombination(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteCombination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["combinations"] });
      setSelectedCombo(null);
    },
  });

  const installMutation = useMutation({
    mutationFn: api.installCombination,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["skills"] });
    },
  });

  const handleSelectCombo = useCallback(async (combo: Combination) => {
    try {
      const fresh = await api.getCombination(combo.name);
      setSelectedCombo(fresh);
    } catch {
      setSelectedCombo(combo);
    }
  }, []);

  const combinations = combosData?.combinations ?? [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-text-primary">Combinations</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Group skills into installable suites
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="shrink-0 text-sm px-4 py-2.5 rounded-xl bg-accent text-white hover:bg-accent-hover transition-colors cursor-pointer font-medium"
        >
          + New Combination
        </button>
      </div>

      {/* Grid */}
      {combinations.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-text-tertiary text-sm">
          No combinations yet. Create one to group skills.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {combinations.map((combo) => (
              <CombinationCard
                key={combo.name}
                combination={combo}
                onClick={() => handleSelectCombo(combo)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {selectedCombo && (
          <CombinationDetail
            key={selectedCombo.name}
            combination={selectedCombo}
            allSkills={allSkills}
            onClose={() => setSelectedCombo(null)}
            onDelete={(name) => deleteMutation.mutate(name)}
            onInstall={(name) => installMutation.mutate(name)}
            onUpdate={(name, data) => updateMutation.mutate({ name, data })}
          />
        )}
      </AnimatePresence>

      {showCreateModal && (
        <CreateCombinationModal
          allSkills={allSkills}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createMutation.mutate(data)}
        />
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/components/CombinationsPage.tsx
git commit -m "feat: add CombinationsPage with grid, detail, and create modals"
```

---

### Task 9: Integrate Tab switcher into App.tsx

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add Tab state and CombinationsPage**

Modify `App.tsx` to add:
1. Import `CombinationsPage`
2. Add `activeTab` state (`"skills"` | `"combinations"`)
3. Add Tab switcher in the header area
4. Conditionally render Skills view or CombinationsPage based on `activeTab`

The key changes to `App.tsx`:

- Add import: `import { CombinationsPage } from "./components/CombinationsPage";`
- Add state: `const [activeTab, setActiveTab] = useState<"skills" | "combinations">("skills");`
- Add a combinations query in the App component for the sidebar count:

```tsx
const { data: combosData } = useQuery({
  queryKey: ["combinations"],
  queryFn: api.listCombinations,
});
```

- Replace the main content area with conditional rendering:

```tsx
<main className="flex-1 p-6">
  {/* Tab Switcher */}
  <div className="max-w-5xl mx-auto mb-4">
    <div className="inline-flex rounded-xl bg-white border border-glass-border p-1 gap-0.5">
      <button
        onClick={() => setActiveTab("skills")}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          activeTab === "skills"
            ? "bg-accent text-white"
            : "text-text-secondary hover:bg-black/[0.03]"
        }`}
      >
        Skills
      </button>
      <button
        onClick={() => setActiveTab("combinations")}
        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
          activeTab === "combinations"
            ? "bg-accent text-white"
            : "text-text-secondary hover:bg-black/[0.03]"
        }`}
      >
        Combinations
      </button>
    </div>
  </div>

  {activeTab === "skills" ? (
    <div className="max-w-5xl mx-auto">
      {/* existing header with SearchBar, Import, Add Skill buttons */}
      {/* existing SkillGrid */}
    </div>
  ) : (
    <CombinationsPage allSkills={skills} />
  )}
</main>
```

- Pass combo count to Sidebar: `comboCount={combosData?.total ?? 0}`

- Update Sidebar to show both skill and combo counts.

**Step 2: Update Sidebar to show combo count**

Add `comboCount` prop to Sidebar and display it:

```tsx
interface SidebarProps {
  tags: string[];
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  skillCount: number;
  comboCount: number;
}
```

Update the display: `{skillCount} skills · {comboCount} combinations`

**Step 3: Verify compilation**

Run: `cd frontend && npx tsc --noEmit`
Expected: no type errors

**Step 4: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat: add Skills/Combinations tab switcher in App"
```

---

### Task 10: End-to-end build and manual test

**Step 1: Build backend**

Run: `cd backend && cargo build`
Expected: compiles successfully

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: builds successfully

**Step 3: Start backend and test API**

Run: `cd backend && cargo run`

Test with curl:

```bash
# Create combination
curl -X POST http://localhost:3000/api/combinations \
  -H "Content-Type: application/json" \
  -d '{"name":"test-combo","description":"Test combination","skills":[]}'

# List combinations
curl http://localhost:3000/api/combinations

# Delete combination
curl -X DELETE http://localhost:3000/api/combinations/test-combo
```

**Step 4: Verify frontend in browser**

Open the app, switch between Skills and Combinations tabs, create a combination, view detail, install.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete skill combinations feature with CRUD, install, and tab UI"
```
