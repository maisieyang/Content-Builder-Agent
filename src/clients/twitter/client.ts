/**
 * Twitter Client
 *
 * Provides Twitter API integration with dual authentication support:
 * - OAuth: Direct API access with user tokens
 * - Arcade: Delegated auth for multi-user scenarios
 *
 * Copied from social-media-agent-from-scratch with minimal modifications.
 */

import { TwitterApi, TwitterApiReadWrite, EUploadMimeType } from "twitter-api-v2";
import Arcade from "@arcadeai/arcadejs";
import type { Image } from "../../utils/types.js";
import { imageUrlToBuffer } from "../../utils/index.js";

export type TwitterAuthMode = "oauth" | "arcade";

export interface TwitterOAuthConfig {
  appKey: string;
  appSecret: string;
  accessToken: string;
  accessSecret: string;
}

export interface TwitterArcadeConfig {
  arcadeApiKey: string;
  arcadeUserId: string;
}

export interface TwitterClientConfig {
  mode: TwitterAuthMode;
  oauth?: TwitterOAuthConfig;
  arcade?: TwitterArcadeConfig;
}

export interface TweetResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

export class TwitterClient {
  private mode: TwitterAuthMode;
  private oauthClient?: TwitterApiReadWrite;
  private arcadeClient?: Arcade;
  private arcadeUserId?: string;

  constructor(config: TwitterClientConfig) {
    this.mode = config.mode;

    if (config.mode === "oauth" && config.oauth) {
      this.oauthClient = new TwitterApi({
        appKey: config.oauth.appKey,
        appSecret: config.oauth.appSecret,
        accessToken: config.oauth.accessToken,
        accessSecret: config.oauth.accessSecret,
      }).readWrite;
    } else if (config.mode === "arcade" && config.arcade) {
      this.arcadeClient = new Arcade({
        apiKey: config.arcade.arcadeApiKey,
      });
      this.arcadeUserId = config.arcade.arcadeUserId;
    } else {
      throw new Error(
        `Invalid configuration for mode: ${config.mode}. Please provide the required config.`
      );
    }
  }

  static fromEnv(): TwitterClient {
    const oauthAppKey = process.env.TWITTER_APP_KEY;
    const oauthAppSecret = process.env.TWITTER_APP_SECRET;
    const oauthAccessToken = process.env.TWITTER_ACCESS_TOKEN;
    const oauthAccessSecret = process.env.TWITTER_ACCESS_SECRET;

    if (oauthAppKey && oauthAppSecret && oauthAccessToken && oauthAccessSecret) {
      return new TwitterClient({
        mode: "oauth",
        oauth: {
          appKey: oauthAppKey,
          appSecret: oauthAppSecret,
          accessToken: oauthAccessToken,
          accessSecret: oauthAccessSecret,
        },
      });
    }

    const arcadeApiKey = process.env.ARCADE_API_KEY;
    const arcadeUserId = process.env.ARCADE_USER_ID;

    if (arcadeApiKey && arcadeUserId) {
      return new TwitterClient({
        mode: "arcade",
        arcade: {
          arcadeApiKey,
          arcadeUserId,
        },
      });
    }

    throw new Error(
      "Missing Twitter credentials. Set either TWITTER_APP_KEY/SECRET/ACCESS_TOKEN/ACCESS_SECRET or ARCADE_API_KEY/USER_ID"
    );
  }

  async postTweet(text: string, image?: Image): Promise<TweetResult> {
    if (this.mode === "oauth") {
      return this.postTweetOAuth(text, image);
    } else {
      return this.postTweetArcade(text, image);
    }
  }

  private async postTweetOAuth(text: string, image?: Image): Promise<TweetResult> {
    if (!this.oauthClient) {
      return { success: false, error: "OAuth client not initialized" };
    }

    try {
      let mediaId: string | undefined;

      if (image) {
        mediaId = await this.uploadMediaOAuth(image);
      }

      let result;
      if (mediaId) {
        result = await this.oauthClient.v2.tweet({
          text,
          media: { media_ids: [mediaId] as [string] },
        });
      } else {
        result = await this.oauthClient.v2.tweet(text);
      }

      console.log("Tweet posted successfully:", result.data.id);

      return {
        success: true,
        tweetId: result.data.id,
        tweetUrl: `https://twitter.com/i/status/${result.data.id}`,
      };
    } catch (error) {
      console.error("Error posting tweet (OAuth):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async uploadMediaOAuth(image: Image): Promise<string | undefined> {
    if (!this.oauthClient) {
      return undefined;
    }

    try {
      const { buffer, contentType } = await imageUrlToBuffer(image.imageUrl);

      let mimeType: EUploadMimeType;
      if (contentType.includes("png")) {
        mimeType = EUploadMimeType.Png;
      } else if (contentType.includes("gif")) {
        mimeType = EUploadMimeType.Gif;
      } else if (contentType.includes("webp")) {
        mimeType = EUploadMimeType.Webp;
      } else {
        mimeType = EUploadMimeType.Jpeg;
      }

      const mediaId = await this.oauthClient.v1.uploadMedia(buffer, {
        mimeType,
      });

      console.log("Media uploaded successfully:", mediaId);
      return mediaId;
    } catch (error) {
      console.error("Error uploading media:", error);
      return undefined;
    }
  }

  private async postTweetArcade(text: string, _image?: Image): Promise<TweetResult> {
    if (!this.arcadeClient || !this.arcadeUserId) {
      return { success: false, error: "Arcade client not initialized" };
    }

    try {
      const result = await this.arcadeClient.tools.execute({
        tool_name: "X.PostTweet",
        input: {
          tweet_text: text,
        },
      } as Parameters<typeof this.arcadeClient.tools.execute>[0]);

      const output = result.output as Record<string, unknown> | undefined;

      if (output?.success) {
        const tweetId = output.tweet_id as string | undefined;
        console.log("Tweet posted via Arcade:", tweetId);

        return {
          success: true,
          tweetId,
          tweetUrl: tweetId ? `https://twitter.com/i/status/${tweetId}` : undefined,
        };
      }

      return {
        success: false,
        error: (output?.error as string) || "Unknown Arcade error",
      };
    } catch (error) {
      console.error("Error posting tweet (Arcade):", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async verifyCredentials(): Promise<{ authorized: boolean; username?: string; error?: string }> {
    if (this.mode === "oauth") {
      return this.verifyCredentialsOAuth();
    } else {
      return this.verifyCredentialsArcade();
    }
  }

  private async verifyCredentialsOAuth(): Promise<{
    authorized: boolean;
    username?: string;
    error?: string;
  }> {
    if (!this.oauthClient) {
      return { authorized: false, error: "OAuth client not initialized" };
    }

    try {
      const user = await this.oauthClient.v2.me();
      return {
        authorized: true,
        username: user.data.username,
      };
    } catch (error) {
      return {
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async verifyCredentialsArcade(): Promise<{
    authorized: boolean;
    username?: string;
    error?: string;
  }> {
    if (!this.arcadeClient || !this.arcadeUserId) {
      return { authorized: false, error: "Arcade client not initialized" };
    }

    try {
      const authResponse = await this.arcadeClient.auth.start(
        this.arcadeUserId,
        "x",
        { scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"] }
      );

      const isCompleted = authResponse.status === "completed";

      return {
        authorized: isCompleted,
        username: undefined,
        error: !isCompleted ? `Auth required: ${authResponse.url}` : undefined,
      };
    } catch (error) {
      return {
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getAuthMode(): TwitterAuthMode {
    return this.mode;
  }
}

export function createTwitterClient(): TwitterClient | undefined {
  try {
    return TwitterClient.fromEnv();
  } catch {
    console.warn("Twitter client not available - missing credentials");
    return undefined;
  }
}
