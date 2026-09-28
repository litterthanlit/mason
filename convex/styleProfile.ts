import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { rateLimiter } from "./lib/rateLimits";
import { jobStatus } from "./lib/validators";
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

    const now = Date.now();
    const jobId = await ctx.db.insert("styleDnaJobs", {
      userId: ctx.user._id,
      status: "running",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.styleProfileActions.extractProfile, {
      userId: ctx.user._id,
      jobId,
      storageIds,
    });
    return null;
  },
});

/** Latest extraction, so Home can say "reading" or "failed" instead of nothing. */
export const latestJob = authedQuery({
  args: {},
  returns: v.union(
    v.object({
      _id: v.id("styleDnaJobs"),
      status: jobStatus,
      error: v.optional(v.string()),
      createdAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const job = await ctx.db
      .query("styleDnaJobs")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .first();
    if (!job) return null;
    return { _id: job._id, status: job.status, error: job.error, createdAt: job.createdAt };
  },
});

export const failJob = internalMutation({
  args: { jobId: v.id("styleDnaJobs"), error: v.string() },
  returns: v.null(),
  handler: async (ctx, { jobId, error }) => {
    await ctx.db.patch("styleDnaJobs", jobId, { status: "failed", error, updatedAt: Date.now() });
    return null;
  },
});

export const saveProfile = internalMutation({
  args: {
    userId: v.id("users"),
    jobId: v.id("styleDnaJobs"),
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
  handler: async (ctx, { userId, jobId, storageIds, result }) => {
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
    await ctx.db.patch("styleDnaJobs", jobId, { status: "complete", updatedAt: now });

    return null;
  },
});
