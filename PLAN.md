# Content Builder Agent 实施计划

> 基于 deepagentsjs 框架，构建一个支持多输入、多输出的内容创作代理。

---

## 1. 业务需求

### 1.1 业务场景

作为技术运营，日常工作包括：

| 场景 | 输入 | 任务 |
|------|------|------|
| 技术同学写了文章 | 文章 URL | 改写为社交媒体帖子 |
| 公司有新动态 | 多个 URL（GitHub、文档等） | 整合信息，写发布公告 |
| 老板说"发个帖子" | 主题描述 | 研究 → 创作 |
| 需要深度内容 | 主题 + 参考资料 | 写博客 → 生成社交帖子 |

### 1.2 核心能力矩阵

| 能力 | 必须 | 实现方式 |
|------|:----:|----------|
| **输入：主题描述** | ✅ | 研究子代理 + Tavily |
| **输入：URL 链接** | ✅ | 复用 social-media-agent |
| **输入：本地文件** | ✅ | deepagentsjs filesystem |
| **输出：Blog post** | ✅ | blog-post skill |
| **输出：LinkedIn post** | ✅ | social-media skill |
| **输出：Twitter thread** | ✅ | social-media skill |
| **AI 生成配图** | ✅ | 通义万象 |
| **从 URL 提取图片** | ✅ | 复用 social-media-agent |
| **人工审核** | ✅ | deepagentsjs interruptOn |
| **发布到平台** | ⚪ | 复用 social-media-agent |

---

## 2. 技术选型

| 项 | 选择 | 说明 |
|----|------|------|
| **语言** | TypeScript | 与 social-media-agent 一致 |
| **框架** | deepagentsjs + LangGraph | Memory/Skills/Subagents/Plan 内置 |
| **LLM** | DashScope (Qwen) | 复用现有配置 |
| **Web Search** | Tavily | deepagents 推荐 |
| **图片生成** | 通义万象 | 同一 DashScope API |
| **内容提取** | Firecrawl | 复用 social-media-agent |

---

## 3. 架构设计

### 3.1 目录结构

```
content-builder-agent/
├── AGENTS.md                    # Memory：品牌声音 + 写作标准
├── subagents.yaml               # 子代理定义
├── skills/
│   ├── blog-post/
│   │   └── SKILL.md             # 博客写作工作流
│   └── social-media/
│       └── SKILL.md             # 社交媒体工作流
├── src/
│   ├── agent.ts                 # 主入口：createDeepAgent
│   ├── tools/
│   │   ├── web-search.ts        # Tavily 搜索工具
│   │   ├── generate-image.ts    # 通义万象图片生成
│   │   ├── extract-content.ts   # URL 内容提取
│   │   └── publish-post.ts      # 发布到平台
│   ├── clients/                 # 复制自 social-media-agent
│   │   ├── index.ts
│   │   ├── twitter/
│   │   └── linkedin/
│   └── utils/                   # 工具函数
│       ├── llm.ts               # LLM 工厂
│       └── types.ts             # 类型定义
├── output/                      # 输出目录
│   ├── blogs/
│   ├── linkedin/
│   ├── tweets/
│   └── research/
├── langgraph.json
├── package.json
└── tsconfig.json
```

### 3.2 数据流

```
┌─────────────────── 输入层 ───────────────────┐
│                                              │
│  主题描述          URL 链接         本地文件   │
│      │                │                │     │
└──────┼────────────────┼────────────────┼─────┘
       │                │                │
       ▼                ▼                ▼
┌─────────────────── 理解层 ───────────────────┐
│                                              │
│  researcher        extract-           read   │
│  子代理            content            _file  │
│  (Tavily)          工具               工具    │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌─────────────────── 规划层 ───────────────────┐
│                                              │
│              write_todos (内置)               │
│         识别内容类型 → 加载对应 Skill          │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
┌─────────────────── 创作层 ───────────────────┐
│                                              │
│  blog-post      linkedin-post    twitter     │
│  Skill          Skill            thread      │
│                                  Skill       │
│                                              │
│  + generate_image 工具（通义万象）            │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌─────────────────── 审核层 ───────────────────┐
│                                              │
│           Human-in-the-loop                  │
│           (interruptOn 配置)                 │
│                                              │
│  accept / edit / ignore / reschedule         │
│                                              │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌─────────────────── 输出层 ───────────────────┐
│                                              │
│  write_file         publish_post             │
│  (保存到本地)        (发布到平台)             │
│                                              │
│  blogs/<slug>/      linkedin/<slug>/         │
│  ├── post.md        ├── post.md              │
│  └── hero.png       └── image.png            │
│                                              │
└──────────────────────────────────────────────┘
```

### 3.3 deepagentsjs 能力使用

| deepagentsjs 能力 | 用途 |
|------------------|------|
| `memory: ["./AGENTS.md"]` | 加载品牌声音、写作标准 |
| `skills: ["./skills/"]` | 按需加载 blog-post / social-media 技能 |
| `subagents: [researcher]` | 研究子代理，使用 Tavily 搜索 |
| `write_todos` (内置) | 任务规划和进度跟踪 |
| `read_file/write_file` (内置) | 文件读写 |
| `interruptOn` | 人工审核中断点 |

---

## 4. 从 social-media-agent 复制的代码

### 4.1 复制清单

| 源路径 | 目标路径 | 用途 |
|--------|----------|------|
| `src/clients/` | `src/clients/` | Twitter/LinkedIn API 客户端 |
| `src/agents/verify-links/` | `src/tools/extract-content.ts` | URL 内容提取（改造为工具） |
| `src/agents/upload-post/` | `src/tools/publish-post.ts` | 发布到平台（改造为工具） |
| `src/agents/llm.ts` | `src/utils/llm.ts` | LLM 工厂（DashScope） |
| `src/agents/types.ts` | `src/utils/types.ts` | 共享类型 |
| `src/agents/utils.ts` | `src/utils/` | 工具函数（按需） |

### 4.2 改造说明

- **verify-links 子图 → extract-content 工具**：提取核心逻辑，封装为 `@tool` 装饰器格式
- **upload-post 子图 → publish-post 工具**：同上
- **human-node → interruptOn**：使用 deepagentsjs 内置的中断机制，不再手写

---

## 5. 实施计划

### Phase 1: 项目基础设施

**目标**：搭建项目骨架，集成 deepagentsjs

**任务**：
- [ ] 更新 package.json 依赖（deepagentsjs, tavily, dashscope）
- [ ] 创建 AGENTS.md（品牌声音）
- [ ] 创建 subagents.yaml（researcher 定义）
- [ ] 创建 skills/blog-post/SKILL.md
- [ ] 创建 skills/social-media/SKILL.md
- [ ] 创建基础 src/agent.ts（createDeepAgent 入口）

### Phase 2: 复制并改造 social-media-agent 代码

**目标**：复用现有能力

**任务**：
- [ ] 复制 src/clients/（Twitter/LinkedIn）
- [ ] 复制并改造 verify-links → extract-content 工具
- [ ] 复制并改造 upload-post → publish-post 工具
- [ ] 复制 llm.ts、types.ts、工具函数

### Phase 3: 实现自定义工具

**目标**：补充新能力

**任务**：
- [ ] 实现 web-search.ts（Tavily）
- [ ] 实现 generate-image.ts（通义万象）
- [ ] 集成工具到 agent.ts

### Phase 4: 完善 Skills 和 Subagents

**目标**：定义完整的工作流

**任务**：
- [ ] 完善 blog-post/SKILL.md（研究 → 写作 → 配图流程）
- [ ] 完善 social-media/SKILL.md（LinkedIn/Twitter 格式指南）
- [ ] 配置 researcher 子代理（系统提示、工具）

### Phase 5: Human-in-the-loop 集成

**目标**：添加人工审核

**任务**：
- [ ] 配置 interruptOn（在内容生成后中断）
- [ ] 实现审核响应处理（accept/edit/ignore）
- [ ] 测试完整审核流程

### Phase 6: 测试和优化

**目标**：验证端到端流程

**任务**：
- [ ] 测试：主题 → 博客文章
- [ ] 测试：URL → LinkedIn 帖子
- [ ] 测试：URL → Twitter thread
- [ ] 测试：人工审核 → 发布
- [ ] 优化提示词和工作流

---

## 6. 关键文件模板

### 6.1 AGENTS.md（Memory）

```markdown
# Content Builder Agent

You are a content creator for a technology company...

## Brand Voice
- Professional but approachable
- Clear and direct
- Confident but not arrogant

## Writing Standards
1. Use active voice
2. Lead with value
3. One idea per paragraph

## Research Requirements
Before writing, use the researcher subagent to gather information.
```

### 6.2 subagents.yaml

```yaml
researcher:
  description: >
    Research topics before writing. Use web_search to find current information.
    Save findings to research/<slug>.md.
  model: qwen-max
  system_prompt: |
    You are a research assistant with access to web_search tool.
    1. Search for relevant information
    2. Gather 3-5 credible sources
    3. Save findings to the specified file path
  tools:
    - web_search
```

### 6.3 src/agent.ts（主入口）

```typescript
import { createDeepAgent } from "deepagentsjs";
import { FilesystemBackend } from "deepagentsjs/backends";
import { webSearchTool } from "./tools/web-search.js";
import { generateImageTool } from "./tools/generate-image.js";
import { extractContentTool } from "./tools/extract-content.js";
import { publishPostTool } from "./tools/publish-post.js";
import { loadSubagents } from "./utils/subagents.js";

export const agent = createDeepAgent({
  memory: ["./AGENTS.md"],
  skills: ["./skills/"],
  tools: [
    webSearchTool,
    generateImageTool,
    extractContentTool,
    publishPostTool,
  ],
  subagents: loadSubagents("./subagents.yaml"),
  backend: new FilesystemBackend({ rootDir: "./output" }),
  interruptOn: {
    // 在内容生成后，发布前中断等待人工审核
    publish_post: true,
  },
});
```

---

## 7. 依赖清单

```json
{
  "dependencies": {
    "deepagentsjs": "^1.6.0",
    "@langchain/core": "^0.3.49",
    "@langchain/langgraph": "^0.2.0",
    "@tavily/core": "^0.1.0",
    "@mendable/firecrawl-js": "^4.11.2",
    "dashscope": "^1.0.0",
    "yaml": "^2.3.0",
    "zod": "^3.24.2"
  }
}
```

---

## 8. 验收标准

### 功能验收

- [ ] 输入主题 → 输出博客文章 + 封面图
- [ ] 输入 URL → 输出 LinkedIn 帖子 + 配图
- [ ] 输入 URL → 输出 Twitter thread + 配图
- [ ] 人工审核流程正常工作
- [ ] 可选发布到 Twitter/LinkedIn

### 质量验收

- [ ] 所有工具有完整的 TypeScript 类型
- [ ] 核心流程有单元测试
- [ ] README 文档完整

---

**计划确认后，开始 Phase 1 实施。**
