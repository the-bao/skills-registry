# Skills Registry API

## Base URL

```
http://localhost:3000/api
```

---

## Skills

### List Skills

```
GET /api/skills?q=&tag=
```

**Query parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search by name or description |
| `tag` | string | Filter by tag |

**Response:**

```json
[
  {
    "name": "my-skill",
    "description": "Does something useful",
    "version": "1.0.0",
    "user_invocable": true,
    "tags": ["web", "react"],
    "path": "/path/to/registry/my-skill"
  }
]
```

### Get Skill Metadata

```
GET /api/skills/:name
```

**Response:**

```json
{
  "name": "my-skill",
  "description": "Does something useful",
  "version": "1.0.0",
  "user_invocable": true,
  "tags": ["web", "react"],
  "path": "/path/to/registry/my-skill"
}
```

### Add Skill from Local Directory

```
POST /api/skills
```

**Request body:**

```json
{
  "path": "/path/to/my-skill"
}
```

The directory must contain a `SKILL.md` file.

### Delete Skill

```
DELETE /api/skills/:name
```

### Install Skill

```
POST /api/skills/:name/install
```

Copies the skill to `SKILLS_INSTALL_PATH` (default: `~/.claude/skills/`).

### Batch Import from Agent Directory

```
POST /api/skills/import
```

Scans `~/.claude/skills/` and imports all skills into the registry.

### List Importable Skills

```
GET /api/skills/importable
```

Lists skills in `~/.claude/skills/` that are not yet in the registry.

---

## Tags

### List All Tags

```
GET /api/tags
```

**Response:**

```json
["web", "react", "backend", "ai"]
```

### List Tags with Skill Counts

```
GET /api/tags/detail
```

**Response:**

```json
[
  { "name": "web", "count": 5 },
  { "name": "react", "count": 3 }
]
```

### Rename Tag

```
PUT /api/tags/:tag
```

**Request body:**

```json
{
  "name": "new-tag-name"
}
```

### Delete Tag

```
DELETE /api/tags/:tag
```

Removes the tag from all skills (does not delete skills).

### Add Tag to Skill

```
POST /api/skills/:name/tags
```

**Request body:**

```json
{
  "tag": "web"
}
```

### Remove Tag from Skill

```
DELETE /api/skills/:name/tags/:tag
```

### Get AI Tag Suggestions

```
POST /api/skills/:name/suggest-tags
```

Requires `ANTHROPIC_AUTH_TOKEN` configured.

**Response:**

```json
{
  "suggestions": ["web", "react", "frontend"]
}
```

---

## Combinations

### List All Combinations

```
GET /api/combinations
```

### Get Combination Details

```
GET /api/combinations/:name
```

**Response:**

```json
{
  "name": "my-combo",
  "description": "A useful combination",
  "workflow": {
    "groups": [
      {
        "name": "Setup",
        "skills": ["skill-a", "skill-b"]
      },
      {
        "name": "Deploy",
        "skills": ["skill-c"]
      }
    ]
  }
}
```

### Create Combination

```
POST /api/combinations
```

**Request body:**

```json
{
  "name": "my-combo",
  "description": "A useful combination",
  "workflow": {
    "groups": [
      { "skills": ["skill-a", "skill-b"] },
      { "skills": ["skill-c"] }
    ]
  }
}
```

### Update Combination

```
PUT /api/combinations/:name
```

Same body as create.

### Delete Combination

```
DELETE /api/combinations/:name
```

### Install Combination

```
POST /api/combinations/:name/install
```

Installs all skills in the combination in parallel groups (each group runs in parallel, groups run sequentially).

---

## GitHub Import

### Import from GitHub Repository

```
POST /api/github/import
```

**Request body:**

```json
{
  "repo": "owner/repo",
  "path": "skills"  // optional, defaults to root
}
```

Recursively finds all directories containing `SKILL.md` and imports them.

---

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

**Frontmatter fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique skill identifier |
| `description` | string | Yes | Human-readable description |
| `version` | string | No | Semantic version |
| `user_invocable` | boolean | No | Whether invocable via `/skill-name` |

---

# Skills Registry API（中文）

## 基础 URL

```
http://localhost:3000/api
```

---

## Skills

### 列出 Skills

```
GET /api/skills?q=&tag=
```

**查询参数：**

| 参数 | 类型 | 说明 |
|------|------|------|
| `q` | string | 按名称或描述搜索 |
| `tag` | string | 按标签过滤 |

**响应：**

```json
[
  {
    "name": "my-skill",
    "description": "做些有用的事",
    "version": "1.0.0",
    "user_invocable": true,
    "tags": ["web", "react"],
    "path": "/path/to/registry/my-skill"
  }
]
```

### 获取 Skill 元数据

```
GET /api/skills/:name
```

### 从本地目录添加 Skill

```
POST /api/skills
```

**请求体：**

```json
{
  "path": "/path/to/my-skill"
}
```

目录必须包含 `SKILL.md` 文件。

### 删除 Skill

```
DELETE /api/skills/:name
```

### 安装 Skill

```
POST /api/skills/:name/install
```

复制 skill 到 `SKILLS_INSTALL_PATH`（默认：`~/.claude/skills/`）。

### 从 Agent 目录批量导入

```
POST /api/skills/import
```

扫描 `~/.claude/skills/` 并将所有 skills 导入仓库。

### 列出可导入的 Skills

```
GET /api/skills/importable
```

列出 `~/.claude/skills/` 中尚未导入仓库的 skills。

---

## 标签

### 列出所有标签

```
GET /api/tags
```

**响应：**

```json
["web", "react", "backend", "ai"]
```

### 列出标签及 Skill 数量

```
GET /api/tags/detail
```

**响应：**

```json
[
  { "name": "web", "count": 5 },
  { "name": "react", "count": 3 }
]
```

### 重命名标签

```
PUT /api/tags/:tag
```

**请求体：**

```json
{
  "name": "new-tag-name"
}
```

### 删除标签

```
DELETE /api/tags/:tag
```

从所有 skills 中移除该标签（不删除 skills）。

### 为 Skill 添加标签

```
POST /api/skills/:name/tags
```

**请求体：**

```json
{
  "tag": "web"
}
```

### 移除 Skill 的标签

```
DELETE /api/skills/:name/tags/:tag
```

### 获取 AI 标签推荐

```
POST /api/skills/:name/suggest-tags
```

需要配置 `ANTHROPIC_AUTH_TOKEN`。

**响应：**

```json
{
  "suggestions": ["web", "react", "frontend"]
}
```

---

## 技能组合

### 列出所有技能组合

```
GET /api/combinations
```

### 获取技能组合详情

```
GET /api/combinations/:name
```

**响应：**

```json
{
  "name": "my-combo",
  "description": "一个有用的组合",
  "workflow": {
    "groups": [
      {
        "name": "Setup",
        "skills": ["skill-a", "skill-b"]
      },
      {
        "name": "Deploy",
        "skills": ["skill-c"]
      }
    ]
  }
}
```

### 创建技能组合

```
POST /api/combinations
```

**请求体：**

```json
{
  "name": "my-combo",
  "description": "一个有用的组合",
  "workflow": {
    "groups": [
      { "skills": ["skill-a", "skill-b"] },
      { "skills": ["skill-c"] }
    ]
  }
}
```

### 更新技能组合

```
PUT /api/combinations/:name
```

格式同创建。

### 删除技能组合

```
DELETE /api/combinations/:name
```

### 安装技能组合

```
POST /api/combinations/:name/install
```

按并行组安装所有 skills（组内并行，组间顺序执行）。

---

## GitHub 导入

### 从 GitHub 仓库导入

```
POST /api/github/import
```

**请求体：**

```json
{
  "repo": "owner/repo",
  "path": "skills"  // 可选，默认为根目录
}
```

递归查找所有包含 `SKILL.md` 的目录并导入。

---

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

**Frontmatter 字段：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 唯一标识符 |
| `description` | string | 是 | 人类可读描述 |
| `version` | string | 否 | 语义化版本 |
| `user_invocable` | boolean | 否 | 是否可通过 `/skill-name` 调用 |
