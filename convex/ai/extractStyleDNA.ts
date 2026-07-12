"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

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

const PROMPT = `Analyze these fashion inspiration images together to build a personal style DNA profile.

Return ONLY valid JSON with no markdown fences:

{
  "summary": "<2-3 sentence description of this person's style identity>",
  "aesthetics": ["<style adjectives: minimal, streetwear, old money, avant-garde, etc.>"],
  "palette": ["<3-8 hex color codes that define their palette>"],
  "colorTemperature": "<cool, neutral, or warm>",
  "silhouettes": ["<preferred fits and shapes: oversized, tailored, relaxed, etc.>"],
  "patterns": ["<patterns they gravitate toward: solid, stripes, etc.>"],
  "avoid": ["<styles, colors, or items they likely avoid>"],
  "confidence": <0.0-1.0>
}

Synthesize across all images. Be specific and actionable for a personal stylist.`;

const FALLBACK: StyleDnaResult = {
  summary: "A versatile style with clean lines and neutral tones.",
  aesthetics: ["minimal", "contemporary"],
  palette: ["#1A1A1A", "#FAFAFA", "#FF6B6B"],
  colorTemperature: "neutral",
  silhouettes: ["relaxed", "tailored"],
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
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const imageParts = await Promise.all(
      imageUrls.slice(0, 10).map(async (url) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${url}`);
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        const buffer = await res.arrayBuffer();
        return {
          inlineData: {
            data: Buffer.from(buffer).toString("base64"),
            mimeType: contentType as "image/jpeg" | "image/png" | "image/webp",
          },
        };
      }),
    );

    const result = await model.generateContent([PROMPT, ...imageParts]);
    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return styleDnaSchema.parse(parsed);
  } catch (err) {
    console.error("[extractStyleDna] failed:", err);
    return FALLBACK;
  }
}
