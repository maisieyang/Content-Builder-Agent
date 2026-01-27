/**
 * Environment Variable Utilities
 *
 * Centralized validation and access for required environment variables.
 */

export interface EnvConfig {
  // Required for LLM
  dashscopeApiKey: string;
  dashscopeBaseUrl: string;
  defaultLlmModel: string;

  // Optional for tools
  tavilyApiKey?: string;

  // Optional for publishing
  twitterApiKey?: string;
  twitterApiSecret?: string;
  twitterAccessToken?: string;
  twitterAccessSecret?: string;
  linkedinAccessToken?: string;
}

/**
 * Validates that a required environment variable is set
 */
export function requireEnv(name: string, context?: string): string {
  const value = process.env[name];
  if (!value) {
    const contextMsg = context ? ` (required for ${context})` : "";
    throw new Error(
      `Missing ${name} environment variable${contextMsg}. ` +
        `Set it in your .env file.`
    );
  }
  return value;
}

/**
 * Gets an optional environment variable with a default value
 */
export function getEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

/**
 * Validates all required environment variables at startup
 * Call this early to fail fast if configuration is missing
 */
export function validateRequiredEnv(): void {
  requireEnv("DASHSCOPE_API_KEY", "LLM API calls");
}

/**
 * Checks if web search is available (Tavily API key set)
 */
export function isWebSearchAvailable(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

/**
 * Checks if Twitter publishing is available
 */
export function isTwitterAvailable(): boolean {
  return !!(
    process.env.TWITTER_API_KEY &&
    process.env.TWITTER_API_SECRET &&
    process.env.TWITTER_ACCESS_TOKEN &&
    process.env.TWITTER_ACCESS_SECRET
  );
}

/**
 * Checks if LinkedIn publishing is available
 */
export function isLinkedInAvailable(): boolean {
  return !!process.env.LINKEDIN_ACCESS_TOKEN;
}

/**
 * Checks if image generation is available (uses DashScope API)
 */
export function isImageGenerationAvailable(): boolean {
  return !!process.env.DASHSCOPE_API_KEY;
}

/**
 * Returns a summary of available features based on environment configuration
 */
export function getAvailableFeatures(): {
  llm: boolean;
  webSearch: boolean;
  imageGeneration: boolean;
  twitterPublishing: boolean;
  linkedinPublishing: boolean;
} {
  return {
    llm: !!process.env.DASHSCOPE_API_KEY,
    webSearch: isWebSearchAvailable(),
    imageGeneration: isImageGenerationAvailable(),
    twitterPublishing: isTwitterAvailable(),
    linkedinPublishing: isLinkedInAvailable(),
  };
}

/**
 * Logs the current feature availability (useful for debugging)
 */
export function logFeatureAvailability(): void {
  const features = getAvailableFeatures();
  console.log("📋 Feature Availability:");
  console.log(`   LLM (DashScope): ${features.llm ? "✅" : "❌"}`);
  console.log(`   Web Search (Tavily): ${features.webSearch ? "✅" : "❌"}`);
  console.log(`   Image Generation: ${features.imageGeneration ? "✅" : "❌"}`);
  console.log(`   Twitter Publishing: ${features.twitterPublishing ? "✅" : "❌"}`);
  console.log(`   LinkedIn Publishing: ${features.linkedinPublishing ? "✅" : "❌"}`);
}
