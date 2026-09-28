import { v } from "convex/values";

export const garmentCategory = v.union(
  v.literal("top"),
  v.literal("bottom"),
  v.literal("dress"),
  v.literal("outerwear"),
  v.literal("shoes"),
  v.literal("accessory"),
  v.literal("bag"),
  v.literal("other"),
);

export const garmentAttributes = v.object({
  category: garmentCategory,
  subcategory: v.string(),
  colors: v.array(v.string()),
  pattern: v.string(),
  fit: v.string(),
  season: v.array(v.string()),
  occasions: v.array(v.string()),
  material: v.optional(v.string()),
  brand: v.optional(v.string()),
  confidence: v.number(),
});

export const jobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("complete"),
  v.literal("failed"),
);

export const recognitionType = v.union(v.literal("garment"), v.literal("style_dna"));
