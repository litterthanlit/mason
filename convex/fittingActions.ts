"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { generateImage, ImageGenerationError } from "./ai/generateImage";
import { byLayer, tryOnPrompt } from "./ai/imagePrompts";
import { GEMINI_TRY_ON_MODEL } from "./lib/models";

export const render = internalAction({
  args: { tryOnId: v.id("tryOns") },
  returns: v.null(),
  handler: async (ctx, { tryOnId }) => {
    const input = await ctx.runQuery(internal.fitting.renderInput, { tryOnId });
    if (!input) return null;
    await ctx.runMutation(internal.fitting.setStatus, { tryOnId, status: "running" });

    try {
      if (input.garments.length === 0) throw new ImageGenerationError("These pieces are no longer in the closet.");
      const garments = byLayer(input.garments);

      const urls = await Promise.all(
        [input.likenessStorageId, ...garments.map((g) => g.storageId)].map((id) => ctx.storage.getUrl(id)),
      );
      if (urls.some((url) => !url)) throw new ImageGenerationError("A photo for this render is gone.");

      const image = await generateImage({
        model: GEMINI_TRY_ON_MODEL,
        prompt: tryOnPrompt(garments),
        images: urls.map((url) => ({ url: url! })),
      });
      const storageId = await ctx.storage.store(new Blob([image.data], { type: image.mimeType }));
      await ctx.runMutation(internal.fitting.complete, { tryOnId, storageId });
    } catch (err) {
      console.error("[fitting.render]", err);
      await ctx.runMutation(internal.fitting.setStatus, {
        tryOnId,
        status: "failed",
        error: err instanceof ImageGenerationError ? err.message : "The render failed. Try again.",
      });
    }
    return null;
  },
});
