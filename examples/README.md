# 从 0 到 1 构建 Agent

基于第一性原理，逐步添加能力，理解每一层的本质。

## 核心认知

```
LLM 只知道 messages[] 里的内容

想让 LLM 知道 X → 把 X 放进 messages[]
```

## Agentic Loop

```
OpenAI API (原生)：
  你 → 发请求 → 模型返回 tool_calls → 你执行 → 你发结果 → 继续循环
       ↑                                                   ↓
       └───────────── 你自己写循环 ─────────────────────────┘

LangChain createAgent：
  你 → agent.invoke() → 内部自动循环 → 返回最终结果

  循环逻辑已封装，你只需要定义 model 和 tools
```

## 能力叠加路径

```
LLM → Agent → Tools → Memory → Files → Skills → SubAgents
      ↑        ↑       ↑        ↑       ↑         ↑
    循环     执行    身份     持久    知识      协作
```

## 示例列表

| 示例 | 核心问题 | 解决方案 |
|------|----------|----------|
| 00-api-native-loop | Agentic Loop 是什么？ | LangChain 封装了循环 |
| 01-minimal-agent | 最简 Agent 是什么？ | `createAgent({ model, tools: [] })` |
| 02-with-tools | 如何让 Agent 能做事？ | 添加 Tools |
| 03-with-memory | 如何保持身份？ | Middleware 注入 system prompt |
| 04-with-files | 如何持久化？ | read_file / write_file 工具 |
| 05-with-skills | 如何复用知识？ | Progressive Disclosure |
| 06-with-subagents | 如何专业分工？ | 独立 Agent + 上下文隔离 |

## 运行

```bash
npx tsx examples/00-api-native-loop.ts
npx tsx examples/01-minimal-agent.ts
npx tsx examples/02-with-tools.ts
npx tsx examples/03-with-memory.ts
npx tsx examples/04-with-files.ts
npx tsx examples/05-with-skills.ts
npx tsx examples/06-with-subagents.ts
```

## 第一性原理分析

### 00 - Agentic Loop

```
OpenAI API 没有内置循环
LangChain createAgent 封装了循环

你不用写 while，只需定义 tools
```

### 01 - 最简 Agent

```typescript
const agent = createAgent({
  model: createLLM(),
  tools: [],  // 没有工具 = 纯对话
});
```

### 02 - Tools

```
问题：Agent 只能说，不能做
解决：添加 Tools，让 Agent 调用外部能力

Tool = name + description + schema + execute
Agent 根据 description 决定何时使用
```

### 03 - Memory

```
问题：Agent 每次都是白板，没有身份
解决：把身份信息注入 system prompt

LLM 只知道 messages 里的内容
→ Memory 要放进 messages
→ System message 是最自然的位置
→ Middleware 在每次调用前注入
```

### 04 - Filesystem

```
问题：内容关掉就没了
解决：read_file / write_file 工具

Filesystem 的价值：
- 持久化：结果保存到磁盘
- 协作：多个 Agent 通过文件通信
- 上下文管理：大内容存文件，对话只传路径
```

### 05 - Skills

```
问题：Agent 需要很多"怎么做"的知识，全塞 prompt 会爆
解决：Progressive Disclosure（渐进式披露）

System Prompt 只放「目录」（name + description）
Agent 按需用 read_file 加载完整内容

Skill vs Memory：
- Memory: 始终加载，定义「我是谁」
- Skill:  按需加载，定义「怎么做某事」
```

### 06 - SubAgents

```
问题 1：上下文爆炸（所有步骤累积在 messages）
问题 2：需要独立视角（editor 不应知道谁写的）

解决：SubAgent = 独立的 Agent

- 独立的 messages（上下文隔离）
- 独立的 prompt 和 tools（专业分工）
- 只返回结果，不返回过程

SubAgent vs Tool：
- Tool: 简单函数，无状态
- SubAgent: 完整 Agent，有自己的推理循环
```

## 目录结构

```
examples/
├── 00-api-native-loop.ts   # 理解 Agentic Loop
├── 01-minimal-agent.ts     # 最简 Agent
├── 02-with-tools.ts        # + Tools
├── 03-with-memory.ts       # + Memory
├── 04-with-files.ts        # + Filesystem
├── 05-with-skills.ts       # + Skills
├── 06-with-subagents.ts    # + SubAgents
├── AGENTS.md               # 示例 Memory 文件
├── skills/                 # 示例 Skills
│   ├── write-blog.md
│   ├── write-twitter.md
│   └── code-review.md
├── output/                 # Agent 生成的文件
└── README.md               # 本文件
```

## 总结

```
每一层能力都在解决一个具体问题：

createAgent  → 不用写循环
Tools        → 能执行操作
Memory       → 有持久身份
Filesystem   → 能保存结果
Skills       → 能复用知识
SubAgents    → 能专业分工

理解本质，按需组合。
```
