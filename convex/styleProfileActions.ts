"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { extractStyleDna } from "./ai/extractStyleDNA";

export const extractProfile = internalAction({
  args: {
    userId: v.id("users"),
    jobId: v.id("styleDnaJobs"),
    storageIds: v.array(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, { userId, jobId, storageIds }) => {
    try {
      const imageUrls: string[] = [];
      for (const storageId of storageIds) {
        const url = await ctx.storage.getUrl(storageId);
        if (url) imageUrls.push(url);
      }

      const result = await extractStyleDna(imageUrls);
      await ctx.runMutation(internal.styleProfile.saveProfile, { userId, jobId, storageIds, result });
    } catch (err) {
      await ctx.runMutation(internal.styleProfile.failJob, {
        jobId,
        error: err instanceof Error ? err.message : "Could not read these references. Try again.",
      });
    }
    return null;
  },
});
