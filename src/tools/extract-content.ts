/**
 * Content Extraction Tool
 *
 * Extracts page content, relevant links, and images from URLs.
 * Uses Firecrawl for web scraping with fallback to basic HTML fetch.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { scrapeWithFirecrawl } from "../utils/firecrawl.js";
import {
  getPageText,
  getUrlType,
  extractAllImageUrlsFromMarkdown,
  filterUnwantedImageUrls,
} from "../utils/index.js";
import type { ExtractedContent, PageContent } from "../utils/types.js";

/**
 * Gets the contents of a URL using FireCrawl (if available) or basic HTML fetch.
 */
async function getUrlContents(
  url: string
): Promise<{ content: string; imageUrls?: string[] } | undefined> {
  // Try FireCrawl first if configured
  const firecrawlResult = await scrapeWithFirecrawl(url);
  if (firecrawlResult && firecrawlResult.content) {
    return firecrawlResult;
  }

  // Fall back to basic HTML fetch
  const text = await getPageText(url);
  if (text) {
    return { content: text };
  }

  return undefined;
}

/**
 * Extracts content from a single URL
 */
async function extractFromUrl(url: string): Promise<{
  success: boolean;
  pageContent?: PageContent;
  imageOptions?: string[];
  error?: string;
}> {
  try {
    const urlType = getUrlType(url);
    console.log(`Extracting content from ${url} (type: ${urlType})`);

    const urlContents = await getUrlContents(url);
    if (!urlContents) {
      return {
        success: false,
        error: `Failed to fetch content from ${url}`,
      };
    }

    // Extract images from content
    const extractedImages = filterUnwantedImageUrls(
      extractAllImageUrlsFromMarkdown(urlContents.content)
    );

    const imageOptions =
      urlContents.imageUrls && urlContents.imageUrls.length > 0
        ? urlContents.imageUrls
        : extractedImages;

    return {
      success: true,
      pageContent: {
        url,
        content: urlContents.content,
      },
      imageOptions,
    };
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export const extractContentTool = tool(
  async ({ urls }): Promise<ExtractedContent> => {
    const pageContents: PageContent[] = [];
    const relevantLinks: string[] = [];
    const allImageOptions: string[] = [];
    const failedUrls: string[] = [];

    // Process URLs in parallel
    const results = await Promise.all(urls.map((url) => extractFromUrl(url)));

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const result = results[i];

      if (result.success && result.pageContent) {
        pageContents.push(result.pageContent);
        relevantLinks.push(url);
        if (result.imageOptions) {
          allImageOptions.push(...result.imageOptions);
        }
      } else {
        failedUrls.push(url);
        console.warn(`Failed to extract from ${url}: ${result.error}`);
      }
    }

    // Deduplicate image options
    const imageOptions = [...new Set(allImageOptions)];

    return {
      pageContents,
      relevantLinks,
      imageOptions,
      failedUrls,
    };
  },
  {
    name: "extract_content",
    description:
      "Extract page content, relevant links, and images from URLs. Use this to gather information from web pages for content creation. Returns extracted text content, image URLs, and any failed URLs.",
    schema: z.object({
      urls: z
        .array(z.string().url())
        .describe("List of URLs to extract content from"),
    }),
  }
);
