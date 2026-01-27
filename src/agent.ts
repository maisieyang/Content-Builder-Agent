/**
 * Content Builder Agent - Main Entry Point
 *
 * A content writing agent for creating blog posts, LinkedIn posts, and tweets
 * with cover images included. Powered by deepagents framework.
 */

import "dotenv/config";
import { createDeepAgent, FilesystemBackend, type SubAgent } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { readFileSync } from "fs";
import { resolve } from "path";
import YAML from "yaml";

// Tools
import { webSearchTool } from "./tools/web-search.js";
import { generateImageTool } from "./tools/generate-image.js";
import { publishPostTool } from "./tools/publish-post.js";

// Get project root directory
const PROJECT_ROOT = resolve(import.meta.dirname, "..");

/**
 * Create LLM configured for DashScope (Qwen)
 */
function createDashScopeLLM(modelName?: string) {
  return new ChatOpenAI({
    model: modelName || process.env.DEFAULT_LLM_MODEL || "qwen-max",
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
      baseURL:
        process.env.DASHSCOPE_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
  });
}

/**
 * Load subagent definitions from YAML and wire up tools
 */
function loadSubagents(configPath: string): SubAgent[] {
  const availableTools: Record<string, unknown> = {
    web_search: webSearchTool,
  };

  const content = readFileSync(resolve(PROJECT_ROOT, configPath), "utf-8");
  const config = YAML.parse(content);

  const subagents: SubAgent[] = [];
  for (const [name, spec] of Object.entries(config)) {
    const s = spec as {
      description: string;
      system_prompt: string;
      model?: string;
      tools?: string[];
    };

    const subagent: SubAgent = {
      name,
      description: s.description,
      systemPrompt: s.system_prompt,
    };

    // Create LLM instance for subagent if model specified
    if (s.model) {
      subagent.model = createDashScopeLLM(s.model);
    }

    if (s.tools) {
      subagent.tools = s.tools.map((t) => availableTools[t] as never);
    }

    subagents.push(subagent);
  }

  return subagents;
}

/**
 * Create the Content Builder Agent
 *
 * @returns A DeepAgent configured for content creation tasks
 */
export function createContentBuilderAgent(): ReturnType<typeof createDeepAgent> {
  // Create main LLM
  const llm = createDashScopeLLM();

  return createDeepAgent({
    // LLM model
    model: llm,

    // Memory: brand voice and writing standards
    memory: ["./AGENTS.md"],

    // Skills: blog-post and social-media workflows
    skills: ["./skills/"],

    // Tools available to the agent
    tools: [
      webSearchTool,
      generateImageTool,
      publishPostTool,
    ],

    // Subagents for delegated tasks
    subagents: loadSubagents("subagents.yaml"),

    // Filesystem backend for saving outputs
    backend: new FilesystemBackend({
      rootDir: resolve(PROJECT_ROOT, "output"),
      virtualMode: true,
    }),

  });
}

// Export the agent instance for langgraph.json
export const agent: ReturnType<typeof createDeepAgent> =
  createContentBuilderAgent();
