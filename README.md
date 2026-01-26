# Content Builder Agent

Content Builder Agent 2.0 - powered by Deep Agents framework.

## Features

- Blog post generation with research capabilities
- Social media content creation
- Memory system (brand voice via AGENTS.md)
- Skills-based workflow selection
- Human-in-the-loop review

## Architecture

Based on [deepagents](https://github.com/anthropics/deepagents) framework.

```
src/
├── agents/
│   └── content-builder/     # Main deep agent
├── prompts/
│   └── AGENTS.md            # Brand voice & memory
├── skills/
│   ├── blog-post/           # Blog writing skill
│   └── social-media/        # Social media skill
├── tools/                   # Domain tools
└── shared/                  # Shared utilities
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Run
npm run dev
```

## Related

- [Social Media Agent v1.0](../social-media-agent-from-scratch) - LangGraph-based predecessor
