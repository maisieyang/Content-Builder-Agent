/**
 * Content Builder Agent - CLI Entry Point
 *
 * A creative content writing agent for individual creators.
 * Helps create blog posts, LinkedIn posts, and tweets with images.
 *
 * Usage:
 *   npm run dev "Write a blog post about AI agents"
 *   npm run dev "Create a LinkedIn post about prompt engineering"
 */

import "dotenv/config";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { resolve } from "path";
import { readFileSync } from "fs";
import YAML from "yaml";

// Tools
import { webSearchTool } from "./tools/web-search.js";
import { generateImageTool } from "./tools/generate-image.js";
import { publishPostTool } from "./tools/publish-post.js";

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
 * Load subagents from YAML config
 */
function loadSubagents() {
  const content = readFileSync(resolve(PROJECT_ROOT, "subagents.yaml"), "utf-8");
  const config = YAML.parse(content);

  const availableTools: Record<string, typeof webSearchTool> = {
    web_search: webSearchTool,
  };

  return Object.entries(config).map(([name, spec]) => {
    const s = spec as {
      description: string;
      system_prompt: string;
      model?: string;
      tools?: string[];
    };
    return {
      name,
      description: s.description,
      systemPrompt: s.system_prompt,
      model: s.model ? createDashScopeLLM(s.model) : undefined,
      tools: s.tools
        ?.map((t) => availableTools[t])
        .filter((t): t is typeof webSearchTool => t !== undefined),
    };
  });
}

/**
 * Main function
 */
async function main() {
  const task =
    process.argv.slice(2).join(" ") || "Write a blog post about AI agents";

  console.log("\n📝 Content Builder Agent");
  console.log(`Task: ${task}\n`);

  const llm = createDashScopeLLM();

  const agent = createDeepAgent({
    model: llm,
    memory: ["./AGENTS.md"],
    skills: ["./skills/"],
    tools: [webSearchTool, generateImageTool, publishPostTool],
    subagents: loadSubagents(),
    backend: new FilesystemBackend({
      rootDir: resolve(PROJECT_ROOT, "output"),
      virtualMode: false,
    }),
  });

  const config = {
    recursionLimit: 100,
  };

  try {
    console.log("🚀 Starting agent...\n");
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: task }],
      },
      config
    );

    console.log("\n✅ Done!");
    console.log(`Total messages: ${result.messages.length}`);

    // Show final summary
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage && "content" in lastMessage) {
      console.log("\n📄 Final Response:");
      console.log("-".repeat(40));
      const content =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
      console.log(content.slice(0, 500) + (content.length > 500 ? "..." : ""));
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
