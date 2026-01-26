/**
 * LinkedIn Client
 *
 * Provides LinkedIn API integration with dual authentication support:
 * - OAuth: Direct API access with access token
 * - Arcade: Delegated auth for multi-user scenarios
 *
 * Copied from social-media-agent-from-scratch with minimal modifications.
 */

import Arcade from "@arcadeai/arcadejs";
import type { Image } from "../../utils/types.js";
import { imageUrlToBuffer } from "../../utils/index.js";

export type LinkedInAuthMode = "oauth" | "arcade";

export interface LinkedInOAuthConfig {
  accessToken: string;
  personUrn?: string;
  organizationId?: string;
}

export interface LinkedInArcadeConfig {
  arcadeApiKey: string;
  arcadeUserId: string;
}

export interface LinkedInClientConfig {
  mode: LinkedInAuthMode;
  oauth?: LinkedInOAuthConfig;
  arcade?: LinkedInArcadeConfig;
  postToOrganization?: boolean;
}

export interface LinkedInPostResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  error?: string;
}

const LINKEDIN_API_BASE = "https://api.linkedin.com/v2";

export class LinkedInClient {
  private mode: LinkedInAuthMode;
  private accessToken?: string;
  private personUrn?: string;
  private organizationId?: string;
  private arcadeClient?: Arcade;
  private arcadeUserId?: string;
  private postToOrganization: boolean;

  constructor(config: LinkedInClientConfig) {
    this.mode = config.mode;
    this.postToOrganization = config.postToOrganization ?? false;

    if (config.mode === "oauth" && config.oauth) {
      this.accessToken = config.oauth.accessToken;
      this.personUrn = config.oauth.personUrn;
      this.organizationId = config.oauth.organizationId;
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

  static fromEnv(postToOrganization?: boolean): LinkedInClient {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const personUrn = process.env.LINKEDIN_PERSON_URN;
    const organizationId = process.env.LINKEDIN_ORGANIZATION_ID;

    if (accessToken) {
      return new LinkedInClient({
        mode: "oauth",
        oauth: {
          accessToken,
          personUrn,
          organizationId,
        },
        postToOrganization,
      });
    }

    const arcadeApiKey = process.env.ARCADE_API_KEY;
    const arcadeUserId = process.env.ARCADE_USER_ID;

    if (arcadeApiKey && arcadeUserId) {
      return new LinkedInClient({
        mode: "arcade",
        arcade: {
          arcadeApiKey,
          arcadeUserId,
        },
        postToOrganization,
      });
    }

    throw new Error(
      "Missing LinkedIn credentials. Set either LINKEDIN_ACCESS_TOKEN or ARCADE_API_KEY/USER_ID"
    );
  }

  async postToLinkedIn(text: string, image?: Image): Promise<LinkedInPostResult> {
    if (this.mode === "oauth") {
      return this.postOAuth(text, image);
    } else {
      return this.postArcade(text, image);
    }
  }

  private async postOAuth(text: string, image?: Image): Promise<LinkedInPostResult> {
    if (!this.accessToken) {
      return { success: false, error: "Access token not configured" };
    }

    try {
      const authorUrn = await this.getAuthorUrn();
      if (!authorUrn) {
        return { success: false, error: "Could not determine author URN" };
      }

      let mediaAsset: string | undefined;

      if (image) {
        mediaAsset = await this.uploadMediaOAuth(image, authorUrn);
      }

      const postPayload = this.buildPostPayload(text, authorUrn, mediaAsset);

      const response = await fetch(`${LINKEDIN_API_BASE}/ugcPosts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify(postPayload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`);
      }

      const postId = response.headers.get("x-restli-id");
      console.log("LinkedIn post created:", postId);

      return {
        success: true,
        postId: postId || undefined,
        postUrl: postId ? `https://www.linkedin.com/feed/update/${postId}` : undefined,
      };
    } catch (error) {
      console.error("Error posting to LinkedIn (OAuth):", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async getAuthorUrn(): Promise<string | undefined> {
    if (this.postToOrganization && this.organizationId) {
      return `urn:li:organization:${this.organizationId}`;
    }

    if (this.personUrn) {
      return this.personUrn;
    }

    if (this.accessToken) {
      try {
        const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        });

        if (response.ok) {
          const profile = (await response.json()) as Record<string, unknown>;
          return `urn:li:person:${profile.id}`;
        }
      } catch (error) {
        console.error("Error fetching LinkedIn profile:", error);
      }
    }

    return undefined;
  }

  private buildPostPayload(
    text: string,
    authorUrn: string,
    mediaAsset?: string
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      author: authorUrn,
      lifecycleState: "PUBLISHED",
      specificContent: {
        "com.linkedin.ugc.ShareContent": {
          shareCommentary: {
            text,
          },
          shareMediaCategory: mediaAsset ? "IMAGE" : "NONE",
          ...(mediaAsset && {
            media: [
              {
                status: "READY",
                media: mediaAsset,
              },
            ],
          }),
        },
      },
      visibility: {
        "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
      },
    };

    return payload;
  }

  private async uploadMediaOAuth(
    image: Image,
    authorUrn: string
  ): Promise<string | undefined> {
    if (!this.accessToken) {
      return undefined;
    }

    try {
      const registerResponse = await fetch(
        `${LINKEDIN_API_BASE}/assets?action=registerUpload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            registerUploadRequest: {
              recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
              owner: authorUrn,
              serviceRelationships: [
                {
                  relationshipType: "OWNER",
                  identifier: "urn:li:userGeneratedContent",
                },
              ],
            },
          }),
        }
      );

      if (!registerResponse.ok) {
        throw new Error(`Failed to register upload: ${registerResponse.status}`);
      }

      const registerData = (await registerResponse.json()) as Record<string, unknown>;
      const value = registerData.value as Record<string, unknown>;
      const uploadMechanism = value.uploadMechanism as Record<string, unknown>;
      const httpRequest = uploadMechanism[
        "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
      ] as Record<string, unknown>;
      const uploadUrl = httpRequest.uploadUrl as string;
      const asset = value.asset as string;

      const { buffer, contentType } = await imageUrlToBuffer(image.imageUrl);

      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": contentType,
        },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image: ${uploadResponse.status}`);
      }

      console.log("LinkedIn media uploaded:", asset);
      return asset;
    } catch (error) {
      console.error("Error uploading media to LinkedIn:", error);
      return undefined;
    }
  }

  private async postArcade(text: string, _image?: Image): Promise<LinkedInPostResult> {
    if (!this.arcadeClient || !this.arcadeUserId) {
      return { success: false, error: "Arcade client not initialized" };
    }

    try {
      const result = await this.arcadeClient.tools.execute({
        tool_name: "LinkedIn.CreatePost",
        input: {
          text,
          visibility: "PUBLIC",
        },
      } as Parameters<typeof this.arcadeClient.tools.execute>[0]);

      const output = result.output as Record<string, unknown> | undefined;

      if (output?.success) {
        const postId = output.post_id as string | undefined;
        console.log("LinkedIn post created via Arcade:", postId);

        return {
          success: true,
          postId,
          postUrl: postId
            ? `https://www.linkedin.com/feed/update/${postId}`
            : undefined,
        };
      }

      return {
        success: false,
        error: (output?.error as string) || "Unknown Arcade error",
      };
    } catch (error) {
      console.error("Error posting to LinkedIn (Arcade):", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  }

  async verifyCredentials(): Promise<{
    authorized: boolean;
    name?: string;
    error?: string;
  }> {
    if (this.mode === "oauth") {
      return this.verifyCredentialsOAuth();
    } else {
      return this.verifyCredentialsArcade();
    }
  }

  private async verifyCredentialsOAuth(): Promise<{
    authorized: boolean;
    name?: string;
    error?: string;
  }> {
    if (!this.accessToken) {
      return { authorized: false, error: "Access token not configured" };
    }

    try {
      const response = await fetch(`${LINKEDIN_API_BASE}/me`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      if (response.ok) {
        const profile = (await response.json()) as Record<string, unknown>;
        return {
          authorized: true,
          name: `${profile.localizedFirstName} ${profile.localizedLastName}`,
        };
      }

      return {
        authorized: false,
        error: `API returned ${response.status}`,
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
    name?: string;
    error?: string;
  }> {
    if (!this.arcadeClient || !this.arcadeUserId) {
      return { authorized: false, error: "Arcade client not initialized" };
    }

    try {
      const authResponse = await this.arcadeClient.auth.start(
        this.arcadeUserId,
        "linkedin",
        { scopes: ["w_member_social", "r_liteprofile"] }
      );

      const isCompleted = authResponse.status === "completed";

      return {
        authorized: isCompleted,
        name: undefined,
        error: !isCompleted ? `Auth required: ${authResponse.url}` : undefined,
      };
    } catch (error) {
      return {
        authorized: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getAuthMode(): LinkedInAuthMode {
    return this.mode;
  }
}

export function createLinkedInClient(
  postToOrganization?: boolean
): LinkedInClient | undefined {
  try {
    return LinkedInClient.fromEnv(postToOrganization);
  } catch {
    console.warn("LinkedIn client not available - missing credentials");
    return undefined;
  }
}
