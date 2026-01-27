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
import { HumanMessage } from "@langchain/core/messages";
import { agent } from "./agent.js";
import { logFeatureAvailability } from "./utils/index.js";

/**
 * Main function
 */
async function main() {
  const task =
    process.argv.slice(2).join(" ") || "Write a blog post about AI agents";

  console.log("\n📝 Content Builder Agent");
  console.log("─".repeat(50));
  console.log(`Task: ${task}\n`);

  // Show feature availability
  logFeatureAvailability();
  console.log("");

  const config = {
    recursionLimit: 100,
  };

  try {
    console.log("🚀 Starting agent...\n");
    console.log("─".repeat(50));

    const result = await agent.invoke(
      {
        messages: [new HumanMessage(task)],
      },
      config
    );

    console.log("\n" + "─".repeat(50));
    console.log("✅ Done!");
    console.log(`Total messages: ${result.messages.length}`);

    // Show final summary
    const lastMessage = result.messages[result.messages.length - 1];
    if (lastMessage && "content" in lastMessage) {
      console.log("\n📄 Final Response:");
      console.log("─".repeat(50));
      const content =
        typeof lastMessage.content === "string"
          ? lastMessage.content
          : JSON.stringify(lastMessage.content);
      // Show more of the response
      console.log(content.slice(0, 1000) + (content.length > 1000 ? "..." : ""));
    }

    // Show generated files if any
    const files = (result as unknown as { files?: Record<string, unknown> }).files;
    if (files && Object.keys(files).length > 0) {
      console.log("\n📁 Generated Files:");
      console.log("─".repeat(50));
      for (const [path, file] of Object.entries(files)) {
        const size = typeof file === "object" && file && "content" in file
          ? (file as { content: string }).content.length
          : 0;
        console.log(`  ${path} (${size} chars)`);
      }
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
