# Skills Registry

A local management system for Claude Code skills, with a macOS-style web interface.

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
- **Install** — Copy a skill from registry to `~/.claude/skills/`
- **Import** — Scan `~/.claude/skills/` and batch-import into registry
- **GitHub Import** — Import skills directly from any GitHub repository
- **Auto-sync** — On startup, the backend scans `registry/` and indexes all `SKILL.md` frontmatter

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

### Use with Claude Code or OpenClaw on Host

To install skills directly into your host's Claude Code or OpenClaw via the container, mount the host's skills directory to the container's install target:

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/registry:/app/registry \
  -v $(pwd)/data:/app/data \
  -v ~/.claude/skills:/home/appuser/.claude/skills \
  -e SKILLS_INSTALL_PATH=/home/appuser/.claude/skills \
  -e ANTHROPIC_AUTH_TOKEN=your-api-key \
  skills-registry:latest
```

This allows you to:
- Browse and manage skills in the web UI
- Install skills from the registry to your host's Claude Code or OpenClaw
- The installed skills become immediately available in Claude Code or OpenClaw running on the host

**Path notes:**
- Linux/macOS: `~/.claude/skills` → `/home/USER/.claude/skills`
- The container runs as user `appuser` (UID 1000)
- OpenClaw uses the same skills directory structure as Claude Code, so the same mount works for both

## Configuration

Configuration is loaded from `.env` file in the project root (see `.env.example` for template).

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REGISTRY_PATH` | `./registry` | Path to skill storage directory |
| `DB_PATH` | `./data/registry.db` | Path to redb database file |
| `SKILLS_INSTALL_PATH` | `~/.claude/skills` | Claude Code skills install target |
| `PORT` | `3000` | HTTP server port |
| `FRONTEND_DIST` | `./frontend/dist` | Frontend static files directory |
| `ANTHROPIC_AUTH_TOKEN` | — | API key for AI auto-tagging (required for AI features) |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | AI API base URL (supports Anthropic, GLM, MiniMax) |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | AI model for tag suggestion |

### AI API Compatibility

The auto-tagging feature is compatible with any Anthropic Messages API-compatible endpoint:

- **Anthropic** (default) — `https://api.anthropic.com`
- **GLM** (智谱) — `https://open.bigmodel.cn/api/anthropic`
- **MiniMax** — similar configuration

Detected automatically by `ANTHROPIC_BASE_URL` containing `bigmodel` or `zhipu` (uses Bearer auth), otherwise uses `x-api-key` header.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills?q=&tag=` | List skills (search + tag filter) |
| GET | `/api/skills/:name` | Get skill metadata |
| POST | `/api/skills` | Add skill from local directory |
| DELETE | `/api/skills/:name` | Delete skill |
| GET | `/api/tags` | List all tags |
| GET | `/api/tags/detail` | List tags with skill counts |
| PUT | `/api/tags/:tag` | Rename a tag |
| DELETE | `/api/tags/:tag` | Delete a tag (removes from all skills) |
| POST | `/api/skills/:name/tags` | Add tag to skill |
| DELETE | `/api/skills/:name/tags/:tag` | Remove tag from skill |
| POST | `/api/skills/:name/suggest-tags` | Get AI tag suggestions for a skill |
| POST | `/api/skills/:name/install` | Install to `~/.claude/skills/` |
| POST | `/api/skills/import` | Batch import from `~/.claude/skills/` |
| GET | `/api/skills/importable` | List importable skills |
| POST | `/api/github/import` | Import skills from a GitHub repository |
| GET | `/api/combinations` | List all combinations |
| GET | `/api/combinations/:name` | Get combination details |
| POST | `/api/combinations` | Create a combination |
| PUT | `/api/combinations/:name` | Update a combination |
| DELETE | `/api/combinations/:name` | Delete a combination |
| POST | `/api/combinations/:name/install` | Install all skills in a combination |

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

Claude Code 本地 skill 仓库管理系统，提供 macOS 风格的 Web 管理界面。

## 功能

- **浏览与搜索** — 卡片网格展示所有 skill，按名称或描述搜索
- **标签管理** — 自定义标签分类，侧边栏按标签过滤
- **AI 自动标签** — 使用 AI 为 skill 推荐 3 个标签（来自已有标签库 + 不同维度），用户确认后应用
- **标签管理页面** — 完整的标签 CRUD：重命名、删除、查看 skill 数量
- **技能组合** — 将多个 skill 组合为可一键安装的组合
- **添加 Skill** — 从任意本地目录导入含 `SKILL.md` 的 skill
- **删除 Skill** — 从仓库中移除 skill
- **安装** — 将 skill 从仓库复制到 `~/.claude/skills/`
- **导入** — 扫描 `~/.claude/skills/` 批量导入到仓库
- **GitHub 导入** — 直接从 GitHub 仓库导入 skill
- **自动同步** — 启动时扫描 `registry/` 目录，自动索引所有 `SKILL.md` 元数据

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

### 与宿主机 Claude Code或OpenClaw 配合使用

通过容器将 skill 直接安装到宿主机的 Claude Code或OpenClaw，只需将宿主机的 skills 目录挂载到容器的安装目标目录：

```bash
docker run -d -p 3000:3000 \
  -v $(pwd)/registry:/app/registry \
  -v $(pwd)/data:/app/data \
  -v ~/.claude/skills:/home/appuser/.claude/skills \
  -e SKILLS_INSTALL_PATH=/home/appuser/.claude/skills \
  -e ANTHROPIC_AUTH_TOKEN=your-api-key \
  skills-registry:latest
```

这样你就可以：
- 在 Web 界面中浏览和管理 skills
- 将 skills 从仓库安装到宿主机的 Claude Code
- 安装后的 skills 可在宿主机上的 Claude Code 中直接使用

**路径说明：**
- Linux/macOS：`~/.claude/skills` → `/home/USER/.claude/skills`
- 容器以用户 `appuser`（UID 1000）运行

## 配置

配置从项目根目录的 `.env` 文件加载（参见 `.env.example` 模板）。

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REGISTRY_PATH` | `./registry` | skill 存储目录 |
| `DB_PATH` | `./data/registry.db` | redb 数据库文件路径 |
| `SKILLS_INSTALL_PATH` | `~/.claude/skills` | Claude Code skill 安装目标 |
| `PORT` | `3000` | HTTP 服务端口 |
| `FRONTEND_DIST` | `./frontend/dist` | 前端静态文件目录 |
| `ANTHROPIC_AUTH_TOKEN` | — | AI 自动标签 API 密钥（启用 AI 功能必需） |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | AI API 地址（支持 Anthropic、GLM、MiniMax） |
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` | 用于标签推荐的 AI 模型 |

### AI API 兼容性

自动标签功能兼容所有 Anthropic Messages API 兼容端点：

- **Anthropic**（默认）— `https://api.anthropic.com`
- **GLM**（智谱）— `https://open.bigmodel.cn/api/anthropic`
- **MiniMax** — 类似配置

通过 `ANTHROPIC_BASE_URL` 是否包含 `bigmodel` 或 `zhipu` 自动检测（使用 Bearer 认证），否则使用 `x-api-key` 头。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills?q=&tag=` | 列出 skill（搜索 + 标签过滤） |
| GET | `/api/skills/:name` | 获取 skill 元数据 |
| POST | `/api/skills` | 从本地目录添加 skill |
| DELETE | `/api/skills/:name` | 删除 skill |
| GET | `/api/tags` | 列出所有标签 |
| GET | `/api/tags/detail` | 列出标签及对应 skill 数量 |
| PUT | `/api/tags/:tag` | 重命名标签 |
| DELETE | `/api/tags/:tag` | 删除标签（从所有 skill 中移除） |
| POST | `/api/skills/:name/tags` | 添加标签 |
| DELETE | `/api/skills/:name/tags/:tag` | 移除标签 |
| POST | `/api/skills/:name/suggest-tags` | 获取 AI 标签推荐 |
| POST | `/api/skills/:name/install` | 安装到 `~/.claude/skills/` |
| POST | `/api/skills/import` | 从 `~/.claude/skills/` 批量导入 |
| GET | `/api/skills/importable` | 列出可导入的 skill |
| POST | `/api/github/import` | 从 GitHub 仓库导入 skill |
| GET | `/api/combinations` | 列出所有技能组合 |
| GET | `/api/combinations/:name` | 获取技能组合详情 |
| POST | `/api/combinations` | 创建技能组合 |
| PUT | `/api/combinations/:name` | 更新技能组合 |
| DELETE | `/api/combinations/:name` | 删除技能组合 |
| POST | `/api/combinations/:name/install` | 安装组合内所有 skill |

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
