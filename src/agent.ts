/**
 * Content Builder Agent - Main Entry Point
 *
 * A content writing agent for creating blog posts, LinkedIn posts, and tweets
 * with cover images included. Powered by deepagents framework.
 */

import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { resolve } from "path";

// Tools
import { webSearchTool } from "./tools/web-search.js";
import { generateImageTool } from "./tools/generate-image.js";
import { publishPostTool } from "./tools/publish-post.js";

// SubAgents
import { researcherSubAgent, editorSubAgent } from "./subagents/index.js";

// Utils
import { requireEnv, getEnv } from "./utils/index.js";

// Get project root directory
const PROJECT_ROOT = resolve(import.meta.dirname, "..");

/**
 * Create LLM configured for DashScope (Qwen)
 */
function createDashScopeLLM(modelName?: string) {
  const apiKey = requireEnv("DASHSCOPE_API_KEY", "LLM API calls");

  return new ChatOpenAI({
    model: modelName || getEnv("DEFAULT_LLM_MODEL", "qwen-max"),
    apiKey,
    configuration: {
      baseURL: getEnv(
        "DASHSCOPE_BASE_URL",
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
      ),
    },
  });
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
    tools: [webSearchTool, generateImageTool, publishPostTool],

    // Subagents for delegated tasks (type-safe TypeScript definitions)
    subagents: [researcherSubAgent, editorSubAgent],

    // Filesystem backend for saving outputs
    backend: new FilesystemBackend({
      rootDir: resolve(PROJECT_ROOT, "output"),
      virtualMode: true,
    }),

    // Human-in-the-loop: interrupt before publishing
    interruptOn: {
      publish_post: true,
    },
  });
}

// Export the agent instance for langgraph.json
export const agent: ReturnType<typeof createDeepAgent> =
  createContentBuilderAgent();
