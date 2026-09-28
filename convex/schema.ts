import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { garmentAttributes, garmentCategory, jobStatus, recognitionType } from "./lib/validators";

const timestamp = v.number();

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    subject: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    onboardingComplete: v.boolean(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_subject", ["subject"]),

  wardrobeItems: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    imageUrl: v.string(),
    name: v.string(),
    category: garmentCategory,
    subcategory: v.string(),
    colors: v.array(v.string()),
    pattern: v.string(),
    fit: v.string(),
    season: v.array(v.string()),
    occasions: v.array(v.string()),
    material: v.optional(v.string()),
    brand: v.optional(v.string()),
    aiConfidence: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_user_and_category", ["userId", "category"]),

  // Who uploaded each file; claimed on first use (see lib/uploads.ts).
  uploads: defineTable({
    storageId: v.id("_storage"),
    userId: v.id("users"),
    createdAt: timestamp,
  }).index("by_storage", ["storageId"]),

  recognitionJobs: defineTable({
    userId: v.id("users"),
    storageId: v.id("_storage"),
    type: recognitionType,
    status: jobStatus,
    progress: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    result: v.optional(garmentAttributes),
    styleDnaResult: v.optional(v.any()),
    error: v.optional(v.string()),
    wardrobeItemId: v.optional(v.id("wardrobeItems")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_user_and_status", ["userId", "status"])
    .index("by_storage", ["storageId"]),

  styleProfiles: defineTable({
    userId: v.id("users"),
    summary: v.string(),
    aesthetics: v.array(v.string()),
    palette: v.array(v.string()),
    colorTemperature: v.string(),
    silhouettes: v.array(v.string()),
    patterns: v.array(v.string()),
    avoid: v.array(v.string()),
    referenceStorageIds: v.array(v.id("_storage")),
    confidence: v.number(),
    referenceCount: v.number(),
    createdAt: timestamp,
    updatedAt: timestamp,
  }).index("by_user", ["userId"]),

  outfits: defineTable({
    userId: v.id("users"),
    name: v.optional(v.string()),
    itemIds: v.array(v.id("wardrobeItems")),
    occasion: v.string(),
    weather: v.optional(v.string()),
    notes: v.optional(v.string()),
    rationale: v.optional(v.string()),
    agentGenerated: v.boolean(),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_user_and_occasion", ["userId", "occasion"]),

  stylingSessions: defineTable({
    userId: v.id("users"),
    threadId: v.string(),
    occasion: v.optional(v.string()),
    weather: v.optional(v.string()),
    suggestedOutfitIds: v.array(v.id("outfits")),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
    .index("by_user", ["userId"])
    .index("by_thread", ["threadId"]),
});
