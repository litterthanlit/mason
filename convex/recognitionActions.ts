"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { recognizeGarment } from "./ai/recognizeGarment";
import { extractStyleDna } from "./ai/extractStyleDNA";

export const processJob = internalAction({
  args: { jobId: v.id("recognitionJobs") },
  returns: v.null(),
  handler: async (ctx, { jobId }) => {
    await ctx.runMutation(internal.recognition.updateJobStatus, {
      jobId,
      status: "running",
      progress: 10,
      currentStep: "Analyzing image",
    });

    const job = await ctx.runMutation(internal.recognition.getJobInternal, { jobId });
    if (!job) return null;

    const imageUrl = await ctx.storage.getUrl(job.storageId);
    if (!imageUrl) {
      await ctx.runMutation(internal.recognition.updateJobStatus, {
        jobId,
        status: "failed",
        error: "Could not load image",
      });
      return null;
    }

    try {
      if (job.type === "style_dna") {
        const result = await extractStyleDna([imageUrl]);
        await ctx.runMutation(internal.recognition.completeStyleDnaJob, { jobId, result });
      } else {
        const result = await recognizeGarment(imageUrl);
        await ctx.runMutation(internal.recognition.completeGarmentJob, { jobId, result });
      }
    } catch (err) {
      await ctx.runMutation(internal.recognition.updateJobStatus, {
        jobId,
        status: "failed",
        error: err instanceof Error ? err.message : "Recognition failed",
      });
    }

    return null;
  },
});
