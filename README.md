# Skills Registry

A local management system for Claude Code skills, with a macOS-style web interface.

[中文文档](#中文)

---

## Features

- **Browse & Search** — Browse all skills in a card grid, search by name or description
- **Tags** — Organize skills with user-defined tags, filter by tag in sidebar
- **Add Skills** — Import a skill from any local directory containing a `SKILL.md`
- **Delete Skills** — Remove skills from the registry
- **Install** — Copy a skill from registry to `~/.claude/skills/`
- **Import** — Scan `~/.claude/skills/` and batch-import into registry
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

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `REGISTRY_PATH` | `./registry` | Path to skill storage directory |
| `DB_PATH` | `./data/registry.db` | Path to redb database file |
| `SKILLS_INSTALL_PATH` | `~/.claude/skills` | Claude Code skills install target |
| `PORT` | `3000` | HTTP server port |
| `FRONTEND_DIST` | `./frontend/dist` | Frontend static files directory |

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/skills?q=&tag=` | List skills (search + tag filter) |
| GET | `/api/skills/:name` | Get skill metadata |
| POST | `/api/skills` | Add skill from local directory |
| DELETE | `/api/skills/:name` | Delete skill |
| GET | `/api/tags` | List all tags |
| POST | `/api/skills/:name/tags` | Add tag to skill |
| DELETE | `/api/skills/:name/tags/:tag` | Remove tag from skill |
| POST | `/api/skills/:name/install` | Install to `~/.claude/skills/` |
| POST | `/api/skills/import` | Batch import from `~/.claude/skills/` |
| GET | `/api/skills/importable` | List importable skills |

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
│       └── handlers/     # API route handlers
├── frontend/             # React app
│   └── src/
│       ├── App.tsx       # Main app component
│       ├── api/          # API client + types
│       └── components/   # UI components
├── registry/             # Skill storage (gitignored)
├── data/                 # redb database (gitignored)
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
- **添加 Skill** — 从任意本地目录导入含 `SKILL.md` 的 skill
- **删除 Skill** — 从仓库中移除 skill
- **安装** — 将 skill 从仓库复制到 `~/.claude/skills/`
- **导入** — 扫描 `~/.claude/skills/` 批量导入到仓库
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

## 配置

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `REGISTRY_PATH` | `./registry` | skill 存储目录 |
| `DB_PATH` | `./data/registry.db` | redb 数据库文件路径 |
| `SKILLS_INSTALL_PATH` | `~/.claude/skills` | Claude Code skill 安装目标 |
| `PORT` | `3000` | HTTP 服务端口 |
| `FRONTEND_DIST` | `./frontend/dist` | 前端静态文件目录 |

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/skills?q=&tag=` | 列出 skill（搜索 + 标签过滤） |
| GET | `/api/skills/:name` | 获取 skill 元数据 |
| POST | `/api/skills` | 从本地目录添加 skill |
| DELETE | `/api/skills/:name` | 删除 skill |
| GET | `/api/tags` | 列出所有标签 |
| POST | `/api/skills/:name/tags` | 添加标签 |
| DELETE | `/api/skills/:name/tags/:tag` | 移除标签 |
| POST | `/api/skills/:name/install` | 安装到 `~/.claude/skills/` |
| POST | `/api/skills/import` | 从 `~/.claude/skills/` 批量导入 |
| GET | `/api/skills/importable` | 列出可导入的 skill |

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
│       └── handlers/     # API 路由处理
├── frontend/             # React 应用
│   └── src/
│       ├── App.tsx       # 主应用组件
│       ├── api/          # API 客户端 + 类型
│       └── components/   # UI 组件
├── registry/             # skill 存储（gitignored）
├── data/                 # redb 数据库（gitignored）
└── docs/plans/           # 设计与实施文档
```

## 许可证

MIT
