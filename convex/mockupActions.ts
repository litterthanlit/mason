"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateImage, ImageGenerationError } from "./ai/generateImage";
import { mockupPrompt } from "./ai/imagePrompts";
import { GEMINI_MOCKUP_MODEL } from "./lib/models";

export const renderMockup = internalAction({
  args: { itemId: v.id("wardrobeItems") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const item = await ctx.runQuery(internal.mockups.mockupInput, { itemId });
    if (!item) return null;
    await ctx.runMutation(internal.mockups.setStatus, { itemId, status: "running" });

    try {
      const url = await ctx.storage.getUrl(item.storageId);
      if (!url) throw new ImageGenerationError("The original photo is gone.");
      const image = await generateImage({
        model: GEMINI_MOCKUP_MODEL,
        prompt: mockupPrompt(item),
        images: [{ url }],
      });
      const storageId = await ctx.storage.store(new Blob([image.data], { type: image.mimeType }));
      await ctx.runMutation(internal.mockups.complete, { itemId, storageId });
    } catch (err) {
      console.error("[renderMockup]", err);
      await ctx.runMutation(internal.mockups.setStatus, {
        itemId,
        status: "failed",
        error: err instanceof ImageGenerationError ? err.message : "Could not make a studio mockup.",
      });
    }
    return null;
  },
});
