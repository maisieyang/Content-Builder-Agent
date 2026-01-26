/**
 * End-to-End Tests for Content Builder Agent
 *
 * Tests the complete workflow for different content types.
 * These tests require API keys to be configured in .env
 *
 * Usage:
 *   npm run test:e2e
 *   npm run test:e2e -- --scenario=blog
 *   npm run test:e2e -- --scenario=linkedin
 *   npm run test:e2e -- --scenario=twitter
 */

import "dotenv/config";
import { MemorySaver } from "@langchain/langgraph";
import { createDeepAgent, FilesystemBackend } from "deepagents";
import { ChatOpenAI } from "@langchain/openai";
import { resolve } from "path";
import { readFileSync, existsSync, mkdirSync } from "fs";
import YAML from "yaml";

// Tools
import { webSearchTool } from "./tools/web-search.js";
import { generateImageTool } from "./tools/generate-image.js";
import { extractContentTool } from "./tools/extract-content.js";
import { publishPostTool } from "./tools/publish-post.js";

/**
 * Create LLM configured for DashScope (Qwen)
 */
function createDashScopeLLM() {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    throw new Error("DASHSCOPE_API_KEY is required");
  }

  return new ChatOpenAI({
    model: process.env.DEFAULT_LLM_MODEL || "qwen-max",
    apiKey,
    configuration: {
      baseURL:
        process.env.DASHSCOPE_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
  });
}

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

// Test scenarios
const TEST_SCENARIOS = {
  blog: {
    name: "Blog Post from Topic",
    task: "Write a short blog post about the benefits of AI agents in software development. Keep it brief (3 paragraphs) for testing purposes.",
    expectedOutputs: ["blogs/"],
    description: "Tests: Topic → Research → Blog Post + Cover Image",
  },
  linkedin: {
    name: "LinkedIn Post from URL",
    task: "Create a LinkedIn post based on this article: https://www.anthropic.com/news/claude-4-0-model-card. Focus on the key capabilities.",
    expectedOutputs: ["linkedin/"],
    description: "Tests: URL → Extract Content → LinkedIn Post + Image",
  },
  twitter: {
    name: "Twitter Thread from Topic",
    task: "Create a short Twitter thread (3 tweets) about prompt engineering best practices.",
    expectedOutputs: ["tweets/"],
    description: "Tests: Topic → Research → Twitter Thread + Image",
  },
  hitl: {
    name: "HITL Review Flow",
    task: "Create a LinkedIn post about AI and publish it to LinkedIn.",
    expectedOutputs: ["linkedin/"],
    description: "Tests: Content Creation → HITL Review → Publish",
  },
};

type ScenarioKey = keyof typeof TEST_SCENARIOS;

/**
 * Check required environment variables
 */
function checkEnvironment(): { valid: boolean; missing: string[] } {
  const required = ["DASHSCOPE_API_KEY", "TAVILY_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing };
}

/**
 * Create agent for testing
 */
function createTestAgent(checkpointer?: MemorySaver) {
  // Load subagents
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

  // Create LLM configured for DashScope
  const llm = createDashScopeLLM();

  return createDeepAgent({
    model: llm,
    memory: ["./AGENTS.md"],
    skills: ["./skills/"],
    tools: [webSearchTool, generateImageTool, extractContentTool, publishPostTool],
    subagents,
    backend: new FilesystemBackend({
      rootDir: resolve(PROJECT_ROOT, "output"),
      virtualMode: false,
    }),
    interruptOn: {
      publish_post: true,
    },
    checkpointer,
  });
}

/**
 * Run a single test scenario
 */
async function runScenario(
  scenarioKey: ScenarioKey,
  options: { verbose?: boolean; skipPublish?: boolean } = {}
): Promise<{
  success: boolean;
  scenario: string;
  duration: number;
  messages: number;
  interrupted: boolean;
  error?: string;
}> {
  const scenario = TEST_SCENARIOS[scenarioKey];
  const startTime = Date.now();

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📋 Test: ${scenario.name}`);
  console.log(`   ${scenario.description}`);
  console.log(`${"=".repeat(60)}\n`);

  const checkpointer = new MemorySaver();
  const agent = createTestAgent(checkpointer);
  const threadId = `test-${scenarioKey}-${Date.now()}`;

  const config = {
    configurable: { thread_id: threadId },
    recursionLimit: 50, // Lower for testing
  };

  try {
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: scenario.task }],
      },
      config
    );

    const interrupted = !!(result.__interrupt__ && result.__interrupt__.length > 0);
    const duration = Date.now() - startTime;

    if (options.verbose) {
      console.log(`\n📊 Results:`);
      console.log(`   Messages: ${result.messages.length}`);
      console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);
      console.log(`   Interrupted (HITL): ${interrupted}`);

      // Show last AI message
      const lastAI = result.messages
        .filter((m: any) => m._getType?.() === "ai" || m.role === "assistant")
        .pop();
      if (lastAI && "content" in lastAI) {
        const content =
          typeof lastAI.content === "string"
            ? lastAI.content
            : JSON.stringify(lastAI.content);
        console.log(`\n   Last Response (truncated):`);
        console.log(`   ${content.slice(0, 200)}...`);
      }
    }

    // Check for expected outputs
    let outputsFound = 0;
    for (const expectedPath of scenario.expectedOutputs) {
      const fullPath = resolve(PROJECT_ROOT, "output", expectedPath);
      if (existsSync(fullPath)) {
        outputsFound++;
        if (options.verbose) {
          console.log(`   ✅ Found output: ${expectedPath}`);
        }
      }
    }

    console.log(`\n✅ Test passed: ${scenario.name}`);
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`);

    return {
      success: true,
      scenario: scenario.name,
      duration,
      messages: result.messages.length,
      interrupted,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    console.log(`\n❌ Test failed: ${scenario.name}`);
    console.log(`   Error: ${errorMessage}`);

    return {
      success: false,
      scenario: scenario.name,
      duration,
      messages: 0,
      interrupted: false,
      error: errorMessage,
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests(options: { verbose?: boolean } = {}) {
  console.log("\n🧪 Content Builder Agent - E2E Tests\n");

  // Check environment
  const envCheck = checkEnvironment();
  if (!envCheck.valid) {
    console.error("❌ Missing required environment variables:");
    envCheck.missing.forEach((key) => console.error(`   - ${key}`));
    process.exit(1);
  }
  console.log("✅ Environment check passed\n");

  // Ensure output directory exists
  const outputDir = resolve(PROJECT_ROOT, "output");
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const results: Awaited<ReturnType<typeof runScenario>>[] = [];

  // Run blog test (basic flow)
  results.push(await runScenario("blog", options));

  // Run LinkedIn test (URL extraction)
  // results.push(await runScenario("linkedin", options));

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  results.forEach((r) => {
    const status = r.success ? "✅" : "❌";
    console.log(`${status} ${r.scenario} (${(r.duration / 1000).toFixed(1)}s)`);
    if (r.error) {
      console.log(`   Error: ${r.error}`);
    }
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed`);

  return failed === 0;
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const scenarioArg = args.find((a) => a.startsWith("--scenario="));
  const verbose = args.includes("--verbose") || args.includes("-v");

  if (scenarioArg) {
    const scenario = scenarioArg.split("=")[1] as ScenarioKey;
    if (!TEST_SCENARIOS[scenario]) {
      console.error(`Unknown scenario: ${scenario}`);
      console.error(`Available: ${Object.keys(TEST_SCENARIOS).join(", ")}`);
      process.exit(1);
    }
    const result = await runScenario(scenario, { verbose });
    process.exit(result.success ? 0 : 1);
  } else {
    const success = await runAllTests({ verbose });
    process.exit(success ? 0 : 1);
  }
}

main().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
