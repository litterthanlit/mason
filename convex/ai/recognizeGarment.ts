"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

export const garmentCategorySchema = z.enum([
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessory",
  "bag",
  "other",
]);

export const garmentAttributesSchema = z.object({
  category: garmentCategorySchema,
  subcategory: z.string(),
  colors: z.array(z.string()).min(1).max(6),
  pattern: z.string(),
  fit: z.string(),
  season: z.array(z.string()).min(1),
  occasions: z.array(z.string()).min(1),
  material: z.string().optional(),
  brand: z.string().optional(),
  confidence: z.number().min(0).max(1),
});

export type GarmentAttributes = z.infer<typeof garmentAttributesSchema>;

const PROMPT = `Analyze this clothing or fashion item photo for a personal wardrobe app.

Return ONLY valid JSON with no markdown fences:

{
  "category": "<one of: top, bottom, dress, outerwear, shoes, accessory, bag, other>",
  "subcategory": "<specific item name, e.g. oversized wool blazer>",
  "colors": ["<3-5 hex color codes of dominant colors>"],
  "pattern": "<solid, striped, plaid, floral, graphic, etc.>",
  "fit": "<slim, regular, oversized, relaxed, tailored, etc.>",
  "season": ["<spring, summer, fall, winter — one or more>"],
  "occasions": ["<casual, work, formal, smart-casual, athletic, evening — one or more>"],
  "material": "<fabric if identifiable, or omit>",
  "brand": "<brand if visible, or omit>",
  "confidence": <0.0-1.0 confidence in recognition>
}

Be specific and practical. If unsure about brand, omit it. Use hex colors when possible.`;

const FALLBACK: GarmentAttributes = {
  category: "other",
  subcategory: "clothing item",
  colors: ["#666666"],
  pattern: "solid",
  fit: "regular",
  season: ["all-season"],
  occasions: ["casual"],
  confidence: 0.3,
};

export async function recognizeGarment(imageUrl: string): Promise<GarmentAttributes> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[recognizeGarment] GEMINI_API_KEY not set, using fallback");
    return FALLBACK;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.status}`);
    }

    const contentType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType: contentType as "image/jpeg" | "image/png" | "image/webp",
        },
      },
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return garmentAttributesSchema.parse(parsed);
  } catch (err) {
    console.error("[recognizeGarment] failed:", err);
    return FALLBACK;
  }
}
