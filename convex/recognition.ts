import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, internalQuery } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { rateLimiter } from "./lib/rateLimits";
import { claimUpload, releaseUpload } from "./lib/uploads";
import { garmentAttributes, garmentCategory, jobStatus, recognitionType } from "./lib/validators";

export const generateUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await rateLimiter.limit(ctx, "upload", { key: ctx.user._id, throws: true });
    return await ctx.storage.generateUploadUrl();
  },
});

export const startRecognition = authedMutation({
  args: {
    storageId: v.id("_storage"),
    type: v.optional(recognitionType),
  },
  returns: v.id("recognitionJobs"),
  handler: async (ctx, { storageId, type }) => {
    await claimUpload(ctx, ctx.user._id, storageId);
    await rateLimiter.limit(ctx, "recognizeGarment", { key: ctx.user._id, throws: true });

    const now = Date.now();
    const jobId = await ctx.db.insert("recognitionJobs", {
      userId: ctx.user._id,
      storageId,
      type: type ?? "garment",
      status: "queued",
      progress: 0,
      currentStep: "Queued",
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.recognitionActions.processJob, { jobId });
    return jobId;
  },
});

export const getJob = authedQuery({
  args: { jobId: v.id("recognitionJobs") },
  returns: v.union(
    v.object({
      _id: v.id("recognitionJobs"),
      status: jobStatus,
      progress: v.optional(v.number()),
      currentStep: v.optional(v.string()),
      result: v.optional(garmentAttributes),
      styleDnaResult: v.optional(v.any()),
      error: v.optional(v.string()),
      storageId: v.id("_storage"),
      imageUrl: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get("recognitionJobs", jobId);
    if (!job || job.userId !== ctx.user._id) return null;

    const imageUrl = await ctx.storage.getUrl(job.storageId);
    return {
      _id: job._id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      result: job.result,
      styleDnaResult: job.styleDnaResult,
      error: job.error,
      storageId: job.storageId,
      imageUrl,
    };
  },
});

export const confirmGarment = authedMutation({
  args: {
    jobId: v.id("recognitionJobs"),
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
  },
  returns: v.id("wardrobeItems"),
  handler: async (ctx, { jobId, ...itemData }) => {
    const job = await ctx.db.get("recognitionJobs", jobId);
    if (!job || job.userId !== ctx.user._id || job.type !== "garment") {
      throw new ConvexError("Job not found");
    }
    if (job.status !== "complete") {
      throw new ConvexError("Recognition is not finished");
    }
    // Double-tapping Save must not create two closet items for one photo.
    if (job.wardrobeItemId) {
      return job.wardrobeItemId;
    }

    const imageUrl = await ctx.storage.getUrl(job.storageId);
    if (!imageUrl) throw new ConvexError("Image not found");

    const now = Date.now();
    const itemId = await ctx.db.insert("wardrobeItems", {
      userId: ctx.user._id,
      storageId: job.storageId,
      imageUrl,
      name: itemData.name,
      category: itemData.category,
      subcategory: itemData.subcategory,
      colors: itemData.colors,
      pattern: itemData.pattern,
      fit: itemData.fit,
      season: itemData.season,
      occasions: itemData.occasions,
      material: itemData.material,
      brand: itemData.brand,
      aiConfidence: job.result?.confidence,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch("recognitionJobs", jobId, {
      wardrobeItemId: itemId,
      updatedAt: now,
    });

    return itemId;
  },
});

export const getJobInternal = internalQuery({
  args: { jobId: v.id("recognitionJobs") },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      type: recognitionType,
    }),
    v.null(),
  ),
  handler: async (ctx, { jobId }) => {
    const job = await ctx.db.get("recognitionJobs", jobId);
    if (!job) return null;
    return { storageId: job.storageId, type: job.type };
  },
});

export const updateJobStatus = internalMutation({
  args: {
    jobId: v.id("recognitionJobs"),
    status: jobStatus,
    progress: v.optional(v.number()),
    currentStep: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { jobId, status, progress, currentStep, error }) => {
    const patch: Record<string, unknown> = { status, updatedAt: Date.now() };
    if (progress !== undefined) patch.progress = progress;
    if (currentStep !== undefined) patch.currentStep = currentStep;
    if (error !== undefined) patch.error = error;
    await ctx.db.patch("recognitionJobs", jobId, patch);
    return null;
  },
});

export const completeGarmentJob = internalMutation({
  args: {
    jobId: v.id("recognitionJobs"),
    result: garmentAttributes,
  },
  returns: v.null(),
  handler: async (ctx, { jobId, result }) => {
    await ctx.db.patch("recognitionJobs", jobId, {
      status: "complete",
      progress: 100,
      currentStep: "Done",
      result,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const completeStyleDnaJob = internalMutation({
  args: {
    jobId: v.id("recognitionJobs"),
    result: v.any(),
  },
  returns: v.null(),
  handler: async (ctx, { jobId, result }) => {
    await ctx.db.patch("recognitionJobs", jobId, {
      status: "complete",
      progress: 100,
      currentStep: "Done",
      styleDnaResult: result,
      updatedAt: Date.now(),
    });
    return null;
  },
});

const STALE_JOB_MS = 24 * 60 * 60 * 1000;

/** Photos that were scanned but never saved to the closet: drop the job and the file. */
export const cleanupStaleJobs = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const stale = await ctx.db
      .query("recognitionJobs")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", Date.now() - STALE_JOB_MS))
      .take(200);

    for (const job of stale) {
      if (job.type === "garment" && !job.wardrobeItemId) {
        await releaseUpload(ctx, job.storageId);
      }
      await ctx.db.delete("recognitionJobs", job._id);
    }

    if (stale.length === 200) {
      await ctx.scheduler.runAfter(0, internal.recognition.cleanupStaleJobs, {});
    }
    return null;
  },
});
