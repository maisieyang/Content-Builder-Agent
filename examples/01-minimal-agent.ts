/**
 * 01-minimal-agent.ts
 *
 * 最简 Agent - 只有 LLM，没有任何额外能力
 *
 * 2025 年起点：
 * - API 已内置 Agentic Loop（你不用写循环）
 * - LangChain 的 createAgent 封装了这个能力
 * - 你只需要定义 model 和 tools
 *
 * 后续示例会逐步添加：
 * - 02: + Tools (自定义工具)
 * - 03: + Memory (持久身份)
 * - 04: + Filesystem (文件读写)
 * - 05: + Skills (可复用工作流)
 * - 06: + SubAgents (专业分工)
 *
 * 运行: npx tsx examples/01-minimal-agent.ts
 */

import "dotenv/config";
import { createAgent } from "langchain";
import { ChatOpenAI } from "@langchain/openai";

// ============================================================
// 1. 创建 LLM
// ============================================================

function createLLM() {
  return new ChatOpenAI({
    model: process.env.DEFAULT_LLM_MODEL || "qwen-plus",
    apiKey: process.env.DASHSCOPE_API_KEY,
    configuration: {
      baseURL:
        process.env.DASHSCOPE_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
  });
}

// ============================================================
// 2. 创建最简 Agent
// ============================================================

/**
 * createAgent 是 LangChain 提供的 Agent 工厂
 *
 * 它内置了：
 * - Agentic Loop（你不用写 while 循环）
 * - 工具执行和错误处理
 * - 消息历史管理
 *
 * 最简形式：只有 model，没有 tools
 * 这就是一个纯对话 Agent
 */
const agent = createAgent({
  model: createLLM(),
  tools: [], // 没有工具 - 纯 LLM 对话
});

// ============================================================
// 3. 运行
// ============================================================

async function main() {
  console.log("\n🚀 01-minimal-agent: 最简 Agent\n");
  console.log("═".repeat(60));
  console.log("2025 年起点：API 已内置 Agentic Loop");
  console.log("");
  console.log("  import { createAgent } from 'langchain';");
  console.log("");
  console.log("  createAgent({");
  console.log("    model: createLLM(),");
  console.log("    tools: [],  // 没有工具");
  console.log("  })");
  console.log("");
  console.log("它能做什么？只能对话，不能：");
  console.log("  ❌ 搜索网页 (需要 Tools)");
  console.log("  ❌ 读写文件 (需要 Filesystem)");
  console.log("  ❌ 保持身份 (需要 Memory)");
  console.log("  ❌ 复用工作流 (需要 Skills)");
  console.log("  ❌ 委托子任务 (需要 SubAgents)");
  console.log("═".repeat(60));

  const task = "帮我列出完成一篇博客文章需要的步骤";

  console.log(`\n📝 任务: ${task}\n`);
  console.log("─".repeat(60));

  const result = await agent.invoke({
    messages: [{ role: "user", content: task }],
  });

  // 获取最后一条消息
  const lastMessage = result.messages[result.messages.length - 1];
  const content =
    "content" in lastMessage
      ? typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content)
      : "";

  console.log("\n📄 Agent 回复:");
  console.log("─".repeat(60));
  console.log(content);

  console.log("\n" + "═".repeat(60));
  console.log("观察：Agent 只能给出建议，不能实际执行任何操作");
  console.log("下一步：02-with-tools.ts 添加工具能力");
  console.log("═".repeat(60));
}

main().catch(console.error);
