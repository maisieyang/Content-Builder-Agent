/**
 * 04-with-files.ts
 *
 * 添加 Filesystem - 让 Agent 能读写文件
 *
 * 上一步（03）的问题：
 * - Agent 只能对话，不能保存任何东西
 * - 写的内容关掉就没了
 *
 * 这一步：
 * - 添加 read_file, write_file, list_files 工具
 * - Agent 可以把结果保存到文件
 * - Agent 可以读取之前保存的内容
 *
 * Filesystem 的价值：
 * - 持久化：结果保存到磁盘
 * - 协作：多个 Agent 通过文件通信
 * - 上下文管理：不把大段内容塞进对话
 *
 * 运行: npx tsx examples/04-with-files.ts
 */

import "dotenv/config";
import { createAgent } from "langchain";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from "fs";
import { resolve, join } from "path";

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
// 2. 定义 Filesystem 工具
// ============================================================

// 工作目录
const WORKSPACE = resolve(process.cwd(), "examples/output");

// 确保工作目录存在
if (!existsSync(WORKSPACE)) {
  mkdirSync(WORKSPACE, { recursive: true });
}

/**
 * read_file: 读取文件内容
 */
const readFileTool = tool(
  async ({ path }: { path: string }) => {
    const fullPath = join(WORKSPACE, path);
    console.log(`    📖 读取文件: ${path}`);

    if (!existsSync(fullPath)) {
      return `错误：文件不存在 "${path}"`;
    }

    try {
      const content = readFileSync(fullPath, "utf-8");
      return content;
    } catch (error) {
      return `错误：无法读取文件 "${path}"`;
    }
  },
  {
    name: "read_file",
    description: "读取文件内容。用于查看之前保存的内容。",
    schema: z.object({
      path: z.string().describe("文件路径，相对于工作目录"),
    }),
  }
);

/**
 * write_file: 写入文件
 */
const writeFileTool = tool(
  async ({ path, content }: { path: string; content: string }) => {
    const fullPath = join(WORKSPACE, path);
    console.log(`    📝 写入文件: ${path}`);

    try {
      // 确保目录存在
      const dir = resolve(fullPath, "..");
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      writeFileSync(fullPath, content, "utf-8");
      return `成功写入文件 "${path}"（${content.length} 字符）`;
    } catch (error) {
      return `错误：无法写入文件 "${path}"`;
    }
  },
  {
    name: "write_file",
    description: "写入内容到文件。用于保存生成的内容、笔记、代码等。",
    schema: z.object({
      path: z.string().describe("文件路径，相对于工作目录"),
      content: z.string().describe("要写入的内容"),
    }),
  }
);

/**
 * list_files: 列出目录内容
 */
const listFilesTool = tool(
  async ({ path = "" }: { path?: string }) => {
    const fullPath = join(WORKSPACE, path);
    console.log(`    📂 列出目录: ${path || "/"}`);

    if (!existsSync(fullPath)) {
      return `目录不存在 "${path}"`;
    }

    try {
      const files = readdirSync(fullPath, { withFileTypes: true });
      const list = files.map((f) => (f.isDirectory() ? `📁 ${f.name}/` : `📄 ${f.name}`));
      return list.length > 0 ? list.join("\n") : "（空目录）";
    } catch (error) {
      return `错误：无法列出目录 "${path}"`;
    }
  },
  {
    name: "list_files",
    description: "列出目录中的文件和子目录。",
    schema: z.object({
      path: z.string().optional().describe("目录路径，默认为根目录"),
    }),
  }
);

// ============================================================
// 3. 创建带 Filesystem 的 Agent
// ============================================================

const agent = createAgent({
  model: createLLM(),
  tools: [readFileTool, writeFileTool, listFilesTool],
});

// ============================================================
// 4. 运行
// ============================================================

async function main() {
  console.log("\n🚀 04-with-files: 添加 Filesystem\n");
  console.log("═".repeat(60));
  console.log("对比 03（无 Filesystem）：");
  console.log("  03: Agent 只能对话，内容关掉就没了");
  console.log("  04: Agent 可以读写文件，持久保存");
  console.log("");
  console.log("添加的工具：");
  console.log("  - read_file: 读取文件");
  console.log("  - write_file: 写入文件");
  console.log("  - list_files: 列出目录");
  console.log("");
  console.log(`工作目录: ${WORKSPACE}`);
  console.log("═".repeat(60));

  // 测试 1: 写入文件
  console.log("\n📝 测试 1: 写一首关于编程的短诗，保存到 poem.txt\n");
  console.log("─".repeat(60));

  const result1 = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "写一首关于编程的短诗（4行），保存到 poem.txt",
      },
    ],
  });

  const content1 = getLastContent(result1);
  console.log("\n📄 Agent 回复:");
  console.log(content1);

  // 测试 2: 读取文件
  console.log("\n" + "─".repeat(60));
  console.log("\n📝 测试 2: 读取刚才保存的诗\n");
  console.log("─".repeat(60));

  const result2 = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "读取 poem.txt 的内容",
      },
    ],
  });

  const content2 = getLastContent(result2);
  console.log("\n📄 Agent 回复:");
  console.log(content2);

  // 测试 3: 列出文件
  console.log("\n" + "─".repeat(60));
  console.log("\n📝 测试 3: 列出工作目录的文件\n");
  console.log("─".repeat(60));

  const result3 = await agent.invoke({
    messages: [
      {
        role: "user",
        content: "列出当前目录有哪些文件",
      },
    ],
  });

  const content3 = getLastContent(result3);
  console.log("\n📄 Agent 回复:");
  console.log(content3);

  console.log("\n" + "═".repeat(60));
  console.log("观察：");
  console.log("  - Agent 自动选择正确的文件工具");
  console.log("  - 内容被持久化到磁盘");
  console.log("  - 可以跨会话读取之前保存的内容");
  console.log("");
  console.log("Filesystem 的价值：");
  console.log("  - 持久化：结果保存到磁盘，不怕丢失");
  console.log("  - 协作：多个 Agent 通过文件通信");
  console.log("  - 上下文管理：大内容存文件，对话只传路径");
  console.log("");
  console.log("下一步：05-with-skills.ts 添加可复用工作流");
  console.log("═".repeat(60));
}

function getLastContent(result: any): string {
  const lastMessage = result.messages[result.messages.length - 1];
  return "content" in lastMessage
    ? typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content)
    : "";
}

main().catch(console.error);
