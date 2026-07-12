import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";

const jobStatus = v.union(
  v.literal("queued"),
  v.literal("running"),
  v.literal("complete"),
  v.literal("failed"),
);

const garmentResult = v.object({
  category: v.union(
    v.literal("top"),
    v.literal("bottom"),
    v.literal("dress"),
    v.literal("outerwear"),
    v.literal("shoes"),
    v.literal("accessory"),
    v.literal("bag"),
    v.literal("other"),
  ),
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

export const generateUploadUrl = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const startRecognition = authedMutation({
  args: {
    storageId: v.id("_storage"),
    type: v.optional(v.union(v.literal("garment"), v.literal("style_dna"))),
  },
  returns: v.id("recognitionJobs"),
  handler: async (ctx, { storageId, type }) => {
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
      result: v.optional(garmentResult),
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
    category: v.union(
      v.literal("top"),
      v.literal("bottom"),
      v.literal("dress"),
      v.literal("outerwear"),
      v.literal("shoes"),
      v.literal("accessory"),
      v.literal("bag"),
      v.literal("other"),
    ),
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
    if (!job || job.userId !== ctx.user._id) {
      throw new Error("Job not found");
    }

    const imageUrl = await ctx.storage.getUrl(job.storageId);
    if (!imageUrl) throw new Error("Image not found");

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

export const getJobInternal = internalMutation({
  args: { jobId: v.id("recognitionJobs") },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      type: v.union(v.literal("garment"), v.literal("style_dna")),
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
    result: garmentResult,
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
