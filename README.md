# Skills Registry

Browse, tag, and install AI agent skills from one place. Skills Registry supports Claude Code, OpenClaw, Codex, and more.

[中文文档](#中文)

## Star History

<a href="https://www.star-history.com/?repos=the-bao%2Fskills-registry&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=the-bao/skills-registry&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=the-bao/skills-registry&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=the-bao/skills-registry&type=date&legend=top-left" />
 </picture>
</a>

---

## Features

- **Browse & Search** — Browse all skills in a card grid, search by name or description
- **Tags** — Organize skills with user-defined tags, filter by tag in sidebar
- **AI Auto-Tagging** — Use AI to suggest 3 tags per skill from existing tags + diverse dimensions, with user confirmation before applying
- **Tag Management** — Full CRUD for tags: rename, delete, view skill counts
- **Combinations** — Group multiple skills into installable combinations
- **Add Skills** — Import a skill from any local directory containing a `SKILL.md`
- **Delete Skills** — Remove skills from the registry
- **Agent-Based Install** — Select an AI agent (Claude Code, OpenClaw, Codex) and install skills directly to its global directory
- **Import** — Scan any agent's skills directory and batch-import into registry
- **GitHub Import** — Import skills directly from any GitHub repository
- **Auto-sync** — On startup, the backend scans `registry/` and indexes all `SKILL.md` frontmatter

## Philosophy

Skills Registry serves as a **unified skill management hub** with a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                     Skills Registry                         │
│           (Web UI · Tagging · AI Suggestions)               │
│                                                             │
│   registry/  ←  GitHub Import  ←  Local Directories         │
└─────────────────────────┬───────────────────────────────────┘
                          │ install to agent
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Global Skills Directory                   │
│         (Claude Code / OpenClaw / Codex / ...)              │
│                                                             │
│   ~/.claude/skills/           ←  Claude Code                │
│   ~/.openclaw/workspace/skills/ ←  OpenClaw                 │
│   ~/.codex/skills/            ←  Codex                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ agent distributes
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Project Directory                          │
│                                                             │
│   project/.claude/skills/  ←  agent picks & uses           │
└─────────────────────────────────────────────────────────────┘
```

**Layered flow:**
1. **Skills Registry** — Central hub: browse, search, tag, organize, create combinations
2. **Agent Global Directory** — Select target agent and install skills to its fixed global path
3. **Project Directory** — Agent distributes relevant skills to project on demand

This design lets you:
- Manage all skills in one place with a friendly UI
- Install skills to any supported AI agent with one click
- Let each agent handle its own project-level skill distribution

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Rust, Axum, redb (embedded KV database) |
| Frontend | React, TypeScript, Vite, Tailwind CSS, Framer Motion |
| State | TanStack Query (server state) |

## Getting Started

### Prerequisites

- Rust 1.85+ (`rustup`)
- Node.js 20+ (`npm`)

### Build & Run

```bash
# Copy and configure environment
cp .env.example .env
# Edit .env with your AI API credentials (required for auto-tagging)

# Build backend
cd backend && cargo build --release

# Build frontend
cd ../frontend && npm install && npm run build

# Run (from project root)
cd .. && ./backend/target/release/skills-registry
```

Open http://localhost:3000

### Development

Run backend and frontend dev server separately:

```bash
# Terminal 1 — backend
cd backend && cargo run

# Terminal 2 — frontend (proxies /api to localhost:3000)
cd frontend && npm run dev
```

## Docker

### Build Image

```bash
docker build -t skills-registry:latest .
```

### Run Container

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/registry:/app/registry \
  -v $(pwd)/data:/app/data \
  -e ANTHROPIC_AUTH_TOKEN=your-api-key \
  skills-registry:latest
```

**Environment variables:**

| Variable | Default | Required | Description |
|----------|---------|----------|-------------|
| `ANTHROPIC_AUTH_TOKEN` | — | Yes | API key for AI auto-tagging |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | No | AI API endpoint |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | No | AI model for tag suggestions |

**Volumes:**

| Path | Description |
|------|-------------|
| `/app/registry` | Skill storage directory |
| `/app/data` | Database files |

Open http://localhost:3000 after starting.

### Use with AI Agents on Host

To install skills directly into your host's AI agent directories via the container, mount the host's skills directories:

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/registry:/app/registry \
  -v $(pwd)/data:/app/data \
  -v ~/.claude/skills:/home/appuser/.claude/skills \
  -v ~/.openclaw/workspace/skills:/home/appuser/.openclaw/workspace/skills \
  -v ~/.codex/skills:/home/appuser/.codex/skills \
  -e ANTHROPIC_AUTH_TOKEN=your-api-key \
  skills-registry:latest
```

This allows you to:
- Browse and manage skills in the web UI
- Select an AI agent (Claude Code, OpenClaw, Codex) and install with one click
- The installed skills become immediately available in the target agent on the host

**Path notes:**
- The container runs as user `appuser` (UID 1000)
- Agent paths can be overridden via `AGENT_*_PATH` environment variables

## Configuration

Configuration is loaded from `.env` file in the project root (see `.env.example` for template).

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REGISTRY_PATH` | `./registry` | Path to skill storage directory |
| `DB_PATH` | `./data/registry.db` | Path to redb database file |
| `PORT` | `3000` | HTTP server port |
| `FRONTEND_DIST` | `./frontend/dist` | Frontend static files directory |
| `ANTHROPIC_AUTH_TOKEN` | — | API key for AI auto-tagging (required for AI features) |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | AI API base URL (supports Anthropic, GLM, MiniMax) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | AI model for tag suggestion |

### Agent Install Paths

Skills are installed to each agent's fixed global directory. Defaults:

| Agent | Default Path |
|-------|-------------|
| Claude Code | `~/.claude/skills` |
| OpenClaw | `~/.openclaw/workspace/skills` |
| Codex | `~/.codex/skills` |

Override with environment variables (agent ID uppercase, hyphens to underscores):

| Variable | Description |
|----------|-------------|
| `AGENT_CLAUDE_CODE_PATH` | Override Claude Code install path |
| `AGENT_OPENCLAW_PATH` | Override OpenClaw install path |
| `AGENT_CODEX_PATH` | Override Codex install path |

### AI API Compatibility

The auto-tagging feature is compatible with any Anthropic Messages API-compatible endpoint:

- **Anthropic** (default) — `https://api.anthropic.com`
- **GLM** (智谱) — `https://open.bigmodel.cn/api/anthropic`
- **MiniMax** — similar configuration

Detected automatically by `ANTHROPIC_BASE_URL` containing `bigmodel` or `zhipu` (uses Bearer auth), otherwise uses `x-api-key` header.

## Skill Format

Each skill is a directory containing a `SKILL.md` with YAML frontmatter:

```
my-skill/
├── SKILL.md          # Required: skill definition
├── assets/           # Optional: static resources
├── references/       # Optional: reference docs
└── ...               # Any other files
```

**SKILL.md example:**

```markdown
---
name: my-skill
description: "Does something useful"
version: "1.0.0"
user_invocable: true
---

# My Skill

Skill content here...
```

## Project Structure

```
skills-registry/
├── backend/              # Rust Axum server
│   └── src/
│       ├── main.rs       # Entry point, router setup
│       ├── config.rs     # Environment configuration
│       ├── models.rs     # Data models
│       ├── parser.rs     # SKILL.md frontmatter parser
│       ├── store.rs      # redb storage layer
│       ├── error.rs      # Unified error handling
│       ├── ai.rs         # Anthropic/MiniMax/GLM API client
│       └── handlers/     # API route handlers
│           ├── mod.rs     # Handler module exports
│           ├── skills.rs  # Skill CRUD handlers
│           ├── tags.rs    # Tag management handlers
│           ├── combinations.rs # Combination handlers
│           ├── github.rs  # GitHub import handlers
│           └── auto_tag.rs # AI auto-tagging handlers
├── frontend/             # React app
│   └── src/
│       ├── App.tsx       # Main app component
│       ├── api/          # API client + types
│       └── components/   # UI components
├── registry/             # Skill storage (gitignored)
├── data/                 # redb database (gitignored)
├── .env                  # Environment config (gitignored)
├── .env.example          # Environment config template
└── docs/plans/           # Design & implementation docs
```

## License

MIT

---

<a id="中文"></a>

# Skills Registry（中文）

统一管理 AI Agent Skills 的可视化平台，支持 Claude Code、OpenClaw、Codex 等，一站式浏览、标签与安装。

## 功能

- **浏览与搜索** — 卡片网格展示所有 skill，按名称或描述搜索
- **标签管理** — 自定义标签分类，侧边栏按标签过滤
- **AI 自动标签** — 使用 AI 为 skill 推荐 3 个标签（来自已有标签库 + 不同维度），用户确认后应用
- **标签管理页面** — 完整的标签 CRUD：重命名、删除、查看 skill 数量
- **技能组合** — 将多个 skill 组合为可一键安装的组合
- **添加 Skill** — 从任意本地目录导入含 `SKILL.md` 的 skill
- **删除 Skill** — 从仓库中移除 skill
- **Agent 安装** — 选择 AI Agent（Claude Code、OpenClaw、Codex）一键安装 skill 到对应全局目录
- **导入** — 扫描 Agent 的 skill 目录批量导入到仓库
- **GitHub 导入** — 直接从 GitHub 仓库导入 skill
- **自动同步** — 启动时扫描 `registry/` 目录，自动索引所有 `SKILL.md` 元数据

## 设计理念

Skills Registry 作为**统一管理 skill 的中枢**，采用分层架构：

```
┌─────────────────────────────────────────────────────────────┐
│                     Skills Registry                          │
│              （Web 界面 · 标签管理 · AI 推荐）                │
│                                                             │
│   registry/  ←  GitHub 导入  ←  本地目录                     │
└─────────────────────────┬───────────────────────────────────┘
                          │ 安装到 Agent
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Agent 全局 Skills 目录                      │
│               （Claude Code / OpenClaw / Codex / ...）       │
│                                                             │
│   ~/.claude/skills/              ←  Claude Code             │
│   ~/.openclaw/workspace/skills/  ←  OpenClaw                │
│   ~/.codex/skills/               ←  Codex                   │
└─────────────────────────┬───────────────────────────────────┘
                          │ Agent 按需分发
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     项目目录                                 │
│                                                             │
│   project/.claude/skills/  ←  Agent 选取并使用              │
└─────────────────────────────────────────────────────────────┘
```

**分层架构：**
1. **Skills Registry** — 中心枢纽：浏览、搜索、标签、组合
2. **Agent 全局目录** — 选择目标 Agent，一键安装 skill 到其固定全局目录
3. **项目目录** — Agent 运行时按需分发 skill 到项目

设计优势：
- 统一管理所有 skill，一个界面搞定
- 一键选择 Agent 安装，即装即用
- 各 Agent 自行管理项目级 skill 分发

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | Rust、Axum、redb（嵌入式 KV 数据库） |
| 前端 | React、TypeScript、Vite、Tailwind CSS、Framer Motion |
| 状态管理 | TanStack Query（服务端状态） |

## 快速开始

### 前置条件

- Rust 1.85+
- Node.js 20+

### 构建与运行

```bash
# 复制并配置环境变量
cp .env.example .env
# 编辑 .env 填入你的 AI API 凭证（启用自动标签必需）

# 构建后端
cd backend && cargo build --release

# 构建前端
cd ../frontend && npm install && npm run build

# 运行（从项目根目录）
cd .. && ./backend/target/release/skills-registry
```

打开 http://localhost:3000

### 开发模式

分别启动后端和前端开发服务器：

```bash
# 终端 1 — 后端
cd backend && cargo run

# 终端 2 — 前端（/api 代理到 localhost:3000）
cd frontend && npm run dev
```

## Docker

### 构建镜像

```bash
docker build -t skills-registry:latest .
```

### 运行容器

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/registry:/app/registry \
  -v $(pwd)/data:/app/data \
  -e ANTHROPIC_AUTH_TOKEN=your-api-key \
  skills-registry:latest
```

**环境变量：**

| 变量 | 默认值 | 必填 | 说明 |
|------|--------|------|------|
| `ANTHROPIC_AUTH_TOKEN` | — | 是 | AI 自动标签 API 密钥 |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | 否 | AI API 地址 |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | 否 | AI 模型 |

**数据卷：**

| 路径 | 说明 |
|------|------|
| `/app/registry` | Skill 存储目录 |
| `/app/data` | 数据库文件 |

启动后访问 http://localhost:3000。

### 与宿主机 AI Agent 配合使用

通过容器将 skill 直接安装到宿主机的 AI Agent 目录，只需将宿主机的 skills 目录挂载到容器：

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/registry:/app/registry \
  -v $(pwd)/data:/app/data \
  -v ~/.claude/skills:/home/appuser/.claude/skills \
  -v ~/.openclaw/workspace/skills:/home/appuser/.openclaw/workspace/skills \
  -v ~/.codex/skills:/home/appuser/.codex/skills \
  -e ANTHROPIC_AUTH_TOKEN=your-api-key \
  skills-registry:latest
```

这样你就可以：
- 在 Web 界面中浏览和管理 skills
- 选择目标 Agent（Claude Code、OpenClaw、Codex）一键安装
- 安装后的 skills 可在宿主机上对应的 Agent 中直接使用

**路径说明：**
- 容器以用户 `appuser`（UID 1000）运行
- Agent 路径可通过 `AGENT_*_PATH` 环境变量覆盖

## 配置

配置从项目根目录的 `.env` 文件加载（参见 `.env.example` 模板）。

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REGISTRY_PATH` | `./registry` | skill 存储目录 |
| `DB_PATH` | `./data/registry.db` | redb 数据库文件路径 |
| `PORT` | `3000` | HTTP 服务端口 |
| `FRONTEND_DIST` | `./frontend/dist` | 前端静态文件目录 |
| `ANTHROPIC_AUTH_TOKEN` | — | AI 自动标签 API 密钥（启用 AI 功能必需） |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | AI API 地址（支持 Anthropic、GLM、MiniMax） |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | 用于标签推荐的 AI 模型 |

### Agent 安装路径

Skill 安装到各 Agent 的固定全局目录，默认值：

| Agent | 默认路径 |
|-------|---------|
| Claude Code | `~/.claude/skills` |
| OpenClaw | `~/.openclaw/workspace/skills` |
| Codex | `~/.codex/skills` |

通过环境变量覆盖（Agent ID 大写，连字符转下划线）：

| 变量 | 说明 |
|------|------|
| `AGENT_CLAUDE_CODE_PATH` | 覆盖 Claude Code 安装路径 |
| `AGENT_OPENCLAW_PATH` | 覆盖 OpenClaw 安装路径 |
| `AGENT_CODEX_PATH` | 覆盖 Codex 安装路径 |

### AI API 兼容性

自动标签功能兼容所有 Anthropic Messages API 兼容端点：

- **Anthropic**（默认）— `https://api.anthropic.com`
- **GLM**（智谱）— `https://open.bigmodel.cn/api/anthropic`
- **MiniMax** — 类似配置

通过 `ANTHROPIC_BASE_URL` 是否包含 `bigmodel` 或 `zhipu` 自动检测（使用 Bearer 认证），否则使用 `x-api-key` 头。

## Skill 格式

每个 skill 是一个目录，包含 `SKILL.md`（YAML frontmatter）：

```
my-skill/
├── SKILL.md          # 必须：skill 定义
├── assets/           # 可选：静态资源
├── references/       # 可选：参考文档
└── ...               # 其他任意文件
```

**SKILL.md 示例：**

```markdown
---
name: my-skill
description: "做些有用的事"
version: "1.0.0"
user_invocable: true
---

# My Skill

Skill 内容...
```

## 项目结构

```
skills-registry/
├── backend/              # Rust Axum 服务
│   └── src/
│       ├── main.rs       # 入口、路由配置
│       ├── config.rs     # 环境变量配置
│       ├── models.rs     # 数据模型
│       ├── parser.rs     # SKILL.md frontmatter 解析器
│       ├── store.rs      # redb 存储层
│       ├── error.rs      # 统一错误处理
│       ├── ai.rs         # Anthropic/MiniMax/GLM API 客户端
│       └── handlers/     # API 路由处理
│           ├── mod.rs     # 处理模块导出
│           ├── skills.rs  # Skill CRUD 处理
│           ├── tags.rs    # 标签管理处理
│           ├── combinations.rs # 技能组合处理
│           ├── github.rs  # GitHub 导入处理
│           └── auto_tag.rs # AI 自动标签处理
├── frontend/             # React 应用
│   └── src/
│       ├── App.tsx       # 主应用组件
│       ├── api/          # API 客户端 + 类型
│       └── components/   # UI 组件
├── registry/             # skill 存储（gitignored）
├── data/                 # redb 数据库（gitignored）
├── .env                  # 环境配置（gitignored）
├── .env.example          # 环境配置模板
└── docs/plans/           # 设计与实施文档
```

## 许可证

MIT
