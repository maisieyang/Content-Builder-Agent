/**
 * Shared types for Content Builder Agent
 *
 * Copied from social-media-agent-from-scratch with minimal modifications.
 */

/**
 * Image with URL and MIME type for media uploads
 */
export type Image = {
  imageUrl: string;
  mimeType: string;
};

/**
 * Page content extracted from URL scraping
 */
export type PageContent = {
  /** The original URL */
  url: string;
  /** Extracted text content */
  content: string;
  /** Page title if available */
  title?: string;
  /** Extracted images */
  images?: Image[];
};

/**
 * Extracted content result from URLs
 */
export type ExtractedContent = {
  /** Successfully extracted page contents */
  pageContents: PageContent[];
  /** Relevant links found */
  relevantLinks: string[];
  /** Image options extracted */
  imageOptions: string[];
  /** URLs that failed to extract */
  failedUrls: string[];
};

/**
 * Social media platform types
 */
export type SocialPlatform = "twitter" | "linkedin";

/**
 * Post status in the workflow
 */
export type PostStatus =
  | "pending"
  | "approved"
  | "scheduled"
  | "published"
  | "rejected";

/**
 * Generated post with metadata
 */
export type GeneratedPost = {
  /** Post content text */
  content: string;
  /** Target platform */
  platform: SocialPlatform;
  /** Post status */
  status: PostStatus;
  /** Attached images */
  images?: Image[];
  /** Source URLs used to generate this post */
  sourceUrls: string[];
};

/**
 * URL type for content categorization
 */
export type UrlType =
  | "github"
  | "youtube"
  | "general"
  | "twitter"
  | "reddit"
  | "luma"
  | undefined;
