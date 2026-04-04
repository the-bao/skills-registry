# Skills Registry - 设计文档

## 概述

本地 Claude Code skill 仓库管理系统。skill 存放在仓库目录下，用户通过 macOS 风格的 Web 界面进行管理（增删查、搜索、标签、安装/导入）。

## 技术栈

- **后端**：Rust + Axum + redb（嵌入式 KV 数据库）
- **前端**：React + TypeScript + Vite + Tailwind CSS + Framer Motion

## 项目结构

```
skills-registry/
├── backend/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs         # 入口，启动 HTTP 服务
│       ├── config.rs       # 配置（仓库路径、端口等）
│       ├── models.rs       # 数据模型
│       ├── store.rs        # redb KV 存储层
│       ├── handlers/
│       │   ├── skills.rs   # 增删查 API
│       │   ├── tags.rs     # 标签管理
│       │   └── install.rs  # 安装/导入
│       └── error.rs        # 统一错误处理
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.tsx
│       ├── components/
│       └── api/
├── registry/               # 本地 skill 仓库目录
│   └── <skill-name>/
│       ├── SKILL.md        # skill 定义文件（必须有）
│       └── ...             # 可选：assets/、references/、package.json 等
└── data/                   # redb 数据库文件
```

## 数据模型

```rust
struct Skill {
    name: String,           // skill 名称（唯一标识）
    description: String,    // 一行描述
    version: Option<String>,
    user_invocable: Option<bool>,
    tags: Vec<String>,      // 用户自定义标签（存 redb，不在 SKILL.md 中）
    path: String,           // registry 中的相对路径
}
```

元数据仅存在于 SKILL.md 的 frontmatter 中。tags 是用户通过 Web 界面添加的，单独存储在 redb 中。

## API 设计

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | `/api/skills` | 列出所有 skill（支持搜索、标签过滤） |
| GET | `/api/skills/:name` | 查看单个 skill 元数据 |
| POST | `/api/skills` | 添加 skill（从本地目录导入到 registry） |
| DELETE | `/api/skills/:name` | 删除 skill |
| GET | `/api/tags` | 获取所有标签 |
| POST | `/api/skills/:name/tags` | 给 skill 添加标签 |
| DELETE | `/api/skills/:name/tags/:tag` | 移除标签 |
| POST | `/api/skills/:name/install` | 安装 skill 到 ~/.claude/skills/ |
| POST | `/api/skills/import` | 从 ~/.claude/skills/ 导入到仓库 |

## 安装与导入

- **安装**：将 `registry/<skill-name>/` 整个目录复制到 `~/.claude/skills/<skill-name>/`
- **导入**：扫描 `~/.claude/skills/`，用户选择后将 skill 目录复制到 `registry/`，解析 SKILL.md frontmatter 写入 redb

不涉及 plugin 管理，不追踪安装状态。

## 启动流程

1. 读取配置（registry 路径、端口）
2. 打开/创建 redb 数据库（`data/registry.db`）
3. 扫描 `registry/` 下所有包含 `SKILL.md` 的子目录
4. 解析 frontmatter，与 redb 中已有数据做 diff（新增/更新/移除）
5. 启动 Axum HTTP 服务，同时托管前端静态文件

## 搜索实现

关键词匹配 name 和 description，标签过滤从 redb 查询。搜索走 redb 索引，不读文件系统。

## 前端设计

macOS 风格界面：
- **毛玻璃/磨砂效果**：`backdrop-filter: blur()` 半透明背景
- **圆角阴影**：大圆角（12-16px）、柔和多层阴影
- **流畅动画**：200-300ms 缓动过渡，列表增删有动画（Framer Motion）
- **系统字体**：`-apple-system, SF Pro` 风格
- **侧边栏布局**：左侧标签/分类导航，右侧内容区
- **精致交互**：hover 微妙放大/阴影变化

### 页面结构

- **首页/列表页**：skill 卡片网格，顶部搜索栏 + 标签过滤器，显示 name、description、version、标签
- **详情弹窗**：点击卡片弹出，展示完整元数据，操作按钮（添加标签、安装、删除）
- **添加弹窗**：选择本地目录导入或从 ~/.claude/skills/ 导入

### 技术细节

- React Query（TanStack Query）管理服务端状态
- Framer Motion 处理动画过渡
- Tailwind CSS 实现视觉效果
- 不引入重 UI 库，手写保持风格一致性
