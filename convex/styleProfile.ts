import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { rateLimiter } from "./lib/rateLimits";
import { claimUpload } from "./lib/uploads";

// extractStyleDna only reads the first 10; reject more instead of silently dropping them.
const MAX_REFERENCES = 10;

const styleProfileValidator = v.object({
  _id: v.id("styleProfiles"),
  summary: v.string(),
  aesthetics: v.array(v.string()),
  palette: v.array(v.string()),
  colorTemperature: v.string(),
  silhouettes: v.array(v.string()),
  patterns: v.array(v.string()),
  avoid: v.array(v.string()),
  confidence: v.number(),
  referenceCount: v.number(),
});

export const get = authedQuery({
  args: {},
  returns: v.union(styleProfileValidator, v.null()),
  handler: async (ctx) => {
    return await ctx.db
      .query("styleProfiles")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .first();
  },
});

export const startExtraction = authedMutation({
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, { storageIds }) => {
    if (storageIds.length < 1) {
      throw new ConvexError("Add at least one inspiration photo");
    }
    if (storageIds.length > MAX_REFERENCES) {
      throw new ConvexError(`Use at most ${MAX_REFERENCES} inspiration photos`);
    }
    for (const storageId of storageIds) {
      await claimUpload(ctx, ctx.user._id, storageId);
    }
    await rateLimiter.limit(ctx, "extractStyleDna", { key: ctx.user._id, throws: true });

    await ctx.scheduler.runAfter(0, internal.styleProfileActions.extractProfile, {
      userId: ctx.user._id,
      storageIds,
    });
    return null;
  },
});

export const saveProfile = internalMutation({
  args: {
    userId: v.id("users"),
    storageIds: v.array(v.id("_storage")),
    result: v.object({
      summary: v.string(),
      aesthetics: v.array(v.string()),
      palette: v.array(v.string()),
      colorTemperature: v.string(),
      silhouettes: v.array(v.string()),
      patterns: v.array(v.string()),
      avoid: v.array(v.string()),
      confidence: v.number(),
    }),
  },
  returns: v.null(),
  handler: async (ctx, { userId, storageIds, result }) => {
    const existing = await ctx.db
      .query("styleProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();
    const data = {
      summary: result.summary,
      aesthetics: result.aesthetics,
      palette: result.palette,
      colorTemperature: result.colorTemperature,
      silhouettes: result.silhouettes,
      patterns: result.patterns,
      avoid: result.avoid,
      referenceStorageIds: storageIds,
      confidence: result.confidence,
      referenceCount: storageIds.length,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch("styleProfiles", existing._id, data);
    } else {
      await ctx.db.insert("styleProfiles", {
        userId,
        ...data,
        createdAt: now,
      });
    }

    await ctx.db.patch("users", userId, {
      onboardingComplete: true,
      updatedAt: now,
    });

    return null;
  },
});
