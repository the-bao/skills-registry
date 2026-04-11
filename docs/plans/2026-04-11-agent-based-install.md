# Agent-Based Install Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current path-based install flow with agent selection — users pick which AI agent (Claude Code, OpenClaw, Codex) to install to, and the system installs directly to that agent's fixed skill directory.

**Architecture:** Add an `Agent` model with id/display-name/skill-path. Backend resolves agent → path mapping from hardcoded defaults (overridable via env vars). Frontend replaces the text path input with a dropdown of available agents. The single `SKILLS_INSTALL_PATH` env var is replaced by per-agent env vars.

**Tech Stack:** Rust/Axum (backend), React/TypeScript (frontend), redb (storage unchanged)

---

### Task 1: Add Agent model and configuration to backend

**Files:**
- Modify: `backend/src/models.rs` — add `Agent` struct
- Modify: `backend/src/config.rs` — add agent configs, remove single `skills_install_path`

**Step 1: Add Agent struct to models.rs**

Append to `backend/src/models.rs`:

```rust
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
```

Add `use std::path::PathBuf;` at top if not present.

**Step 2: Update Config to support multiple agents**

In `backend/src/config.rs`, replace the single `skills_install_path` field with a list of agents:

```rust
pub struct Config {
    pub registry_path: PathBuf,
    pub db_path: PathBuf,
    pub agents: Vec<crate::models::Agent>,
    pub port: u16,
    pub anthropic_api_key: String,
    pub anthropic_base_url: String,
    pub anthropic_model: String,
}
```

In `from_env()`, build agents from defaults + env var overrides:

```rust
fn default_agents(home: &PathBuf) -> Vec<crate::models::Agent> {
    vec![
        crate::models::Agent {
            id: "claude-code".into(),
            name: "Claude Code".into(),
            skills_path: home.join(".claude").join("skills"),
        },
        crate::models::Agent {
            id: "openclaw".into(),
            name: "OpenClaw".into(),
            skills_path: home.join(".claude").join("skills"),
        },
        crate::models::Agent {
            id: "codex".into(),
            name: "Codex".into(),
            skills_path: home.join(".codex").join("skills"),
        },
    ]
}
```

Then in `from_env()`, after computing `home`, call `default_agents(&home)` and for each agent check for an env var `AGENT_{ID}_PATH` (uppercased, hyphens → underscores). If set, override that agent's `skills_path`.

Also support the legacy `SKILLS_INSTALL_PATH` env var: if set, use it to override the `claude-code` agent's path (backwards compat).

**Step 3: Verify compilation**

Run: `cd backend && cargo check`
Expected: compiles with errors only in `main.rs` and handlers (addressed next)

**Step 4: Commit**

```bash
git add backend/src/models.rs backend/src/config.rs
git commit -m "feat: add Agent model and multi-agent config"
```

---

### Task 2: Update AppState and main.rs for agents

**Files:**
- Modify: `backend/src/handlers/skills.rs` — update `AppState`
- Modify: `backend/src/main.rs` — wire agents into state

**Step 1: Update AppState**

In `backend/src/handlers/skills.rs`, replace `skills_install_path: PathBuf` with:

```rust
use crate::models::Agent;

pub struct AppState {
    pub store: Arc<Store>,
    pub registry_path: PathBuf,
    pub agents: Vec<Agent>,
    pub http_client: reqwest::Client,
    pub anthropic_api_key: String,
    pub anthropic_base_url: String,
    pub anthropic_model: String,
}
```

Add a helper method to AppState:

```rust
impl AppState {
    pub fn get_agent(&self, agent_id: &str) -> Option<&Agent> {
        self.agents.iter().find(|a| a.id == agent_id)
    }
}
```

**Step 2: Update main.rs**

In `backend/src/main.rs`, change state construction:

```rust
let state = AppState {
    store: Arc::new(store),
    registry_path: config.registry_path.clone(),
    agents: config.agents.clone(),
    http_client: reqwest::Client::new(),
    anthropic_api_key: config.anthropic_api_key.clone(),
    anthropic_base_url: config.anthropic_base_url.clone(),
    anthropic_model: config.anthropic_model.clone(),
};
```

**Step 3: Verify compilation**

Run: `cd backend && cargo check`
Expected: errors only in `install.rs` and `combinations.rs` (addressed next)

**Step 4: Commit**

```bash
git add backend/src/handlers/skills.rs backend/src/main.rs
git commit -m "refactor: AppState uses agents list instead of single install path"
```

---

### Task 3: Add GET /api/agents endpoint

**Files:**
- Modify: `backend/src/handlers/install.rs` — add handler
- Modify: `backend/src/main.rs` — add route

**Step 1: Add list_agents handler**

In `backend/src/handlers/install.rs`, add:

```rust
pub async fn list_agents(
    State(state): State<AppState>,
) -> Result<Json<Vec<crate::models::Agent>>, AppError> {
    Ok(Json(state.agents.clone()))
}
```

**Step 2: Add route in main.rs**

In the api_routes router, add:

```rust
.route("/agents", get(handlers::install::list_agents))
```

**Step 3: Verify**

Run: `cd backend && cargo check`
Expected: compiles (install_skill and import handlers still reference old field — fix next)

**Step 4: Commit**

```bash
git add backend/src/handlers/install.rs backend/src/main.rs
git commit -m "feat: add GET /api/agents endpoint"
```

---

### Task 4: Rewrite install_skill to use agent selection

**Files:**
- Modify: `backend/src/handlers/install.rs`

**Step 1: Replace InstallSkillRequest**

```rust
#[derive(Debug, Deserialize)]
pub struct InstallSkillRequest {
    pub agent: String,
}
```

**Step 2: Rewrite install_skill function**

Replace the entire `install_skill` function body:

```rust
pub async fn install_skill(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(body): Json<InstallSkillRequest>,
) -> Result<Json<serde_json::Value>, AppError> {
    let skill = state
        .store
        .get_skill(&name)?
        .ok_or_else(|| AppError::NotFound(format!("Skill '{}' not found", name)))?;

    let agent = state
        .get_agent(&body.agent)
        .ok_or_else(|| AppError::BadRequest(format!("Unknown agent '{}'", body.agent)))?;

    let src = state.registry_path.join(&skill.path);
    if !src.exists() {
        return Err(AppError::Internal(format!(
            "Skill directory '{}' not found in registry",
            skill.path
        )));
    }

    let dest = agent.skills_path.join(&name);
    if dest.exists() {
        return Err(AppError::BadRequest(format!(
            "Skill '{}' is already installed at '{}'. Remove it first.",
            name,
            dest.to_string_lossy()
        )));
    }

    fs::create_dir_all(&agent.skills_path)?;
    copy_dir_recursive(&src, &dest)?;

    Ok(Json(serde_json::json!({
        "installed": name,
        "agent": agent.id,
        "path": dest.to_string_lossy()
    })))
}
```

**Step 3: Commit**

```bash
git add backend/src/handlers/install.rs
git commit -m "feat: install_skill uses agent selection instead of target_dir"
```

---

### Task 5: Rewrite install_combination to use agent selection

**Files:**
- Modify: `backend/src/handlers/combinations.rs`

**Step 1: Add request body and update function signature**

```rust
#[derive(Debug, Deserialize)]
pub struct InstallCombinationRequest {
    pub agent: String,
}

pub async fn install_combination(
    State(state): State<AppState>,
    Path(name): Path<String>,
    Json(body): Json<InstallCombinationRequest>,
) -> Result<Json<InstallCombinationResponse>, AppError> {
```

**Step 2: Update function body**

Add agent resolution at the top:

```rust
let agent = state
    .get_agent(&body.agent)
    .ok_or_else(|| AppError::BadRequest(format!("Unknown agent '{}'", body.agent)))?;
```

Replace `state.skills_install_path.join(skill_name)` with `agent.skills_path.join(skill_name)`.

**Step 3: Commit**

```bash
git add backend/src/handlers/combinations.rs
git commit -m "feat: install_combination uses agent selection"
```

---

### Task 6: Update list_importable and import_skills for agents

**Files:**
- Modify: `backend/src/handlers/install.rs`

**Step 1: Update list_importable to accept agent query param**

Change signature to:

```rust
#[derive(Debug, Deserialize)]
pub struct ListImportableQuery {
    pub agent: Option<String>,
}

pub async fn list_importable(
    State(state): State<AppState>,
    Query(query): Query<ListImportableQuery>,
) -> Result<Json<Vec<ImportableSkill>>, AppError> {
```

In the body, resolve the scan path:

```rust
let scan_path = match &query.agent {
    Some(agent_id) => {
        let agent = state
            .get_agent(agent_id)
            .ok_or_else(|| AppError::BadRequest(format!("Unknown agent '{}'", agent_id)))?;
        agent.skills_path.clone()
    }
    None => {
        // Default: use first agent
        state.agents.first()
            .map(|a| a.skills_path.clone())
            .ok_or_else(|| AppError::Internal("No agents configured".into()))?
    }
};

if !scan_path.exists() {
    return Ok(Json(Vec::new()));
}
// ... rest same, but use scan_path instead of state.skills_install_path
```

**Step 2: Update import_skills similarly**

Add agent field to `ImportRequest`:

```rust
#[derive(Debug, Deserialize)]
pub struct ImportRequest {
    pub names: Vec<String>,
    pub agent: Option<String>,
}
```

Resolve the source path from agent instead of `state.skills_install_path`.

**Step 3: Verify full backend compilation**

Run: `cd backend && cargo check`
Expected: clean compilation

**Step 4: Commit**

```bash
git add backend/src/handlers/install.rs
git commit -m "refactor: import handlers use agent-based paths"
```

---

### Task 7: Update frontend types and API client

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/client.ts`

**Step 1: Add Agent type and update request types in types.ts**

Add:

```typescript
export interface Agent {
  id: string;
  name: string;
  skills_path: string;
}
```

Change `InstallSkillRequest`:

```typescript
export interface InstallSkillRequest {
  agent: string;
}
```

Change `InstallSkillResponse` to include agent:

```typescript
export interface InstallSkillResponse {
  installed: string;
  agent: string;
  path: string;
}
```

**Step 2: Update API client in client.ts**

Add agent to imports:

```typescript
import type { ..., Agent, ... } from "./types";
```

Add `listAgents` method:

```typescript
listAgents: () => request<Agent[]>("/agents"),
```

Update `installSkill`:

```typescript
installSkill: (name: string, agent: string) =>
  request<InstallSkillResponse>(`/skills/${encodeURIComponent(name)}/install`, {
    method: "POST",
    body: JSON.stringify({ agent }),
  }),
```

Update `installCombination`:

```typescript
installCombination: (name: string, agent: string) =>
  request<InstallCombinationResponse>(`/combinations/${encodeURIComponent(name)}/install`, {
    method: "POST",
    body: JSON.stringify({ agent }),
  }),
```

**Step 3: Commit**

```bash
git add frontend/src/api/types.ts frontend/src/api/client.ts
git commit -m "feat: frontend types and API client support agent-based install"
```

---

### Task 8: Update SkillDetail.tsx — agent selector UI

**Files:**
- Modify: `frontend/src/components/SkillDetail.tsx`

**Step 1: Update props interface**

```typescript
interface SkillDetailProps {
  skill: Skill;
  allTags: string[];
  agents: Agent[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string, agent: string) => void;
  onAddTag: (name: string, tag: string) => void;
  onRemoveTag: (name: string, tag: string) => void;
  onSuggestTags: (name: string) => Promise<string[]>;
  onTagsSuggested: (suggested: string[]) => void;
}
```

**Step 2: Replace state and handler**

Remove `installTargetDir` state. Add `selectedAgent` state:

```typescript
const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");
```

Update handler:

```typescript
const handleInstall = () => {
  if (!selectedAgent) return;
  onInstall(skill.name, selectedAgent);
  setShowInstallOptions(false);
};
```

**Step 3: Replace the install options panel**

Replace the text input + dual buttons with an agent selector:

```tsx
{showInstallOptions ? (
  <div className="space-y-3">
    <p className="text-xs font-medium text-[var(--color-text-tertiary)]" style={{ letterSpacing: "-0.224px" }}>
      Select target agent
    </p>
    <div className="space-y-2">
      {agents.map((agent) => (
        <label
          key={agent.id}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
          style={{
            background: selectedAgent === agent.id ? "rgba(0,113,227,0.08)" : "rgba(0,0,0,0.02)",
            border: selectedAgent === agent.id ? "1px solid var(--color-apple-blue)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <input
            type="radio"
            name="agent"
            value={agent.id}
            checked={selectedAgent === agent.id}
            onChange={() => setSelectedAgent(agent.id)}
            className="accent-[var(--color-apple-blue)]"
          />
          <span className="text-sm" style={{ letterSpacing: "-0.224px" }}>
            {agent.name}
          </span>
        </label>
      ))}
    </div>
    <div className="flex gap-2">
      <button
        onClick={() => { setShowInstallOptions(false); }}
        className="flex-1 text-sm px-4 py-2.5 rounded-full border transition-colors cursor-pointer"
        style={{ borderColor: "rgba(0,0,0,0.12)", color: "var(--color-text-secondary)", letterSpacing: "-0.224px" }}
      >
        Cancel
      </button>
      <button
        onClick={handleInstall}
        disabled={!selectedAgent}
        className="flex-1 btn-primary-blue disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Install
      </button>
    </div>
  </div>
) : (
  // ... keep existing Install/Delete buttons
)}
```

**Step 4: Commit**

```bash
git add frontend/src/components/SkillDetail.tsx
git commit -m "feat: SkillDetail uses agent selector instead of path input"
```

---

### Task 9: Update CombinationDetail.tsx — agent selector for combination install

**Files:**
- Modify: `frontend/src/components/CombinationDetail.tsx`

**Step 1: Update props**

```typescript
interface CombinationDetailProps {
  combination: Combination;
  allSkills: Skill[];
  agents: Agent[];
  onClose: () => void;
  onDelete: (name: string) => void;
  onInstall: (name: string, agent: string) => void;
  onUpdate: (name: string, data: { description?: string; skills?: string[]; workflow?: { groups: ParallelGroup[] } }) => void;
}
```

**Step 2: Add agent selection state**

```typescript
const [showAgentSelect, setShowAgentSelect] = useState(false);
const [selectedAgent, setSelectedAgent] = useState(agents[0]?.id ?? "");
```

**Step 3: Replace Install All button area**

In the actions footer, replace the direct install button with an agent-selecting flow:

```tsx
{!editing && (
  <>
    {showAgentSelect ? (
      <div className="flex-1 space-y-3">
        <div className="space-y-2">
          {agents.map((agent) => (
            <label
              key={agent.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors text-sm"
              style={{
                background: selectedAgent === agent.id ? "rgba(0,113,227,0.08)" : "rgba(0,0,0,0.02)",
                border: selectedAgent === agent.id ? "1px solid var(--color-apple-blue)" : "1px solid rgba(0,0,0,0.06)",
              }}
            >
              <input
                type="radio"
                name="combo-agent"
                value={agent.id}
                checked={selectedAgent === agent.id}
                onChange={() => setSelectedAgent(agent.id)}
                className="accent-[var(--color-apple-blue)]"
              />
              <span>{agent.name}</span>
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAgentSelect(false)} className="flex-1 text-sm px-4 py-2.5 rounded-full border" style={{ borderColor: "rgba(0,0,0,0.12)", color: "var(--color-text-secondary)" }}>Cancel</button>
          <button onClick={() => { onInstall(combination.name, selectedAgent); setShowAgentSelect(false); }} disabled={!selectedAgent} className="flex-1 btn-primary-blue disabled:opacity-40">Install All</button>
        </div>
      </div>
    ) : (
      <>
        <button onClick={() => setShowAgentSelect(true)} className="btn-primary-blue flex-1">
          Install All ({combination.skills.length})
        </button>
        {/* Delete button unchanged */}
      </>
    )}
  </>
)}
```

**Step 4: Commit**

```bash
git add frontend/src/components/CombinationDetail.tsx
git commit -m "feat: CombinationDetail uses agent selector for install"
```

---

### Task 10: Update App.tsx — wire agents data through components

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Add agents query**

```typescript
const { data: agentsData } = useQuery({
  queryKey: ["agents"],
  queryFn: api.listAgents,
});
const agents = agentsData ?? [];
```

**Step 2: Update installMutation**

```typescript
const installMutation = useMutation({
  mutationFn: ({ name, agent }: { name: string; agent: string }) =>
    api.installSkill(name, agent),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["skills"] });
    showToast(`"${data.installed}" installed to ${data.agent}`);
  },
  onError: (error: Error) => {
    showToast(error.message, "error");
  },
});
```

**Step 3: Update CombinationsPage** — pass agents and updated onInstall

Find where `<CombinationsPage>` is rendered. It needs `agents` and the new `onInstall` signature. Check if CombinationsPage needs updating too.

**Step 4: Update SkillDetail props**

```tsx
<SkillDetail
  skill={selectedSkill}
  allTags={tags}
  agents={agents}
  onClose={() => setSelectedSkill(null)}
  onDelete={(name) => deleteMutation.mutate(name)}
  onInstall={(name, agent) => installMutation.mutate({ name, agent })}
  onAddTag={(name, tag) => addTagMutation.mutate({ name, tag })}
  onRemoveTag={(name, tag) => removeTagMutation.mutate({ name, tag })}
  onSuggestTags={(name) => suggestTagsMutation.mutateAsync(name).then((res) => res.suggested)}
  onTagsSuggested={(suggested) =>
    handleTagsSuggested(suggested, selectedSkill.name, selectedSkill.tags)
  }
/>
```

**Step 5: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat: wire agent data through App component tree"
```

---

### Task 11: Update CombinationsPage.tsx to pass agents

**Files:**
- Modify: `frontend/src/components/CombinationsPage.tsx`

Read the file to understand how it passes `onInstall` to `CombinationDetail`. Update it to accept `agents` prop and pass it through along with the updated `onInstall: (name: string, agent: string) => void` signature.

**Step 1: Read and update CombinationsPage.tsx**

Update props to include `agents: Agent[]` and update the `onInstall` callback signature.

**Step 2: Commit**

```bash
git add frontend/src/components/CombinationsPage.tsx
git commit -m "feat: CombinationsPage passes agents to CombinationDetail"
```

---

### Task 12: Update Docker and env configuration

**Files:**
- Modify: `Dockerfile` — update ENV defaults
- Modify: `docker-compose.yml` — update volume mounts for multiple agents
- Modify: `.env.example` — document new env vars

**Step 1: Update Dockerfile ENV**

Replace `ENV SKILLS_INSTALL_PATH=/home/appuser/.claude/skills` with agent-specific defaults (these are already the compiled-in defaults, so no ENV line is strictly needed, but document them).

**Step 2: Update docker-compose.yml**

Mount both Claude and Codex skill directories:

```yaml
volumes:
  - ./registry:/app/registry
  - ./data:/app/data
  - ~/.claude/skills:/home/appuser/.claude/skills
  - ~/.codex/skills:/home/appuser/.codex/skills
```

**Step 3: Update .env.example**

Add documentation for agent path overrides:

```
# Agent skill directory overrides (optional, defaults shown)
# AGENT_CLAUDE_CODE_PATH=~/.claude/skills
# AGENT_OPENCLAW_PATH=~/.claude/skills
# AGENT_CODEX_PATH=~/.codex/skills
```

**Step 4: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example
git commit -m "docs: update Docker and env config for multi-agent install"
```

---

### Task 13: Final build verification and cleanup

**Step 1: Build backend**

Run: `cd backend && cargo build`
Expected: clean build

**Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: clean build

**Step 3: Run dev server and test**

1. Start: `cd backend && cargo run`
2. Open browser to http://localhost:3000
3. Test skill install: click a skill → Install → verify agent radio buttons appear
4. Test combination install: go to Combinations tab → click a combo → verify agent selector
5. Test agent list API: `curl http://localhost:3000/api/agents`

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: address build and UI issues from agent-based install"
```
