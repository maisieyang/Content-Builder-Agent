# Architecture Documentation

This document describes the architecture of Content Builder Agent, a creative content writing system built on the deepagents framework.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [System Architecture](#system-architecture)
- [Component Details](#component-details)
- [Data Flow](#data-flow)
- [Design Decisions](#design-decisions)

---

## Overview

Content Builder Agent is a multi-agent system designed to help individual creators produce high-quality content for blogs and social media platforms.

### Key Characteristics

| Aspect | Description |
|--------|-------------|
| **Framework** | deepagents (LangGraph-based) |
| **LLM Provider** | DashScope (Qwen models) |
| **Architecture** | Orchestrator + Specialized SubAgents |
| **Configuration** | File-based (AGENTS.md, SKILL.md) |
| **Output** | Filesystem-based content storage |

---

## Core Concepts

### 1. deepagents Framework

The agent is built using `createDeepAgent()` from deepagents, which provides:

```typescript
createDeepAgent({
  model,        // LLM instance
  memory,       // AGENTS.md files → system prompt
  skills,       // SKILL.md files → on-demand workflows
  tools,        // Available tool functions
  subagents,    // Specialized child agents
  backend,      // Filesystem for content storage
});
```

### 2. Memory (AGENTS.md)

The `memory` parameter loads markdown files into the system prompt, establishing:

- Brand voice and tone
- Creative philosophy
- Available tools and subagents
- Output conventions

```
memory: ["./AGENTS.md"]
     │
     ▼
┌─────────────────────────────────┐
│  System Prompt                  │
│  ─────────────────────────────  │
│  You are a creative assistant   │
│  helping individual content     │
│  creators...                    │
└─────────────────────────────────┘
```

### 3. Skills (SKILL.md)

Skills are detailed workflows loaded on-demand when the agent identifies a matching task:

```
skills/
├── blog-post/SKILL.md      # Triggered by: "write a blog post..."
└── social-media/SKILL.md   # Triggered by: "create a LinkedIn post..."
```

Each SKILL.md contains:
- Step-by-step workflow
- Templates and examples
- Quality checklists
- Tool usage patterns

### 4. SubAgents

SubAgents are specialized agents that handle delegated tasks:

```
Main Agent (Orchestrator)
     │
     ├── researcher    → Deep research with web search
     │
     └── editor        → Content review and feedback
```

SubAgents are defined as TypeScript modules for type safety:

```typescript
// src/subagents/researcher.ts
export const researcherSubAgent: SubAgent = {
  name: "researcher",
  description: "...",
  systemPrompt: "...",
  tools: [webSearchTool],
};
```

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│                   (CLI / LangGraph Studio)                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Content Builder Agent                        │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Main Agent (Orchestrator)              │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐       │  │
│  │  │  AGENTS.md  │  │  SKILL.md   │  │   Tools     │       │  │
│  │  │  (Memory)   │  │  (Workflows)│  │             │       │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘       │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                   │
│  ┌─────────────────────┐       ┌─────────────────────┐          │
│  │  Researcher SubAgent│       │   Editor SubAgent   │          │
│  │  ┌───────────────┐  │       │  ┌───────────────┐  │          │
│  │  │  web_search   │  │       │  │   read_file   │  │          │
│  │  │  write_file   │  │       │  │   (built-in)  │  │          │
│  │  └───────────────┘  │       │  └───────────────┘  │          │
│  └─────────────────────┘       └─────────────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     External Services                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  DashScope  │  │   Tavily    │  │  Twitter / LinkedIn     │  │
│  │  (LLM+Image)│  │  (Search)   │  │  (Publishing)           │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Filesystem Backend                           │
│                                                                  │
│  output/                                                         │
│  ├── blogs/<slug>/post.md, hero.png                             │
│  ├── linkedin/<slug>/post.md, image.png                         │
│  ├── tweets/<slug>/thread.md, image.png                         │
│  └── research/<slug>.md                                          │
└─────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
src/
├── agent.ts                 # createContentBuilderAgent()
│   │
│   ├── imports tools/       # Tool definitions
│   │   ├── web-search.ts
│   │   ├── generate-image.ts
│   │   └── publish-post.ts
│   │
│   ├── imports subagents/   # SubAgent definitions
│   │   ├── researcher.ts
│   │   └── editor.ts
│   │
│   └── imports utils/       # Utilities
│       └── env.ts           # Environment validation
│
└── index.ts                 # CLI entry point
```

---

## Component Details

### Main Agent (`src/agent.ts`)

The main agent is configured with:

```typescript
export function createContentBuilderAgent() {
  const llm = createDashScopeLLM();

  return createDeepAgent({
    model: llm,
    memory: ["./AGENTS.md"],
    skills: ["./skills/"],
    tools: [webSearchTool, generateImageTool, publishPostTool],
    subagents: [researcherSubAgent, editorSubAgent],
    backend: new FilesystemBackend({
      rootDir: resolve(PROJECT_ROOT, "output"),
      virtualMode: true,
    }),
  });
}
```

### Researcher SubAgent (`src/subagents/researcher.ts`)

**Purpose**: Gather information from the web

**Capabilities**:
- Strategic web searches (2-3 targeted queries)
- Source citation
- Structured output format

**Tools**: `web_search`, `write_file` (built-in)

**Usage Pattern**:
```
Main Agent → "Research AI agents and save to research/ai-agents.md"
                                    │
                                    ▼
                            Researcher SubAgent
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                      web_search(...)   write_file(...)
                            │               │
                            └───────┬───────┘
                                    ▼
                          research/ai-agents.md
```

### Editor SubAgent (`src/subagents/editor.ts`)

**Purpose**: Review content and provide feedback

**Capabilities**:
- Hook & opening analysis
- Structure & flow review
- Clarity assessment
- Platform-specific optimization

**Tools**: `read_file` (built-in)

**Usage Pattern**:
```
Main Agent → "Review blogs/ai-agents/draft.md"
                          │
                          ▼
                   Editor SubAgent
                          │
                          ▼
                   read_file(path)
                          │
                          ▼
               Structured feedback:
               - What works well
               - Suggested improvements
               - Priority actions
```

### Tools

#### web_search

```typescript
webSearchTool({
  query: "AI agents 2024 trends",
  maxResults: 5
})
// Returns: { query, answer, results: [{title, url, content, score}] }
```

#### generate_image

```typescript
generateImageTool({
  prompt: "Isometric illustration of AI agents...",
  outputPath: "blogs/ai-agents/hero.png"
})
// Returns: { success, prompt, outputPath, imageUrl }
```

#### publish_post

```typescript
publishPostTool({
  platform: "linkedin",  // or "twitter"
  content: "...",
  imagePath: "linkedin/post/image.png"  // optional
})
// Returns: { platform, success, postId, postUrl }
```

---

## Data Flow

### Blog Post Creation Flow

```
1. User: "Write a blog post about AI agents"
                    │
                    ▼
2. Main Agent identifies task type
   → Loads blog-post skill
                    │
                    ▼
3. Main Agent delegates research
   → researcher: "Research AI agents, save to research/ai-agents.md"
                    │
                    ▼
4. Researcher performs web searches
   → web_search("AI agents overview")
   → web_search("AI agents 2024 trends")
   → write_file("research/ai-agents.md", findings)
                    │
                    ▼
5. Main Agent writes draft
   → write_file("blogs/ai-agents/draft.md", content)
                    │
                    ▼
6. Main Agent requests review
   → editor: "Review blogs/ai-agents/draft.md"
                    │
                    ▼
7. Editor provides feedback
   → Structured critique and suggestions
                    │
                    ▼
8. Main Agent revises
   → write_file("blogs/ai-agents/post.md", revised)
                    │
                    ▼
9. Main Agent generates image
   → generate_image(prompt, "blogs/ai-agents/hero.png")
                    │
                    ▼
10. Complete
    → blogs/ai-agents/post.md
    → blogs/ai-agents/hero.png
```

### State Management

The agent uses LangGraph's state management:

```typescript
interface AgentState {
  messages: Message[];      // Conversation history
  files: FileMap;           // Virtual filesystem
  todos: Todo[];            // Task tracking (built-in)
}
```

Files are managed through the `FilesystemBackend`:
- `virtualMode: true` - Files exist in state until explicitly saved
- `rootDir: "output"` - All paths relative to output directory

---

## Design Decisions

### 1. TypeScript SubAgents vs YAML Configuration

**Decision**: Define SubAgents in TypeScript, not YAML

**Rationale**:
- Type safety for tool references
- IDE autocompletion and error checking
- Easier refactoring
- Tools are code, so subagents should be too

**Before (YAML)**:
```yaml
researcher:
  tools:
    - web_search  # String reference, no type checking
```

**After (TypeScript)**:
```typescript
const researcherSubAgent: SubAgent = {
  tools: [webSearchTool],  // Direct reference, type-checked
};
```

### 2. No Human-in-the-Loop (HITL)

**Decision**: Remove `interruptOn` configuration

**Rationale**:
- Content creation is an exploratory, creative process
- HITL interrupts creative flow
- Output is reversible (can delete/edit posts)
- Target users are individual creators, not enterprises

**When HITL makes sense**:
- Irreversible operations (financial transactions)
- External impact (production deployments)
- High-stakes environments (enterprise accounts)

### 3. File-based Configuration

**Decision**: Use markdown files for memory and skills

**Rationale**:
- Easy to edit without code changes
- Version-controllable
- Readable by non-developers
- Natural documentation

### 4. Centralized Environment Validation

**Decision**: Create `src/utils/env.ts` for environment handling

**Rationale**:
- Fail fast with clear error messages
- Consistent validation across tools
- Feature availability checking
- Debugging helpers (`logFeatureAvailability()`)

### 5. Orchestrator + Specialist Pattern

**Decision**: Main agent orchestrates, subagents specialize

**Rationale**:
- Separation of concerns
- Each agent has focused context
- Parallel execution possible
- Easier to test and debug

```
Main Agent (Generalist)
├── Knows overall workflow
├── Makes high-level decisions
└── Delegates specialized tasks

SubAgents (Specialists)
├── researcher: Optimized for web search
└── editor: Optimized for content critique
```

---

## Future Considerations

### Potential Enhancements

1. **Additional SubAgents**
   - `seo-optimizer`: Keyword optimization
   - `fact-checker`: Verify claims against sources
   - `translator`: Multi-language support

2. **Backend Options**
   - Cloud storage backends (S3, GCS)
   - Database backends for metadata

3. **Skill Extensions**
   - Newsletter skill
   - Video script skill
   - Podcast notes skill

4. **Integration Points**
   - CMS publishing (WordPress, Ghost)
   - Email newsletter platforms
   - Content calendars

---

## References

- [deepagents Documentation](https://github.com/anthropics/deepagentsjs)
- [LangGraph Documentation](https://langchain-ai.github.io/langgraphjs/)
- [DashScope API Reference](https://help.aliyun.com/zh/model-studio/)
- [Tavily API Documentation](https://docs.tavily.com/)
