/**
 * 06-with-subagents.ts
 *
 * 添加 SubAgents - 专业分工与上下文隔离
 *
 * 第一性原理分析：
 *
 * 问题 1：上下文爆炸
 *   - 复杂任务需要很多步骤
 *   - 所有步骤都在 messages 里累积
 *   - Token 爆炸，性能下降
 *
 * 问题 2：需要独立视角
 *   - 编辑审核内容时，不应该知道是谁写的
 *   - 否则会有偏见
 *
 * 解决：SubAgent（子代理）
 *   - 独立的 Agent，有自己的 messages
 *   - 执行完返回结果，中间过程不污染主 Agent
 *   - 每个 SubAgent 可以有专门的 tools 和 prompt
 *
 * 运行: npx tsx examples/06-with-subagents.ts
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
// 2. 定义 SubAgents
// ============================================================

/**
 * SubAgent 的本质：
 * - 一个独立的 Agent 配置
 * - 有自己的 systemPrompt、tools
 * - 被调用时创建新的 Agent 实例
 * - 执行完返回结果，messages 不会传给主 Agent
 */

interface SubAgentConfig {
  name: string;
  description: string;
  systemPrompt: string;
  tools?: any[];
}

// SubAgent 1: 研究员 - 负责调研
const researcherConfig: SubAgentConfig = {
  name: "researcher",
  description: "负责调研和收集信息。当需要深入了解某个主题时使用。",
  systemPrompt: `你是一个专业的研究员。

你的职责：
1. 深入分析用户给定的主题
2. 提供结构化的研究结果
3. 列出关键要点和洞察

输出格式：
## 主题概述
[简要概述]

## 关键要点
- 要点1
- 要点2
- 要点3

## 深入分析
[详细分析]

## 结论
[总结]`,
};

// SubAgent 2: 写手 - 负责写作
const writerConfig: SubAgentConfig = {
  name: "writer",
  description: "负责撰写内容。当需要写文章、博客、文案时使用。",
  systemPrompt: `你是一个专业的内容写手。

你的职责：
1. 根据给定的主题或大纲撰写内容
2. 语言流畅、结构清晰
3. 适合目标读者

写作原则：
- 开头要有吸引力
- 段落简短，易于阅读
- 多用具体例子
- 结尾有行动号召`,
};

// SubAgent 3: 编辑 - 负责审核（独立视角很重要！）
const editorConfig: SubAgentConfig = {
  name: "editor",
  description: "负责审核和改进内容。当内容写完需要优化时使用。",
  systemPrompt: `你是一个严格的编辑。

你的职责：
1. 审核内容的质量
2. 提出改进建议
3. 修正错误和不通顺的地方

审核清单：
- [ ] 逻辑是否清晰？
- [ ] 是否有错别字？
- [ ] 是否有冗余内容？
- [ ] 开头是否吸引人？
- [ ] 结尾是否有力？

输出格式：
## 审核结果
[通过/需修改]

## 问题列表
1. [问题1]
2. [问题2]

## 修改建议
[具体建议]

## 修改后的内容（如需要）
[改进后的版本]`,
};

const subAgentConfigs = [researcherConfig, writerConfig, editorConfig];

// ============================================================
// 3. 创建 delegate_task 工具
// ============================================================

/**
 * delegate_task 的本质：
 *
 * 1. 主 Agent 调用这个工具，指定 subagent 和 task
 * 2. 工具内部创建一个新的 Agent 实例
 * 3. 新 Agent 独立执行任务
 * 4. 返回结果给主 Agent
 *
 * 关键：SubAgent 的 messages 是独立的，不会传给主 Agent
 * 这就是"上下文隔离"
 */

const delegateTaskTool = tool(
  async ({ subagent, task }: { subagent: string; task: string }) => {
    console.log(`\n    🤖 委托给 ${subagent}: ${task.slice(0, 50)}...`);

    // 找到对应的 SubAgent 配置
    const config = subAgentConfigs.find((c) => c.name === subagent);
    if (!config) {
      return `错误：未知的 SubAgent "${subagent}"。可用的有：${subAgentConfigs.map((c) => c.name).join(", ")}`;
    }

    // 创建独立的 SubAgent
    const subAgent = createAgent({
      model: createLLM(),
      tools: config.tools || [],
      systemPrompt: config.systemPrompt,
    });

    console.log(`    ⏳ ${config.name} 正在工作...`);

    // 执行任务（独立的 messages！）
    const result = await subAgent.invoke({
      messages: [{ role: "user", content: task }],
    });

    // 提取结果
    const lastMessage = result.messages[result.messages.length - 1];
    const content =
      "content" in lastMessage
        ? typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content)
        : "";

    console.log(`    ✅ ${config.name} 完成`);

    return `[${config.name} 的结果]\n\n${content}`;
  },
  {
    name: "delegate_task",
    description: `委托任务给专业的 SubAgent。可用的 SubAgent：
${subAgentConfigs.map((c) => `- ${c.name}: ${c.description}`).join("\n")}`,
    schema: z.object({
      subagent: z
        .enum(["researcher", "writer", "editor"])
        .describe("要委托的 SubAgent 名称"),
      task: z.string().describe("要执行的具体任务"),
    }),
  }
);

// ============================================================
// 4. 创建主 Agent
// ============================================================

const mainAgent = createAgent({
  model: createLLM(),
  tools: [delegateTaskTool],
  systemPrompt: `你是一个项目经理，负责协调多个专业人员完成任务。

你可以使用 delegate_task 工具将任务委托给专业人员：
- researcher: 调研和收集信息
- writer: 撰写内容
- editor: 审核和改进

工作流程建议：
1. 分析任务，拆解为子任务
2. 将子任务委托给合适的人
3. 整合结果，交付最终成果

记住：你是协调者，具体工作由专业人员完成。`,
});

// ============================================================
// 5. 运行
// ============================================================

async function main() {
  console.log("\n🚀 06-with-subagents: 添加 SubAgents\n");
  console.log("═".repeat(60));
  console.log("SubAgents 解决的问题：");
  console.log("");
  console.log("  1. 上下文隔离");
  console.log("     - SubAgent 有独立的 messages");
  console.log("     - 中间过程不污染主 Agent");
  console.log("");
  console.log("  2. 专业分工");
  console.log("     - 每个 SubAgent 有专门的 prompt 和 tools");
  console.log("     - researcher / writer / editor");
  console.log("");
  console.log("  3. 独立视角");
  console.log("     - editor 审核时不知道是谁写的");
  console.log("     - 避免偏见");
  console.log("═".repeat(60));

  // 测试: 复杂任务，需要多个 SubAgent 协作
  console.log("\n📝 测试: 写一篇关于 Prompt Engineering 的短文\n");
  console.log("─".repeat(60));

  const result = await mainAgent.invoke({
    messages: [
      {
        role: "user",
        content:
          "帮我写一篇关于 Prompt Engineering 的短文（200字左右）。先调研，再写作，最后审核。",
      },
    ],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  const content =
    "content" in lastMessage
      ? typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content)
      : "";

  console.log("\n📄 主 Agent 最终回复:");
  console.log("─".repeat(60));
  console.log(content);

  console.log("\n" + "═".repeat(60));
  console.log("观察：");
  console.log("  - 主 Agent 协调多个 SubAgent");
  console.log("  - 每个 SubAgent 独立执行，返回结果");
  console.log("  - 主 Agent 只看到结果，不看到中间过程");
  console.log("");
  console.log("SubAgent vs Tool：");
  console.log("  Tool:     简单函数，无状态");
  console.log("  SubAgent: 完整 Agent，有自己的推理循环");
  console.log("");
  console.log("这就是从 0 到 1 构建 Agent 的完整路径！");
  console.log("═".repeat(60));
}

main().catch(console.error);
