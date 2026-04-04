# Skills Registry 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建本地 Claude Code skill 仓库管理系统，Rust(Axum+redb) 后端 + React 前端。

**Architecture:** 后端扫描 registry/ 目录解析 SKILL.md frontmatter 存入 redb 索引，提供 REST API。前端 macOS 风格 Web 界面。

**Tech Stack:** Rust 1.91, Axum, redb, tokio / React 19, TypeScript, Vite, Tailwind CSS, Framer Motion, TanStack Query

---

### Task 1: 后端项目脚手架

**Files:**
- Create: `backend/Cargo.toml`
- Create: `backend/src/main.rs`
- Create: `backend/src/config.rs`

**Step 1: 创建 Cargo.toml**

```toml
[package]
name = "skills-registry"
version = "0.1.0"
edition = "2024"

[dependencies]
axum = "0.8"
tokio = { version = "1", features = ["full"] }
redb = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tower-http = { version = "0.6", features = ["fs", "cors"] }
tracing = "0.1"
tracing-subscriber = "0.3"
```

**Step 2: 创建 main.rs 骨架**

Axum app 启动，health check endpoint，托管前端静态文件。

**Step 3: 创建 config.rs**

```rust
pub struct Config {
    pub registry_path: PathBuf,
    pub db_path: PathBuf,
    pub skills_install_path: PathBuf,
    pub port: u16,
}
```

默认值：registry_path = `./registry`, db_path = `./data/registry.db`, skills_install_path = `~/.claude/skills`, port = 3000。

**Step 4: cargo check 验证编译**

**Step 5: Commit**

---

### Task 2: 数据模型与 SKILL.md 解析

**Files:**
- Create: `backend/src/models.rs`
- Create: `backend/src/parser.rs`

**Step 1: 定义 Skill 模型**

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    pub name: String,
    pub description: String,
    pub version: Option<String>,
    pub user_invocable: Option<bool>,
    pub tags: Vec<String>,
    pub path: String,
}
```

**Step 2: 实现 SKILL.md frontmatter 解析器**

解析 `---` 包裹的 YAML frontmatter，提取 name/description/version/user_invocable。

**Step 3: 写测试用例**

用 `#[cfg(test)]` 模块测试解析正确和错误的 frontmatter。

**Step 4: cargo test 验证**

**Step 5: Commit**

---

### Task 3: redb 存储层

**Files:**
- Create: `backend/src/store.rs`

**Step 1: 定义 Store struct**

```rust
pub struct Store {
    db: redb::Database,
}
```

**Step 2: 实现 CRUD 方法**

- `open(path)` - 打开/创建数据库
- `list_skills()` - 列出所有 skill
- `get_skill(name)` - 获取单个 skill
- `put_skill(skill)` - 存储 skill
- `delete_skill(name)` - 删除 skill
- `add_tag(name, tag)` - 添加标签
- `remove_tag(name, tag)` - 移除标签
- `get_all_tags()` - 获取所有标签
- `search_skills(query)` - 搜索
- `sync_from_fs(registry_path)` - 从文件系统同步

redb 表设计：
- `skills` 表：`String key → String value (JSON)`
- `tags` 表：`String key (tag name) → String value (JSON array of skill names)`

**Step 3: 写测试**

测试 CRUD 操作、标签管理、搜索。

**Step 4: cargo test 验证**

**Step 5: Commit**

---

### Task 4: 统一错误处理

**Files:**
- Create: `backend/src/error.rs`

**Step 1: 定义 AppError**

```rust
pub enum AppError {
    NotFound(String),
    BadRequest(String),
    Internal(String),
    Io(std::io::Error),
}
```

实现 `IntoResponse` trait，返回 JSON 错误响应。

**Step 2: cargo check 验证**

**Step 3: Commit**

---

### Task 5: API Handlers - Skills CRUD

**Files:**
- Create: `backend/src/handlers/mod.rs`
- Create: `backend/src/handlers/skills.rs`

**Step 1: 实现 GET /api/skills**

查询参数 `q`（搜索）和 `tag`（标签过滤）。

**Step 2: 实现 GET /api/skills/:name**

**Step 3: 实现 POST /api/skills**

请求体：`{ "source_path": "/path/to/skill-dir" }`，将目录复制到 registry/。

**Step 4: 实现 DELETE /api/skills/:name**

删除 registry 中的目录 + redb 记录。

**Step 5: 写集成测试**

用 `tower::ServiceExt` 测试各 handler。

**Step 6: cargo test 验证**

**Step 7: Commit**

---

### Task 6: API Handlers - Tags

**Files:**
- Create: `backend/src/handlers/tags.rs`

**Step 1: 实现 GET /api/tags**

**Step 2: 实现 POST /api/skills/:name/tags**

**Step 3: 实现 DELETE /api/skills/:name/tags/:tag**

**Step 4: 写测试**

**Step 5: cargo test 验证**

**Step 6: Commit**

---

### Task 7: API Handlers - Install/Import

**Files:**
- Create: `backend/src/handlers/install.rs`

**Step 1: 实现 POST /api/skills/:name/install**

将 registry/<name>/ 复制到 ~/.claude/skills/<name>/。

**Step 2: 实现 POST /api/skills/import**

扫描 ~/.claude/skills/，返回可导入列表。请求体：`{ "names": ["skill-a", "skill-b"] }`，批量导入。

**Step 3: 写测试**

**Step 4: cargo test 验证**

**Step 5: Commit**

---

### Task 8: 路由组装与启动流程

**Files:**
- Modify: `backend/src/main.rs`

**Step 1: 组装所有路由**

```rust
let app = Router::new()
    .nest("/api", api_routes())
    .fallback_service(ServeDir::new("../frontend/dist"));
```

**Step 2: 实现启动扫描**

启动时调用 `store.sync_from_fs()`。

**Step 3: cargo run 验证启动**

**Step 4: Commit**

---

### Task 9: 前端项目脚手架

**Files:**
- Create: `frontend/` (Vite + React + TS)

**Step 1: npm create vite**

```bash
cd frontend && npm create vite@latest . -- --template react-ts
```

**Step 2: 安装依赖**

```bash
npm install @tanstack/react-query framer-motion tailwindcss @tailwindcss/vite
```

**Step 3: 配置 Tailwind**

**Step 4: npm run dev 验证启动**

**Step 5: Commit**

---

### Task 10: 前端 API 层与类型

**Files:**
- Create: `frontend/src/api/types.ts`
- Create: `frontend/src/api/client.ts`

**Step 1: 定义 TypeScript 类型**

```typescript
interface Skill {
  name: string;
  description: string;
  version?: string;
  user_invocable?: boolean;
  tags: string[];
  path: string;
}
```

**Step 2: 实现 API client**

fetch 封装：listSkills, getSkill, addSkill, deleteSkill, addTag, removeTag, installSkill, importSkills。

**Step 3: Commit**

---

### Task 11: 前端布局 - 侧边栏 + 搜索栏

**Files:**
- Create: `frontend/src/components/Layout.tsx`
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/SearchBar.tsx`

macOS 风格：毛玻璃侧边栏、搜索栏带圆角阴影。

**Step 1: 实现 Layout（侧边栏 + 主内容区）**

**Step 2: 实现 Sidebar（标签列表导航）**

**Step 3: 实现 SearchBar（搜索输入框）**

**Step 4: 在 App.tsx 中组装**

**Step 5: npm run dev 验证布局**

**Step 6: Commit**

---

### Task 12: 前端 - Skill 卡片列表

**Files:**
- Create: `frontend/src/components/SkillCard.tsx`
- Create: `frontend/src/components/SkillGrid.tsx`

**Step 1: 实现 SkillCard**

显示 name、description（截断）、version、标签 chips。hover 动画（Framer Motion）。

**Step 2: 实现 SkillGrid**

使用 TanStack Query 获取 skill 列表，渲染卡片网格。搜索/标签过滤。

**Step 3: AnimatePresence 处理列表增删动画**

**Step 4: npm run dev 验证**

**Step 5: Commit**

---

### Task 13: 前端 - 详情弹窗

**Files:**
- Create: `frontend/src/components/SkillDetail.tsx`

**Step 1: 实现详情弹窗**

毛玻璃背景遮罩，弹窗滑入动画。展示完整元数据，操作按钮（安装、删除、管理标签）。

**Step 2: npm run dev 验证**

**Step 3: Commit**

---

### Task 14: 前端 - 添加/导入弹窗

**Files:**
- Create: `frontend/src/components/AddSkillModal.tsx`
- Create: `frontend/src/components/ImportModal.tsx`

**Step 1: 实现 AddSkillModal**

输入本地路径，添加 skill 到 registry。

**Step 2: 实现 ImportModal**

展示 ~/.claude/skills/ 中可导入的 skill 列表，多选导入。

**Step 3: npm run dev 验证**

**Step 4: Commit**

---

### Task 15: 前端构建 & 后端集成

**Step 1: npm run build 构建前端**

**Step 2: cargo run -- 启动后端，验证静态文件托管**

**Step 3: 端到端验证所有功能**

**Step 4: Final Commit**
