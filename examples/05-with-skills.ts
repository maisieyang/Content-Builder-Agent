/**
 * 05-with-skills.ts
 *
 * 添加 Skills - 让 Agent 按需加载可复用工作流
 *
 * 第一性原理分析：
 *
 * 问题：
 *   - Agent 需要知道很多"怎么做"的知识
 *   - 全部塞进 System Prompt？Token 爆炸
 *   - 而且大部分知识当前任务用不到
 *
 * 解决：Progressive Disclosure（渐进式披露）
 *   - 只告诉 Agent "有哪些技能"（name + description）
 *   - Agent 自己决定需要哪个
 *   - 用 read_file 按需加载完整内容
 *
 * Skill vs Memory：
 *   - Memory: 始终加载，定义"我是谁"
 *   - Skill: 按需加载，定义"怎么做某事"
 *
 * 运行: npx tsx examples/05-with-skills.ts
 */

import "dotenv/config";
import { createAgent, type AgentMiddleware } from "langchain";
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
// 2. 创建示例 Skills
// ============================================================

const SKILLS_DIR = resolve(process.cwd(), "examples/skills");

// 确保目录存在
if (!existsSync(SKILLS_DIR)) {
  mkdirSync(SKILLS_DIR, { recursive: true });
}

// Skill 1: 写博客
const BLOG_SKILL = `---
name: write-blog
description: 如何写一篇高质量的博客文章
---

# 写博客工作流

## 步骤

1. **确定主题和受众**
   - 主题要具体，不要太宽泛
   - 明确目标读者是谁

2. **列出大纲**
   - 开头：吸引注意力的 hook
   - 中间：3-5 个核心观点
   - 结尾：总结 + 行动号召

3. **写初稿**
   - 先写完，不要边写边改
   - 用口语化的语言

4. **编辑润色**
   - 删除冗余词
   - 检查逻辑流畅性
   - 添加小标题和分段

5. **添加元素**
   - 配图
   - 代码示例（如适用）
   - 引用和链接

## 注意事项
- 每段不超过 3-4 句
- 多用短句
- 避免专业术语，或者解释清楚
`;

// Skill 2: 写 Twitter
const TWITTER_SKILL = `---
name: write-twitter
description: 如何写一条吸引人的 Twitter/推文
---

# 写 Twitter 工作流

## 核心原则
- 280 字符限制（中文约 140 字）
- 前 50 字符最重要（决定是否展开）
- 一条推文 = 一个观点

## 模板

### 观点型
[观点陈述]

原因：[简短解释]

### 干货型
[数字] 个 [主题] 的技巧：

1. [技巧1]
2. [技巧2]
3. [技巧3]

### 故事型
[时间] 前，我 [经历]

结果：[结果]

教训：[教训]

## 提升互动
- 以问题结尾
- 使用 emoji 增加视觉效果
- 提及相关的人或话题
`;

// Skill 3: 代码审查
const CODE_REVIEW_SKILL = `---
name: code-review
description: 如何进行代码审查
---

# 代码审查工作流

## 审查清单

### 1. 功能正确性
- [ ] 代码是否实现了预期功能？
- [ ] 边界情况是否处理？
- [ ] 错误处理是否完善？

### 2. 代码质量
- [ ] 命名是否清晰？
- [ ] 函数是否单一职责？
- [ ] 是否有重复代码？

### 3. 性能
- [ ] 是否有明显的性能问题？
- [ ] 数据库查询是否优化？
- [ ] 是否有不必要的循环？

### 4. 安全性
- [ ] 输入是否验证？
- [ ] 是否有 SQL 注入风险？
- [ ] 敏感信息是否保护？

## 反馈原则
- 具体：指出具体行号和问题
- 建设性：提供改进建议
- 友善：对事不对人
`;

// 写入 skill 文件
const skills = [
  { file: "write-blog.md", content: BLOG_SKILL },
  { file: "write-twitter.md", content: TWITTER_SKILL },
  { file: "code-review.md", content: CODE_REVIEW_SKILL },
];

for (const skill of skills) {
  const path = join(SKILLS_DIR, skill.file);
  if (!existsSync(path)) {
    writeFileSync(path, skill.content);
  }
}

// ============================================================
// 3. 解析 Skill 元数据
// ============================================================

interface SkillMeta {
  name: string;
  description: string;
  path: string;
}

function loadSkillsMeta(dir: string): SkillMeta[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
  const metas: SkillMeta[] = [];

  for (const file of files) {
    const content = readFileSync(join(dir, file), "utf-8");
    // 解析 frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (match) {
      const frontmatter = match[1];
      const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim() || file;
      const desc = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim() || "";
      metas.push({ name, description: desc, path: file });
    }
  }

  return metas;
}

// ============================================================
// 4. Skills Middleware
// ============================================================

/**
 * Skills Middleware 的本质：
 *
 * 1. 启动时扫描 skills 目录，提取 name + description
 * 2. 注入到 system prompt："你有以下技能可用..."
 * 3. Agent 看到列表，决定是否需要
 * 4. 需要时用 read_file 加载完整内容
 *
 * 这就是 Progressive Disclosure：
 *   System Prompt 只放"目录"
 *   Agent 按需"翻到具体页"
 */

function createSkillsMiddleware(skillsDir: string): AgentMiddleware {
  const metas = loadSkillsMeta(skillsDir);

  console.log(`    📚 加载 ${metas.length} 个 Skills:`);
  metas.forEach((m) => console.log(`       - ${m.name}: ${m.description}`));

  const skillsList = metas
    .map((m) => `- ${m.name}: ${m.description} (路径: skills/${m.path})`)
    .join("\n");

  const skillsPrompt = `

<available_skills>
你有以下技能可用。当任务匹配某个技能时，用 read_file 工具读取完整内容，然后按照技能指导执行。

${skillsList}
</available_skills>
`;

  return {
    name: "SkillsMiddleware",
    wrapModelCall: async (params, next) => {
      const messages = params.messages.map((msg, i) => {
        if (i === 0 && msg._getType?.() === "system") {
          return { ...msg, content: msg.content + skillsPrompt };
        }
        return msg;
      });
      return next({ ...params, messages });
    },
  };
}

// ============================================================
// 5. Filesystem 工具（用于读取 Skills）
// ============================================================

const WORKSPACE = resolve(process.cwd(), "examples");

const readFileTool = tool(
  async ({ path }: { path: string }) => {
    const fullPath = join(WORKSPACE, path);
    console.log(`    📖 读取: ${path}`);

    if (!existsSync(fullPath)) {
      return `错误：文件不存在 "${path}"`;
    }
    return readFileSync(fullPath, "utf-8");
  },
  {
    name: "read_file",
    description: "读取文件内容。用于加载技能详情或其他文件。",
    schema: z.object({
      path: z.string().describe("文件路径"),
    }),
  }
);

const writeFileTool = tool(
  async ({ path, content }: { path: string; content: string }) => {
    const fullPath = join(WORKSPACE, "output", path);
    const dir = resolve(fullPath, "..");
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(fullPath, content);
    console.log(`    📝 写入: output/${path}`);
    return `成功写入 output/${path}`;
  },
  {
    name: "write_file",
    description: "写入内容到文件。",
    schema: z.object({
      path: z.string().describe("文件路径"),
      content: z.string().describe("内容"),
    }),
  }
);

// ============================================================
// 6. 创建带 Skills 的 Agent
// ============================================================

console.log("\n🚀 05-with-skills: 添加 Skills\n");
console.log("═".repeat(60));

const agent = createAgent({
  model: createLLM(),
  tools: [readFileTool, writeFileTool],
  middleware: [createSkillsMiddleware(SKILLS_DIR)],
});

// ============================================================
// 7. 运行
// ============================================================

async function main() {
  console.log("═".repeat(60));
  console.log("Skills 的本质：Progressive Disclosure");
  console.log("");
  console.log("  System Prompt 只放「目录」（name + description）");
  console.log("  Agent 按需用 read_file 加载完整内容");
  console.log("");
  console.log("Skill vs Memory：");
  console.log("  Memory: 始终加载，定义「我是谁」");
  console.log("  Skill:  按需加载，定义「怎么做某事」");
  console.log("═".repeat(60));

  // 测试: 写博客（应该触发 write-blog skill）
  console.log("\n📝 测试: 帮我写一篇关于 AI Agent 的博客\n");
  console.log("─".repeat(60));

  const result = await agent.invoke({
    messages: [
      {
        role: "user",
        content:
          "帮我写一篇关于 AI Agent 的博客文章，保存到 blog.md。请先读取相关的 skill 来指导你的写作。",
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

  console.log("\n📄 Agent 回复:");
  console.log(content.slice(0, 500) + (content.length > 500 ? "..." : ""));

  console.log("\n" + "═".repeat(60));
  console.log("观察：");
  console.log("  - Agent 看到了 Skills 列表");
  console.log("  - Agent 选择了 write-blog skill");
  console.log("  - Agent 用 read_file 加载了完整内容");
  console.log("  - Agent 按照 skill 指导写作");
  console.log("");
  console.log("Progressive Disclosure 的价值：");
  console.log("  - 节省 Token：不用把所有知识塞进 prompt");
  console.log("  - 可扩展：添加新 skill 只需添加文件");
  console.log("  - 可维护：skill 内容和代码分离");
  console.log("");
  console.log("下一步：06-with-subagents.ts 添加专业分工");
  console.log("═".repeat(60));
}

main().catch(console.error);
