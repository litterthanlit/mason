"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { GEMINI_VISION_MODEL, geminiImageType } from "../lib/models";

export const styleDnaSchema = z.object({
  summary: z.string(),
  aesthetics: z.array(z.string()).min(2).max(8),
  palette: z.array(z.string()).min(3).max(8),
  colorTemperature: z.enum(["cool", "neutral", "warm"]),
  silhouettes: z.array(z.string()).min(1).max(6),
  patterns: z.array(z.string()).min(1).max(6),
  avoid: z.array(z.string()).min(0).max(8),
  confidence: z.number().min(0).max(1),
});

export type StyleDnaResult = z.infer<typeof styleDnaSchema>;

const PROMPT = `You are a fashion editor reading reference images to write a personal style brief.

Look the way a good house looks: silhouette first, then proportion, texture, color temperature, attitude. Do not tag Pinterest aesthetics.

Read across all images. Synthesize. Be specific enough that a stylist could dress this person tomorrow without seeing the photos.

Return ONLY valid JSON with no markdown fences:

{
  "summary": "<2-3 sentences. Name the attitude (severe, easy, melancholic, precise). Name where the volume sits. Name the tension they repeat — e.g. oversized knit against a slim leg, raw denim against a clean shoe. Not 'versatile contemporary style.'>",
  "aesthetics": ["<precise language: scandinavian contrast, quiet luxury, 90s reduction, washed tailoring — not generic 'minimal' or 'streetwear' unless that is truly the whole story>"],
  "palette": ["<3-8 hex codes from the clothes, not the backgrounds. Prefer dusty, dirty, slightly off tones when that is what you see.>"],
  "colorTemperature": "<cool, neutral, or warm>",
  "silhouettes": ["<how volume is used, as phrases: dropped-shoulder coat over slim trouser, long hem, high-rise wide leg, close through the shoulder>"],
  "patterns": ["<what actually appears: solid, dirty wash, fine stripe, no graphic — be literal>"],
  "avoid": ["<what would break this eye: candy brights, skinny glossy, logo-forward, matching sets, dainty evening — only what the images argue against>"],
  "confidence": <0.0-1.0>
}

Do not invent a house they are copying. Describe the eye they already have.`;

const FALLBACK: StyleDnaResult = {
  summary:
    "A reduced wardrobe with clean lines and a neutral, slightly cool temperature. Volume is unresolved — infer from new pieces as they arrive.",
  aesthetics: ["reduced contemporary", "neutral tailoring"],
  palette: ["#1A1A1A", "#E8E4DC", "#6B6B6B"],
  colorTemperature: "neutral",
  silhouettes: ["unresolved — wait for more references"],
  patterns: ["solid"],
  avoid: [],
  confidence: 0.3,
};

export async function extractStyleDna(imageUrls: string[]): Promise<StyleDnaResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || imageUrls.length === 0) {
    return FALLBACK;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });

    const imageParts = await Promise.all(
      imageUrls.slice(0, 10).map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        const buffer = await res.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: geminiImageType(res.headers.get("content-type")),
          },
        };
      }),
    );

    const result = await model.generateContent([PROMPT, ...imageParts]);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned) as unknown;
    return styleDnaSchema.parse(parsed);
  } catch (err) {
    // A placeholder profile would be saved as the user's real DNA; fail loudly instead.
    console.error("[extractStyleDna] failed:", err);
    throw new Error("Could not read these references. Try again.");
  }
}
