# Content Builder Agent

A content writing agent for creating blog posts, LinkedIn posts, and tweets with cover images included. Powered by [deepagents](https://github.com/langchain-ai/deepagentsjs) framework.

## Features

- **Multi-input support**: Topic descriptions, URL links, or local files
- **Multi-output formats**: Blog posts, LinkedIn posts, Twitter threads
- **AI image generation**: Cover images via Tongyi Wanxiang
- **Research capability**: Web search via Tavily
- **Human-in-the-loop**: Review before publishing
- **Memory system**: Brand voice via AGENTS.md
- **Skills-based workflows**: Specialized workflows for each content type

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your API keys

# Run with a task
npm run dev "Write a blog post about AI agents"
npm run dev "Create a LinkedIn post about prompt engineering"

# Or start LangGraph Studio
npm run langgraph:dev
```

## Architecture

```
content-builder-agent/
├── AGENTS.md                    # Memory: Brand voice & writing standards
├── subagents.yaml               # Subagent definitions (researcher)
├── skills/
│   ├── blog-post/SKILL.md       # Blog writing workflow
│   └── social-media/SKILL.md    # Social media workflow
├── src/
│   ├── agent.ts                 # Main entry: createDeepAgent
│   ├── tools/
│   │   ├── web-search.ts        # Tavily search
│   │   ├── generate-image.ts    # Tongyi Wanxiang
│   │   ├── extract-content.ts   # URL content extraction
│   │   └── publish-post.ts      # Social media publishing
│   └── index.ts                 # CLI entry point
├── output/                      # Generated content
│   ├── blogs/
│   ├── linkedin/
│   ├── tweets/
│   └── research/
└── langgraph.json               # LangGraph configuration
```

## How It Works

The agent is configured by files on disk, not code:

| File | Purpose | When Loaded |
|------|---------|-------------|
| `AGENTS.md` | Brand voice, tone, writing standards | Always (system prompt) |
| `subagents.yaml` | Research and other delegated tasks | Always (defines `task` tool) |
| `skills/*/SKILL.md` | Content-specific workflows | On demand |

**Flow:**
1. Agent receives task → identifies input type (topic/URL/file)
2. If topic: delegates research to `researcher` subagent
3. If URL: extracts content using `extract_content` tool
4. Loads relevant skill (blog-post or social-media)
5. Writes content following skill workflow
6. Generates cover image with Tongyi Wanxiang
7. Human review (interrupt)
8. Optional: publish to platform

## Output

```
output/
├── blogs/
│   └── ai-agents/
│       ├── post.md       # Blog content
│       └── hero.png      # Generated cover image
├── linkedin/
│   └── prompt-engineering/
│       ├── post.md       # Post content
│       └── image.png     # Generated image
├── tweets/
│   └── future-of-coding/
│       ├── thread.md     # Thread content
│       └── image.png     # Generated image
└── research/
    └── ai-agents.md      # Research notes
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DASHSCOPE_API_KEY` | Yes | LLM + Image generation |
| `TAVILY_API_KEY` | Yes | Web search |
| `LANGSMITH_API_KEY` | No | Observability |
| `FIRECRAWL_API_KEY` | No | Content extraction |
| `TWITTER_*` | No | Twitter publishing |
| `LINKEDIN_*` | No | LinkedIn publishing |

## Development

```bash
# Build
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Related

- [deepagentsjs](https://github.com/langchain-ai/deepagentsjs) - The underlying framework
- [social-media-agent-from-scratch](../social-media-agent-from-scratch) - Original social media agent (code reused)
