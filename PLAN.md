# 扩展计划：Social Media Agent → Content Builder Agent（Deep Agents 方案）

> 目标：**不重复造轮子**，直接使用 `deepagents` 提供的 plan / subagent / filesystem 能力。
> 参照：`/Users/yangxiyue/2026/aa/deepagentsjs/examples/research/research-agent.ts`

---

## 1. 现有架构分析

### 1.1 当前 Social Media Agent 结构

```
src/agents/
├── generate-post/          # 核心：帖子生成图
│   ├── graph.ts            # StateGraph 定义
│   ├── state.ts            # GeneratePostAnnotation
│   ├── constants.ts
│   ├── nodes/              # 14 个节点
│   │   ├── generate-report.ts
│   │   ├── generate-post.ts
│   │   ├── condense-post.ts
│   │   ├── human-node.ts
│   │   ├── rewrite-post.ts
│   │   └── ...
│   └── prompts/            # 提示词
│       ├── index.ts        # BUSINESS_CONTEXT, POST_STRUCTURE_INSTRUCTIONS...
│       └── examples.ts
├── curate-data/            # 数据收集
├── verify-links/           # 链接验证
├── upload-post/            # 发布
├── find-images/            # 图片提取
├── supervisor/             # 批量编排（placeholder）
├── llm.ts                  # DashScope/Qwen 模型工厂
├── types.ts                # 共享类型
└── utils.ts                # 工具函数
```

### 1.2 当前优势（可复用）

| 组件 | 说明 | 复用方式 |
|------|------|---------|
| `generate-post` 流程 | 链接验证→报告生成→帖子生成→人工审核→发布 | 作为 social-media 输出通道 |
| Human-in-the-loop | accept/edit/ignore/respond | 通用审核流程 |
| LLM 工厂 | DashScope (Qwen) | 继续使用 |
| Prompts 系统 | 结构化提示词 | 扩展适配不同内容类型 |
| URL 去重 | LangGraph Store | 继续使用 |

### 1.3 需要扩展的能力（Deep Agents 已内建）

| 能力 | 说明 | 对应 deepagents 方式 |
|------|------|---------------------|
| **Memory 系统** | `AGENTS.md` 品牌声音 | 作为系统提示词的一部分加载 |
| **Skills 系统** | 按需加载工作流 | 通过 `systemPrompt` + 规则化 Skill 文档驱动 |
| **Researcher 子代理** | 独立研究节点 | `SubAgent`（参考 research 示例） |
| **Plan 工具** | 任务拆解/追踪 | deepagents 内置 `write_todos` |
| **Filesystem** | 读写结果 | deepagents 内置文件工具 |
| **长文内容生成** | 博客文章 | 子代理/主代理写入文件 |
| **图片生成** | 封面图、社交图 | 领域工具（自定义） |

---

## 2. 扩展架构设计（Deep Agents 版）

### 2.1 新增目录结构（以深度代理为核心）

```
src/
├── agents/
│   ├── generate-post/          # 现有（不变）
│   ├── content-builder/        # 新增：deepagents 入口
│   │   ├── agent.ts            # createDeepAgent
│   │   ├── prompts/
│   │   │   ├── system.md        # 主系统提示词
│   │   │   └── skills.md        # 技能索引与调用规则
│   │   └── subagents/
│   │       ├── research.ts      # SubAgent: research-agent
│   │       └── critique.ts      # SubAgent: critique-agent（可选）
│   └── shared/
│       └── memory-loader.ts    # 读取 prompts/AGENTS.md
├── prompts/
│   └── AGENTS.md               # 品牌声音
├── skills/
│   ├── blog-post/
│   │   └── SKILL.md
│   └── social-media/
│       └── SKILL.md
└── tools/
    ├── web-search.ts           # 领域工具（搜索）
    └── generate-image.ts       # 领域工具（图片生成）
```

### 2.2 关键思想（对齐 deepagents）

- **不再手写 Graph**：用 `createDeepAgent` 统一承载 plan/subagent/filesystem。
- **systemPrompt 承载流程**：把“识别任务 → 选择 skill → 研究 → 写作 → 人工审核”写进系统提示词。
- **SubAgents 专注子任务**：研究/批评/编辑分别用 `SubAgent`，可并行调用。
- **文件输出统一通过内建 filesystem**：直接写 `output/...`，不再自建 read/write 工具。

---

## 3. 详细实现计划（Deep Agents 版）

### Phase 1: Memory + Skills 基础设施 (2 小时)

#### 3.1.1 创建 prompts/AGENTS.md

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
...
```

#### 3.1.2 创建 skills/ 目录

**skills/blog-post/SKILL.md**
```markdown
---
name: blog-post
description: Use this skill when writing long-form blog posts...
---
# Blog Post Writing Skill
...
```

**skills/social-media/SKILL.md**
```markdown
---
name: social-media
description: Use this skill when creating short-form social media content...
---
# Social Media Content Skill
...
```

#### 3.1.3 memory-loader（仅用于拼接系统提示词）

```typescript
import { readFile } from "fs/promises";
import { resolve } from "path";

export async function loadMemory(): Promise<string> {
  const path = resolve(process.cwd(), "prompts/AGENTS.md");
  return await readFile(path, "utf-8");
}
```

---

### Phase 2: Deep Agent 主入口 (3 小时)

#### 3.2.1 新增 src/agents/content-builder/agent.ts

参考 `deepagentsjs/examples/research/research-agent.ts`，核心结构：

```typescript
import { createDeepAgent, type SubAgent } from "deepagents";
import { ChatAnthropic } from "@langchain/anthropic";
import { webSearchTool } from "../../tools/web-search.js";
import { generateCoverTool } from "../../tools/generate-image.js";

const systemPrompt = `...`;

const researchSubAgent: SubAgent = {
  name: "research-agent",
  description: "...",
  systemPrompt: `...`,
  tools: [webSearchTool],
};

const critiqueSubAgent: SubAgent = {
  name: "critique-agent",
  description: "...",
  systemPrompt: `...`,
};

export const agent = createDeepAgent({
  model: new ChatAnthropic({ model: "claude-sonnet-4-20250514", temperature: 0 }),
  tools: [webSearchTool, generateCoverTool],
  systemPrompt,
  subagents: [researchSubAgent, critiqueSubAgent],
});
```

#### 3.2.2 系统提示词策略（system.md）

系统提示词需要显式说明：
- 先根据用户请求选择 skill（blog-post / social-media）
- 若需要研究，调用 research-agent
- 产出结果写入文件，例如：
  - `output/blogs/<slug>/post.md`
  - `output/social/<slug>/post.md`
- 可调用 critique-agent 做质量检查
- 使用 `write_todos` 进行计划分解（deepagents 内建）
- 语言必须与用户输入一致

#### 3.2.3 Skill 文档加载策略

- 把 skills 内容拼入 `systemPrompt` 的“Available Skills”区块
- 统一由主 agent 决策；不再手写 skill-loader 节点

---

### Phase 3: 复用 generate-post (2 小时)

- 对于 `social-media`，继续复用现有 `generate-post` 图：
  - 作为独立入口保留
  - deepagent 输出最终内容后，可交由既有 human-review 节点流程（或由 deepagent 直接写文件）

---

### Phase 4: 领域工具实现 (2 小时)

#### 3.4.1 web-search

```typescript
export const webSearchTool = tool(
  async ({ query, maxResults = 5 }) => {
    // 复用现有的 Firecrawl 实现
  },
  { name: "internet_search", ... }
);
```

#### 3.4.2 generate-image

保留通义万象实现（仅作为**领域工具**），不负责文件系统能力（由 deepagents 内建工具完成读写）。

---

### Phase 5: langgraph.json 更新 (15 分钟)

```json
{
  "graphs": {
    "generate_post": "./src/agents/generate-post/graph.ts:generatePostGraph",
    "content_builder": "./src/agents/content-builder/agent.ts:agent"
  }
}
```

---

## 4. 实现顺序总结

| Phase | 内容 | 时间 | 依赖 |
|-------|------|------|------|
| 1 | Memory + Skills 基础设施 | 2h | 无 |
| 2 | Deep Agent 主入口 | 3h | Phase 1 |
| 3 | 复用 generate-post | 2h | Phase 2 |
| 4 | 领域工具实现（搜索 + 图片） | 2h | 无 |
| 5 | 集成测试 + langgraph.json 更新 | 1h | Phase 1-4 |

**总计**: ~10 小时

---

## 5. 技术选型确认 ✅

| 问题 | 决策 |
|------|------|
| **核心框架** | 直接使用 `deepagents`（不再手写 Graph） |
| **研究子代理 LLM** | 使用当前 Qwen (DashScope) 或默认模型 |
| **图片生成** | 通义万象 `wanx2.1-t2i-turbo`（同一 DashScope API Key） |
| **社交媒体 Skill** | 复用现有 `generate-post` 图 |
| **Human Review** | 博客也需要人工审核 |
| **输出存储** | deepagents 内建文件系统工具 |

---

## 6. 与原有代码的兼容性

| 现有组件 | 处理方式 |
|---------|---------|
| `generate-post` 图 | 保持不变，作为 social-media 输出通道 |
| `prompts/index.ts` | 保持不变，博客生成用新的 prompts |
| `llm.ts` | 保持不变，全局复用 |
| `types.ts` | 可选扩展，增加博客相关类型 |
| Human Review 流程 | 复用现有流程或由 deepagent 直接落盘 |

---

请审阅此计划，确认后我开始实现。
