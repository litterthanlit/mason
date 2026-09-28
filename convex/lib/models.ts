import { anthropic } from "@ai-sdk/anthropic";

/** Every model id the backend uses, in one place. */
export const stylistModel = anthropic("claude-sonnet-5");

// Override in the Convex dashboard to move to a newer Flash model without a deploy.
export const GEMINI_VISION_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const GEMINI_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

/** The app always uploads JPEGs; trust the header only when Gemini accepts it. */
export function geminiImageType(contentType: string | null) {
  const type = contentType?.split(";")[0].trim().toLowerCase();
  return type && GEMINI_IMAGE_TYPES.has(type) ? type : "image/jpeg";
}
