/**
 * Content Builder Agent
 *
 * A content writing agent for creating blog posts, LinkedIn posts, and tweets
 * with cover images included.
 *
 * Usage:
 *   npm run dev "Write a blog post about AI agents"
 *   npm run dev "Create a LinkedIn post about prompt engineering"
 */

import "dotenv/config";
import { agent } from "./agent.js";

async function main() {
  const task = process.argv.slice(2).join(" ") || "Write a blog post about AI agents";

  console.log("\n📝 Content Builder Agent");
  console.log(`Task: ${task}\n`);

  try {
    const result = await agent.invoke(
      {
        messages: [{ role: "user", content: task }],
      },
      {
        configurable: { thread_id: "content-builder-demo" },
        recursionLimit: 100,
      }
    );

    console.log("\n✅ Done!");
    console.log("Messages:", result.messages.length);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
