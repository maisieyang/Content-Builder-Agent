/**
 * 02-with-tools.ts
 *
 * 添加工具 - 让 Agent 能实际执行操作
 *
 * 上一步（01）的问题：
 * - Agent 只能对话，不能做任何实际操作
 * - 问"北京天气"只能猜测，不能真的查
 *
 * 这一步：
 * - 添加 Tools，让 Agent 能调用外部能力
 * - Agent 决定何时调用、调用哪个工具
 *
 * 运行: npx tsx examples/02-with-tools.ts
 */

import "dotenv/config";
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

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
// 2. 定义工具
// ============================================================

/**
 * 工具的本质：
 * - name: 工具名称（Agent 用这个来调用）
 * - description: 描述（Agent 根据这个决定何时使用）
 * - schema: 输入参数（Zod schema）
 * - func: 执行函数
 *
 * Agent 会：
 * 1. 根据 description 判断是否需要这个工具
 * 2. 根据 schema 生成正确的参数
 * 3. 调用 func 执行
 * 4. 把结果放回对话继续推理
 */

// 工具 1: 获取天气（模拟）
const getWeatherTool = tool(
  async ({ location }: { location: string }) => {
    console.log(`    🌤️  调用天气工具: ${location}`);
    // 模拟天气数据
    const weathers: Record<string, string> = {
      北京: "晴天，25°C，空气质量良好",
      上海: "多云，28°C，湿度较高",
      深圳: "阵雨，30°C，注意带伞",
    };
    return weathers[location] || `${location}：晴天，22°C`;
  },
  {
    name: "get_weather",
    description: "获取指定城市的天气信息",
    schema: z.object({
      location: z.string().describe("城市名称，如：北京、上海"),
    }),
  }
);

// 工具 2: 计算器
const calculatorTool = tool(
  async ({ expression }: { expression: string }) => {
    console.log(`    🧮 调用计算器: ${expression}`);
    try {
      // 简单计算（生产环境用安全的表达式解析器）
      const result = eval(expression);
      return `${expression} = ${result}`;
    } catch {
      return `计算错误: 无法计算 "${expression}"`;
    }
  },
  {
    name: "calculator",
    description: "计算数学表达式，支持加减乘除",
    schema: z.object({
      expression: z.string().describe("数学表达式，如：2 + 3 * 4"),
    }),
  }
);

// 工具 3: 搜索（模拟）
const searchTool = tool(
  async ({ query }: { query: string }) => {
    console.log(`    🔍 调用搜索: ${query}`);
    // 模拟搜索结果
    return `搜索 "${query}" 的结果：AI Agent 是能够自主感知环境、做出决策并采取行动的智能系统。它通过 Agentic Loop（感知→规划→执行→观察）来完成复杂任务。`;
  },
  {
    name: "search",
    description: "搜索信息，用于查找 Agent 不知道的知识",
    schema: z.object({
      query: z.string().describe("搜索关键词"),
    }),
  }
);

// ============================================================
// 3. 创建带工具的 Agent
// ============================================================

const agent = createAgent({
  model: createLLM(),
  tools: [getWeatherTool, calculatorTool, searchTool],
});

// ============================================================
// 4. 运行
// ============================================================

async function main() {
  console.log("\n🚀 02-with-tools: 添加工具\n");
  console.log("═".repeat(60));
  console.log("对比 01（无工具）：");
  console.log("  01: Agent 只能对话，问天气只能猜");
  console.log("  02: Agent 可以调用工具，真正获取信息");
  console.log("");
  console.log("添加的工具：");
  console.log("  - get_weather: 获取天气");
  console.log("  - calculator: 计算数学表达式");
  console.log("  - search: 搜索信息");
  console.log("═".repeat(60));

  // 测试 1: 天气查询
  console.log("\n📝 测试 1: 北京和上海的天气怎么样？\n");
  console.log("─".repeat(60));

  const result1 = await agent.invoke({
    messages: [{ role: "user", content: "北京和上海的天气怎么样？" }],
  });

  const lastMessage1 = result1.messages[result1.messages.length - 1];
  const content1 =
    "content" in lastMessage1
      ? typeof lastMessage1.content === "string"
        ? lastMessage1.content
        : JSON.stringify(lastMessage1.content)
      : "";

  console.log("\n📄 Agent 回复:");
  console.log(content1);

  // 测试 2: 计算
  console.log("\n" + "─".repeat(60));
  console.log("\n📝 测试 2: 计算 (15 + 27) * 3 - 18\n");
  console.log("─".repeat(60));

  const result2 = await agent.invoke({
    messages: [{ role: "user", content: "帮我计算 (15 + 27) * 3 - 18" }],
  });

  const lastMessage2 = result2.messages[result2.messages.length - 1];
  const content2 =
    "content" in lastMessage2
      ? typeof lastMessage2.content === "string"
        ? lastMessage2.content
        : JSON.stringify(lastMessage2.content)
      : "";

  console.log("\n📄 Agent 回复:");
  console.log(content2);

  console.log("\n" + "═".repeat(60));
  console.log("观察：");
  console.log("  - Agent 自动判断需要哪个工具");
  console.log("  - Agent 生成正确的参数");
  console.log("  - Agent 把工具结果整合到回复中");
  console.log("");
  console.log("下一步：03-with-memory.ts 添加持久身份");
  console.log("═".repeat(60));
}

main().catch(console.error);
