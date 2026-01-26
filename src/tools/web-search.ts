/**
 * Web Search Tool - Tavily Integration
 *
 * Searches the web for current information using Tavily API.
 *
 * Required env:
 * - TAVILY_API_KEY
 */

import { tool } from "@langchain/core/tools";
import { TavilySearch } from "@langchain/tavily";
import { z } from "zod";

// Lazily initialized Tavily search instance
let tavilySearch: TavilySearch | null = null;

function getTavilySearch(maxResults: number): TavilySearch {
  if (!process.env.TAVILY_API_KEY) {
    throw new Error(
      "Missing TAVILY_API_KEY. Set it in your environment (.env) to use web search."
    );
  }

  // Create new instance with specified maxResults
  return new TavilySearch({
    maxResults,
    includeAnswer: true,
    includeRawContent: false,
    includeImages: false,
    searchDepth: "basic",
  });
}

export interface WebSearchResult {
  query: string;
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
}

export const webSearchTool = tool(
  async ({ query, maxResults = 5 }): Promise<WebSearchResult> => {
    try {
      const searcher = getTavilySearch(maxResults);
      const response = await searcher.invoke({ query });

      // Parse the response - TavilySearch returns a string with JSON
      let parsedResponse: {
        answer?: string;
        results?: Array<{
          title: string;
          url: string;
          content: string;
          score: number;
        }>;
      };

      if (typeof response === "string") {
        try {
          parsedResponse = JSON.parse(response);
        } catch {
          // If parsing fails, return the raw response as content
          return {
            query,
            results: [
              {
                title: "Search Results",
                url: "",
                content: response,
                score: 1.0,
              },
            ],
          };
        }
      } else {
        parsedResponse = response as typeof parsedResponse;
      }

      return {
        query,
        answer: parsedResponse.answer,
        results:
          parsedResponse.results?.map((r) => ({
            title: r.title,
            url: r.url,
            content: r.content,
            score: r.score,
          })) ?? [],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      throw new Error(`Web search failed: ${errorMessage}`);
    }
  },
  {
    name: "web_search",
    description:
      "Search the web for current information. Use this to research topics, find statistics, and gather sources. Returns relevant web pages with titles, URLs, and content snippets.",
    schema: z.object({
      query: z
        .string()
        .describe(
          "The search query (be specific and detailed for better results)"
        ),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Number of results to return (1-10, default: 5)"),
    }),
  }
);
