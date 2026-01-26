/**
 * Publish Post Tool
 *
 * Publishes content to Twitter or LinkedIn.
 * Supports optional image attachment.
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import {
  createTwitterClient,
  createLinkedInClient,
  type SocialPostResult,
} from "../clients/index.js";
import type { Image } from "../utils/types.js";
import { imageUrlToBuffer } from "../utils/index.js";

/**
 * Loads an image from a file path and returns Image object
 */
async function loadImageFromPath(imagePath: string): Promise<Image | undefined> {
  try {
    // Resolve path relative to output directory
    const fullPath = resolve(process.cwd(), "output", imagePath);

    if (!existsSync(fullPath)) {
      console.warn(`Image file not found: ${fullPath}`);
      return undefined;
    }

    // Read file and determine MIME type
    const buffer = readFileSync(fullPath);
    const base64 = buffer.toString("base64");

    // Determine MIME type from extension
    let mimeType = "image/png";
    if (imagePath.endsWith(".jpg") || imagePath.endsWith(".jpeg")) {
      mimeType = "image/jpeg";
    } else if (imagePath.endsWith(".gif")) {
      mimeType = "image/gif";
    } else if (imagePath.endsWith(".webp")) {
      mimeType = "image/webp";
    }

    // Create a data URL for the image
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return {
      imageUrl: dataUrl,
      mimeType,
    };
  } catch (error) {
    console.error(`Error loading image from ${imagePath}:`, error);
    return undefined;
  }
}

export const publishPostTool = tool(
  async ({ platform, content, imagePath }): Promise<SocialPostResult> => {
    console.log(`Publishing to ${platform}...`);

    // Load image if provided
    let image: Image | undefined;
    if (imagePath) {
      image = await loadImageFromPath(imagePath);
      if (!image) {
        console.warn(`Could not load image from ${imagePath}, proceeding without image`);
      }
    }

    if (platform === "twitter") {
      const twitterClient = createTwitterClient();
      if (!twitterClient) {
        return {
          platform: "twitter",
          success: false,
          error: "Twitter client not available. Check TWITTER_* environment variables.",
        };
      }

      try {
        const result = await twitterClient.postTweet(content, image);
        return {
          platform: "twitter",
          success: result.success,
          postId: result.tweetId,
          postUrl: result.tweetUrl,
          error: result.error,
        };
      } catch (error) {
        return {
          platform: "twitter",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } else if (platform === "linkedin") {
      const linkedInClient = createLinkedInClient();
      if (!linkedInClient) {
        return {
          platform: "linkedin",
          success: false,
          error: "LinkedIn client not available. Check LINKEDIN_* environment variables.",
        };
      }

      try {
        const result = await linkedInClient.postToLinkedIn(content, image);
        return {
          platform: "linkedin",
          success: result.success,
          postId: result.postId,
          postUrl: result.postUrl,
          error: result.error,
        };
      } catch (error) {
        return {
          platform: "linkedin",
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }

    return {
      platform,
      success: false,
      error: `Unknown platform: ${platform}`,
    };
  },
  {
    name: "publish_post",
    description:
      "Publish content to social media platforms. Supports Twitter and LinkedIn. Optionally attach an image from the output directory.",
    schema: z.object({
      platform: z
        .enum(["twitter", "linkedin"])
        .describe("Target platform for publishing"),
      content: z.string().describe("The post content to publish"),
      imagePath: z
        .string()
        .optional()
        .describe(
          "Relative path to the image in the output directory (e.g., 'linkedin/my-post/image.png')"
        ),
    }),
  }
);
