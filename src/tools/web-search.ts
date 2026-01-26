/**
 * Web Search Tool - Tavily Integration
 *
 * Searches the web for current information using Tavily API.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const webSearchTool = tool(
  async ({ query, maxResults = 5 }) => {
    // TODO: Implement Tavily search
    // Will be implemented in Phase 3
    return {
      error: "Web search not yet implemented. Will use Tavily API.",
      query,
      maxResults,
    };
  },
  {
    name: "web_search",
    description:
      "Search the web for current information. Use this to research topics, find statistics, and gather sources.",
    schema: z.object({
      query: z.string().describe("The search query (be specific and detailed)"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Number of results to return (default: 5)"),
    }),
  }
);
