# Content Builder Agent

A creative content writing agent for individual creators. Generates blog posts, LinkedIn posts, and Twitter threads with AI-powered research, writing, and image generation.

Built with [deepagents](https://github.com/anthropics/deepagentsjs) framework.

## Philosophy

This agent is designed to **amplify creators' ideas**, not replace them. It embraces:

- **Creative autonomy** - No approval gates interrupting the flow
- **Iterative refinement** - Research → Draft → Review → Revise cycles
- **Platform-native content** - Optimized for each platform's format and tone

## Features

| Feature | Description |
|---------|-------------|
| **Multi-format output** | Blog posts, LinkedIn posts, Twitter threads |
| **Research capability** | Web search via Tavily for current information |
| **Content review** | Built-in editor subagent for quality feedback |
| **AI image generation** | Cover images via Tongyi Wanxiang |
| **Skills-based workflows** | Detailed guides for each content type |
| **Brand memory** | Consistent voice via AGENTS.md |

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys (see Environment Variables below)

# Run the agent
npm run dev "Write a blog post about AI agents"
npm run dev "Create a LinkedIn post about prompt engineering"

# Or start LangGraph Studio
npm run langgraph:dev
```

## Project Structure

```
content-builder-agent/
├── AGENTS.md                    # Brand voice & creative philosophy
├── skills/
│   ├── blog-post/SKILL.md       # 7-step blog writing workflow
│   └── social-media/SKILL.md    # LinkedIn & Twitter guides
├── src/
│   ├── agent.ts                 # Main agent configuration
│   ├── subagents/
│   │   ├── researcher.ts        # Web research specialist
│   │   └── editor.ts            # Content review & feedback
│   ├── tools/
│   │   ├── web-search.ts        # Tavily integration
│   │   ├── generate-image.ts    # Tongyi Wanxiang integration
│   │   └── publish-post.ts      # Social media publishing
│   └── utils/
│       └── env.ts               # Environment validation
├── output/                      # Generated content
└── langgraph.json               # LangGraph configuration
```

## How It Works

### Configuration Files

| File | Purpose |
|------|---------|
| `AGENTS.md` | Brand voice, tone, creative philosophy (loaded into system prompt) |
| `skills/*/SKILL.md` | Content-specific workflows with templates and checklists |
| `src/subagents/*.ts` | Specialized agents for research and editing |

### Content Creation Flow

```
User Request
     │
     ▼
┌─────────────────┐
│  Main Agent     │ ← AGENTS.md (brand voice)
│  (Orchestrator) │ ← Skills (workflows)
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌────────┐
│Researcher│  │ Editor │
│(research)│  │(review)│
└────────┘  └────────┘
         │
         ▼
┌─────────────────┐
│  Final Content  │
│  + Cover Image  │
└─────────────────┘
```

### SubAgents

| SubAgent | Role | Tools |
|----------|------|-------|
| `researcher` | Gathers information, statistics, and sources | `web_search` |
| `editor` | Reviews content, provides actionable feedback | `read_file` |

### Available Tools

| Tool | Description |
|------|-------------|
| `web_search` | Search the web via Tavily |
| `generate_image` | Create images via Tongyi Wanxiang |
| `publish_post` | Publish to Twitter or LinkedIn |
| `write_file` | Save content to filesystem (built-in) |
| `read_file` | Read files (built-in) |

## Output Structure

```
output/
├── blogs/
│   └── <slug>/
│       ├── post.md          # Final blog post
│       └── hero.png         # Cover image
├── linkedin/
│   └── <slug>/
│       ├── post.md          # LinkedIn post
│       └── image.png        # Social image
├── tweets/
│   └── <slug>/
│       ├── thread.md        # Twitter thread
│       └── image.png        # Social image
└── research/
    └── <slug>.md            # Research notes
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DASHSCOPE_API_KEY` | **Yes** | LLM (Qwen) + Image generation |
| `TAVILY_API_KEY` | For search | Web search capability |
| `TWITTER_API_KEY` | For publishing | Twitter API credentials |
| `TWITTER_API_SECRET` | For publishing | |
| `TWITTER_ACCESS_TOKEN` | For publishing | |
| `TWITTER_ACCESS_SECRET` | For publishing | |
| `LINKEDIN_ACCESS_TOKEN` | For publishing | LinkedIn API token |
| `LANGSMITH_API_KEY` | Optional | LangSmith observability |

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Run E2E tests
npm run test:e2e

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
```

## Architecture Deep Dive

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture documentation.

## Related

- [deepagentsjs](https://github.com/anthropics/deepagentsjs) - The underlying agent framework
