"use node";

import { geminiImageType } from "../lib/models";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

export type ImageInput = { url: string };
export type ImageOutput = { data: ArrayBuffer; mimeType: string };

/** Thrown with a message that is safe to show the user. */
export class ImageGenerationError extends Error {}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
};

async function loadImage({ url }: ImageInput) {
  const res = await fetch(url);
  if (!res.ok) throw new ImageGenerationError("Could not load a photo for this render.");
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    inline_data: {
      mime_type: geminiImageType(res.headers.get("content-type")),
      data: buffer.toString("base64"),
    },
  };
}

/**
 * One Gemini image call: a text prompt plus reference images in, one image out.
 * Plain REST, because the installed @google/generative-ai SDK predates image output.
 */
export async function generateImage({
  model,
  prompt,
  images,
  aspectRatio = "3:4",
}: {
  model: string;
  prompt: string;
  images: ImageInput[];
  aspectRatio?: string;
}): Promise<ImageOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ImageGenerationError("Image rendering is not set up yet (GEMINI_API_KEY).");

  const parts = [{ text: prompt }, ...(await Promise.all(images.map(loadImage)))];
  const call = (withFormat: boolean) =>
    fetch(`${ENDPOINT}/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          ...(withFormat && { responseFormat: { image: { aspectRatio, imageSize: "1K" } } }),
        },
      }),
    });

  let res = await call(true);
  // Older image models (via the env overrides) reject `responseFormat`; the
  // prompt already asks for the frame, so retry once without it.
  if (res.status === 400) {
    console.warn(`[generateImage] ${model} rejected responseFormat:`, (await res.text()).slice(0, 300));
    res = await call(false);
  }
  if (!res.ok) {
    console.error(`[generateImage] ${model} ${res.status}:`, (await res.text()).slice(0, 500));
    throw new ImageGenerationError(
      res.status === 429 ? "The image model is busy. Try again in a minute." : "The render failed. Try again.",
    );
  }

  const json = (await res.json()) as GeminiResponse;
  if (json.promptFeedback?.blockReason) {
    throw new ImageGenerationError("The model would not render this photo. Try a different one.");
  }

  for (const part of json.candidates?.[0]?.content?.parts ?? []) {
    const inline = part.inlineData ?? (part.inline_data && {
      mimeType: part.inline_data.mime_type,
      data: part.inline_data.data,
    });
    if (inline?.data) {
      const bytes = Buffer.from(inline.data, "base64");
      return {
        data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
        mimeType: inline.mimeType ?? "image/png",
      };
    }
  }

  console.error("[generateImage] no image in response:", json.candidates?.[0]?.finishReason);
  throw new ImageGenerationError("The model returned no image. Try a different photo.");
}
