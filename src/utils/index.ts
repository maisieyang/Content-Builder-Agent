/**
 * Utility functions for Content Builder Agent
 *
 * Copied from social-media-agent-from-scratch with minimal modifications.
 */

import * as cheerio from "cheerio";
import type { Image, UrlType } from "./types.js";

/**
 * Blacklisted MIME types that should not be processed as images
 */
export const BLACKLISTED_MIME_TYPES = [
  "image/svg+xml",
  "image/x-icon",
  "image/bmp",
  "text/",
];

/**
 * Determines the type of a URL based on its hostname
 */
export function getUrlType(url: string): UrlType {
  let parsedUrl: URL | undefined;
  try {
    const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
    parsedUrl = new URL(formattedUrl);
  } catch {
    console.error("Failed to parse URL:", url);
    return undefined;
  }

  if (
    parsedUrl.hostname.includes("github") &&
    !parsedUrl.hostname.includes("github.io")
  ) {
    return "github";
  }

  if (
    parsedUrl.hostname.includes("youtube") ||
    parsedUrl.hostname.includes("youtu.be")
  ) {
    return "youtube";
  }

  if (
    parsedUrl.hostname.includes("twitter") ||
    parsedUrl.hostname.includes("x.com")
  ) {
    return "twitter";
  }

  if (
    parsedUrl.hostname.includes("reddit") ||
    parsedUrl.hostname.includes("np.reddit") ||
    parsedUrl.hostname.includes("redd.it")
  ) {
    return "reddit";
  }

  if (parsedUrl.host === "lu.ma") {
    return "luma";
  }

  return "general";
}

/**
 * Checks if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  if (!str || typeof str !== "string") {
    return false;
  }

  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetches an image from a URL and returns buffer with content type
 */
export async function imageUrlToBuffer(imageUrl: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  if (!isValidUrl(imageUrl)) {
    throw new Error("Invalid image URL provided");
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const imageBuffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return {
    buffer: imageBuffer,
    contentType,
  };
}

/**
 * Sleep for specified milliseconds
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches and extracts the main text content from a webpage
 */
export async function getPageText(url: string): Promise<string | undefined> {
  try {
    new URL(url);

    const timeoutMs = Number(process.env.PAGE_FETCH_TIMEOUT_MS ?? 20_000);
    const retries = Number(process.env.PAGE_FETCH_RETRIES ?? 2);

    let response: Response | undefined;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (
            attempt < retries &&
            (response.status === 429 || response.status >= 500)
          ) {
            await sleep(250 * Math.pow(2, attempt));
            continue;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        break;
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        const isAbort =
          e instanceof Error &&
          (e.name === "AbortError" || msg.toLowerCase().includes("aborted"));
        const isFetchFailed =
          e instanceof Error && msg.toLowerCase().includes("fetch failed");

        if (attempt < retries && (isAbort || isFetchFailed)) {
          await sleep(250 * Math.pow(2, attempt));
          continue;
        }

        throw e;
      } finally {
        clearTimeout(timeout);
      }
    }

    if (!response) {
      throw lastError instanceof Error
        ? lastError
        : new Error(`Failed to fetch ${url}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    $("script").remove();
    $("style").remove();
    $("head").remove();
    $("nav").remove();
    $("footer").remove();
    $("header").remove();

    const images = $("img")
      .map((_, img) => {
        const alt = $(img).attr("alt") || "";
        const src = $(img).attr("src") || "";
        return `[Image: ${alt}](${src})`;
      })
      .get();

    const text = $("body")
      .text()
      .replace(/\s+/g, " ")
      .replace(/\n+/g, " ")
      .trim();

    return `${text}\n\n${images.join("\n")}`;
  } catch (error) {
    console.error("Error fetching page:", error);
    return undefined;
  }
}

/**
 * Extracts all image URLs from markdown text
 */
export function extractAllImageUrlsFromMarkdown(text: string): string[] {
  const markdownImageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  const htmlImgRegex = /<img[^>]+src=["']([^"'>]+)["']/g;
  const urls: string[] = [];

  let match;
  while ((match = markdownImageRegex.exec(text)) !== null) {
    urls.push(match[2]);
  }
  while ((match = htmlImgRegex.exec(text)) !== null) {
    urls.push(match[1]);
  }

  return urls;
}

const BLACKLISTED_IMAGE_URL_ENDINGS = [".svg", ".ico", ".bmp"];
const BLACKLISTED_IMAGE_URLS = ["img.shields.io", "contrib.rocks"];

/**
 * Filters out unwanted image URLs
 */
export function filterUnwantedImageUrls(urls: string[]): string[] {
  return urls.filter(
    (url) =>
      !BLACKLISTED_IMAGE_URL_ENDINGS.some((ending) => url?.endsWith(ending)) &&
      !BLACKLISTED_IMAGE_URLS.some((blacklistedUrl) =>
        url.includes(blacklistedUrl)
      ) &&
      isValidUrl(url)
  );
}

/**
 * Processes an image input (URL, base64, or "remove")
 */
export async function processImageInput(
  imageInput: string
): Promise<Image | "remove" | undefined> {
  if (imageInput.toLowerCase() === "remove" || !imageInput) {
    return "remove";
  }

  if (isValidUrl(imageInput)) {
    const { contentType } = await imageUrlToBuffer(imageInput);

    if (BLACKLISTED_MIME_TYPES.some((mt) => contentType.startsWith(mt))) {
      return undefined;
    }

    return {
      imageUrl: imageInput,
      mimeType: contentType,
    };
  }

  return undefined;
}

// Re-export types
export type { Image, UrlType, PageContent, ExtractedContent } from "./types.js";

// Re-export environment utilities
export {
  requireEnv,
  getEnv,
  validateRequiredEnv,
  isWebSearchAvailable,
  isTwitterAvailable,
  isLinkedInAvailable,
  isImageGenerationAvailable,
  getAvailableFeatures,
  logFeatureAvailability,
} from "./env.js";
