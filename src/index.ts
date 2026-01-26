/**
 * Content Builder Agent - CLI Entry Point
 *
 * A content writing agent for creating blog posts, LinkedIn posts, and tweets
 * with cover images included. Includes Human-in-the-Loop (HITL) for review
 * before publishing.
 *
 * Usage:
 *   npm run dev "Write a blog post about AI agents"
 *   npm run dev "Create a LinkedIn post about prompt engineering"
 */

import "dotenv/config";
import * as readline from "readline";
import { MemorySaver, Command } from "@langchain/langgraph";
import { createContentBuilderAgent } from "./agent.js";

// Create a unique thread ID for this session
const threadId = `content-builder-${Date.now()}`;

// Create agent with checkpointer for HITL support
const checkpointer = new MemorySaver();

/**
 * Create a readline interface for user input
 */
function createReadlineInterface(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
async function prompt(question: string): Promise<string> {
  const rl = createReadlineInterface();
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Display HITL review request and get user decision
 */
async function handleHITLReview(interrupt: {
  value: {
    actionRequests: Array<{
      name: string;
      args: Record<string, unknown>;
    }>;
    reviewConfigs: Array<{
      actionName: string;
      allowedDecisions: string[];
    }>;
  };
}): Promise<Array<{ type: string; args?: Record<string, unknown> }>> {
  const { actionRequests, reviewConfigs } = interrupt.value;

  console.log("\n" + "=".repeat(60));
  console.log("🔍 HUMAN REVIEW REQUIRED");
  console.log("=".repeat(60));

  const decisions: Array<{ type: string; args?: Record<string, unknown> }> = [];

  for (let i = 0; i < actionRequests.length; i++) {
    const request = actionRequests[i];
    const config = reviewConfigs.find((rc) => rc.actionName === request.name);
    const allowedDecisions = config?.allowedDecisions || [
      "approve",
      "edit",
      "reject",
    ];

    console.log(`\n📋 Action ${i + 1}: ${request.name}`);
    console.log("-".repeat(40));

    // Display action details
    if (request.name === "publish_post") {
      const args = request.args as {
        platform?: string;
        content?: string;
        imagePath?: string;
      };
      console.log(`Platform: ${args.platform || "unknown"}`);
      console.log(`Content:\n${args.content || "(no content)"}`);
      if (args.imagePath) {
        console.log(`Image: ${args.imagePath}`);
      }
    } else {
      console.log(`Arguments: ${JSON.stringify(request.args, null, 2)}`);
    }

    console.log("\nAllowed decisions:", allowedDecisions.join(", "));

    // Get user decision
    let decision: string;
    while (true) {
      const input = await prompt(
        `\nYour decision (${allowedDecisions.join("/")}): `
      );
      const normalizedInput = input.toLowerCase();

      if (allowedDecisions.includes(normalizedInput)) {
        decision = normalizedInput;
        break;
      }

      // Handle shortcuts
      if (normalizedInput === "a" || normalizedInput === "y") {
        decision = "approve";
        break;
      }
      if (normalizedInput === "r" || normalizedInput === "n") {
        decision = "reject";
        break;
      }
      if (normalizedInput === "e") {
        decision = "edit";
        break;
      }

      console.log(`Invalid input. Please enter one of: ${allowedDecisions.join(", ")}`);
    }

    // Handle edit decision
    if (decision === "edit") {
      console.log("\nEnter edited content (press Enter twice to finish):");
      const lines: string[] = [];
      const rl = createReadlineInterface();

      await new Promise<void>((resolve) => {
        let emptyLineCount = 0;
        rl.on("line", (line) => {
          if (line === "") {
            emptyLineCount++;
            if (emptyLineCount >= 2) {
              rl.close();
              resolve();
              return;
            }
          } else {
            emptyLineCount = 0;
          }
          lines.push(line);
        });
      });

      const editedContent = lines.join("\n").trim();
      decisions.push({
        type: "edit",
        args: { ...request.args, content: editedContent },
      });
    } else {
      decisions.push({ type: decision });
    }
  }

  console.log("\n" + "=".repeat(60));
  return decisions;
}

/**
 * Main function with HITL support
 */
async function main() {
  const task =
    process.argv.slice(2).join(" ") || "Write a blog post about AI agents";

  console.log("\n📝 Content Builder Agent");
  console.log(`Task: ${task}`);
  console.log(`Thread ID: ${threadId}\n`);

  // Import the agent creation function and recreate with checkpointer
  const { createDeepAgent, FilesystemBackend } = await import("deepagents");
  const { ChatOpenAI } = await import("@langchain/openai");
  const { resolve } = await import("path");

  // Create LLM configured for DashScope (Qwen)
  const llm = new ChatOpenAI({
    model: process.env.DEFAULT_LLM_MODEL || "qwen-max",
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
      baseURL:
        process.env.DASHSCOPE_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
  });

  // Tools
  const { webSearchTool } = await import("./tools/web-search.js");
  const { generateImageTool } = await import("./tools/generate-image.js");
  const { extractContentTool } = await import("./tools/extract-content.js");
  const { publishPostTool } = await import("./tools/publish-post.js");

  // Load subagents
  const { readFileSync } = await import("fs");
  const YAML = (await import("yaml")).default;

  const PROJECT_ROOT = resolve(import.meta.dirname, "..");
  const content = readFileSync(resolve(PROJECT_ROOT, "subagents.yaml"), "utf-8");
  const subagentConfig = YAML.parse(content);

  const availableTools: Record<string, typeof webSearchTool> = {
    web_search: webSearchTool,
  };

  // Helper to create LLM for subagents
  const createSubagentLLM = (modelName?: string) => {
    return new ChatOpenAI({
      model: modelName || process.env.DEFAULT_LLM_MODEL || "qwen-max",
      apiKey: process.env.DASHSCOPE_API_KEY,
      configuration: {
        baseURL:
          process.env.DASHSCOPE_BASE_URL ||
          "https://dashscope.aliyuncs.com/compatible-mode/v1",
      },
    });
  };

  const subagents = Object.entries(subagentConfig).map(([name, spec]) => {
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
      model: s.model ? createSubagentLLM(s.model) : undefined,
      tools: s.tools
        ?.map((t) => availableTools[t])
        .filter((t): t is typeof webSearchTool => t !== undefined),
    };
  });

  const agent = createDeepAgent({
    model: llm,
    memory: ["./AGENTS.md"],
    skills: ["./skills/"],
    tools: [webSearchTool, generateImageTool, extractContentTool, publishPostTool],
    subagents,
    backend: new FilesystemBackend({
      rootDir: resolve(PROJECT_ROOT, "output"),
      virtualMode: false, // Real filesystem for CLI
    }),
    // Human-in-the-loop: interrupt before publishing
    interruptOn: {
      publish_post: true,
    },
    checkpointer,
  });

  const config = {
    configurable: { thread_id: threadId },
    recursionLimit: 100,
  };

  try {
    console.log("🚀 Starting agent...");
    let result = await agent.invoke(
      {
        messages: [{ role: "user", content: task }],
      },
      config
    );
    console.log("📨 Agent returned result");

    // HITL loop
    while (result.__interrupt__ && result.__interrupt__.length > 0) {
      console.log("\n⏸️  Agent paused for human review...");

      const interrupt = result.__interrupt__[0];
      const decisions = await handleHITLReview(interrupt as any);

      console.log("\n▶️  Resuming agent execution...\n");

      // Resume with user decisions
      result = await agent.invoke(
        new Command({
          resume: { decisions },
        }) as any,
        config
      );
    }

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
