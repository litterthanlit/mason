"use node";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import { GEMINI_VISION_MODEL, geminiImageType } from "../lib/models";

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

const PROMPT = `Read this garment the way a stylist would: cut, cloth, color, visual weight.

Return ONLY valid JSON with no markdown fences:

{
  "category": "<one of: top, bottom, dress, outerwear, shoes, accessory, bag, other>",
  "subcategory": "<precise name a stylist would use: oversized washed black denim, dropped-shoulder merino knit, long wool coat — not 'jeans' or 'sweater'>",
  "colors": ["<2-5 hex codes of the cloth itself, not the background. Prefer dusty/dirty readings over candy. Black is #1A1A1A not #000000 if it is washed.>"],
  "pattern": "<what is actually on the cloth: solid, dirty wash, fine stripe, herringbone, graphic — be literal>",
  "fit": "<where the volume sits: slim, regular, oversized, relaxed, tailored, boxy, dropped-shoulder, wide-leg, cropped>",
  "season": ["<spring, summer, fall, winter — one or more>"],
  "occasions": ["<casual, work, formal, smart-casual, athletic, evening — attitude this cloth can hold, not a costume label>"],
  "material": "<fiber and hand if readable: merino, raw denim, washed cotton, leather, wool — omit if guessing>",
  "brand": "<only if a label is visible>",
  "confidence": <0.0-1.0>
}

Be specific. If unsure about brand, omit it.`;

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
    const model = genAI.getGenerativeModel({ model: GEMINI_VISION_MODEL });

    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      throw new Error(`Failed to fetch image: ${imageRes.status}`);
    }

    const buffer = await imageRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    const result = await model.generateContent([
      PROMPT,
      {
        inlineData: {
          data: base64,
          mimeType: geminiImageType(imageRes.headers.get("content-type")),
        },
      },
    ]);

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(cleaned);
    return garmentAttributesSchema.parse(parsed);
  } catch (err) {
    // Fail the job instead of saving a fake "clothing item" the user never sees flagged.
    console.error("[recognizeGarment] failed:", err);
    throw new Error("Could not read this garment. Try another photo.");
  }
}
