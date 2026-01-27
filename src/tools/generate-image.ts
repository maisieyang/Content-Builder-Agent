/**
 * Image Generation Tool - Tongyi Wanxiang Integration
 *
 * Generates images using Alibaba's Tongyi Wanxiang (通义万象) API.
 * Uses the async task API for image generation.
 *
 * Required env:
 * - DASHSCOPE_API_KEY
 *
 * API Reference:
 * https://help.aliyun.com/zh/model-studio/developer-reference/text-to-image
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { writeFileSync, mkdirSync } from "fs";
import { dirname, resolve } from "path";
import { requireEnv } from "../utils/index.js";

const DASHSCOPE_API_BASE = "https://dashscope.aliyuncs.com/api/v1";
const DEFAULT_MODEL = "wanx2.1-t2i-turbo"; // Fast model for image generation

// Polling configuration
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 60; // 2 minutes max wait

interface TaskResponse {
  request_id: string;
  output: {
    task_id: string;
    task_status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
    results?: Array<{
      url: string;
    }>;
    message?: string;
  };
}

/**
 * Create an async image generation task
 */
async function createImageTask(
  prompt: string,
  model: string = DEFAULT_MODEL
): Promise<string> {
  const apiKey = requireEnv("DASHSCOPE_API_KEY", "image generation");

  const response = await fetch(
    `${DASHSCOPE_API_BASE}/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input: {
          prompt,
        },
        parameters: {
          size: "1024*1024",
          n: 1,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create image task: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as TaskResponse;
  return data.output.task_id;
}

/**
 * Poll task status until completion
 */
async function pollTaskStatus(taskId: string): Promise<string> {
  const apiKey = requireEnv("DASHSCOPE_API_KEY", "image generation");

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    const response = await fetch(
      `${DASHSCOPE_API_BASE}/tasks/${taskId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to poll task status: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as TaskResponse;
    const status = data.output.task_status;

    if (status === "SUCCEEDED") {
      const results = data.output.results;
      if (!results || results.length === 0) {
        throw new Error("Task succeeded but no image URL returned");
      }
      return results[0].url;
    }

    if (status === "FAILED") {
      throw new Error(`Image generation failed: ${data.output.message || "Unknown error"}`);
    }

    // Still pending or running, wait and retry
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(`Image generation timed out after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 1000} seconds`);
}

/**
 * Download image from URL and save to local path
 */
async function downloadImage(imageUrl: string, outputPath: string): Promise<void> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Ensure directory exists
  const dir = dirname(outputPath);
  mkdirSync(dir, { recursive: true });

  // Write file
  writeFileSync(outputPath, buffer);
}

export interface GenerateImageResult {
  success: boolean;
  prompt: string;
  outputPath: string;
  imageUrl?: string;
  error?: string;
}

export const generateImageTool = tool(
  async ({
    prompt,
    outputPath,
    model = DEFAULT_MODEL,
  }): Promise<GenerateImageResult> => {
    try {
      // Get the output directory from environment or use default
      const outputRoot = process.env.OUTPUT_DIR || resolve(process.cwd(), "output");
      const fullPath = resolve(outputRoot, outputPath);

      // Step 1: Create async task
      const taskId = await createImageTask(prompt, model);

      // Step 2: Poll for completion
      const imageUrl = await pollTaskStatus(taskId);

      // Step 3: Download and save image
      await downloadImage(imageUrl, fullPath);

      return {
        success: true,
        prompt,
        outputPath: fullPath,
        imageUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        prompt,
        outputPath,
        error: errorMessage,
      };
    }
  },
  {
    name: "generate_image",
    description:
      "Generate an image using AI (Tongyi Wanxiang). Use this to create cover images for blog posts and social media content. The image will be saved to the specified path.",
    schema: z.object({
      prompt: z
        .string()
        .describe(
          "Detailed description of the image to generate. Include subject, style, composition, colors, and mood. For best results, be specific and descriptive."
        ),
      outputPath: z
        .string()
        .describe(
          "Relative path to save the generated image (e.g., 'blogs/my-post/hero.png'). Will be saved under the output directory."
        ),
      model: z
        .string()
        .optional()
        .default(DEFAULT_MODEL)
        .describe(
          "Model to use for generation. Options: 'wanx2.1-t2i-turbo' (fast), 'wanx2.1-t2i-plus' (quality). Default: turbo"
        ),
    }),
  }
);
