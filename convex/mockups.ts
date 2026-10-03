import { ConvexError, v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { authedMutation } from "./lib/customFunctions";
import { requestMockup } from "./lib/images";
import { releaseUpload } from "./lib/uploads";
import { garmentCategory, jobStatus } from "./lib/validators";

// A mockup still "running" after this died with its action; let it be re-requested.
const STALE_RUN_MS = 10 * 60 * 1000;

/** Make (or remake) the studio mockup for one of the caller's items. */
export const request = authedMutation({
  args: { itemId: v.id("wardrobeItems") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get("wardrobeItems", itemId);
    if (!item || item.userId !== ctx.user._id) throw new ConvexError("Item not found");
    const inFlight = item.mockupStatus === "queued" || item.mockupStatus === "running";
    if (inFlight && Date.now() - item.updatedAt < STALE_RUN_MS) return null;
    await requestMockup(ctx, ctx.user._id, itemId, { throws: true });
    return null;
  },
});

export const mockupInput = internalQuery({
  args: { itemId: v.id("wardrobeItems") },
  returns: v.union(
    v.object({
      storageId: v.id("_storage"),
      name: v.string(),
      category: garmentCategory,
      subcategory: v.string(),
      colors: v.array(v.string()),
      pattern: v.string(),
      fit: v.string(),
      material: v.optional(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get("wardrobeItems", itemId);
    if (!item) return null;
    return {
      storageId: item.storageId,
      name: item.name,
      category: item.category,
      subcategory: item.subcategory,
      colors: item.colors,
      pattern: item.pattern,
      fit: item.fit,
      material: item.material,
    };
  },
});

export const setStatus = internalMutation({
  args: { itemId: v.id("wardrobeItems"), status: jobStatus, error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { itemId, status, error }) => {
    if (!(await ctx.db.get("wardrobeItems", itemId))) return null;
    await ctx.db.patch("wardrobeItems", itemId, { mockupStatus: status, mockupError: error, updatedAt: Date.now() });
    return null;
  },
});

export const complete = internalMutation({
  args: { itemId: v.id("wardrobeItems"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { itemId, storageId }) => {
    const item = await ctx.db.get("wardrobeItems", itemId);
    // Deleted while rendering: don't leave an orphaned file behind.
    if (!item) {
      await ctx.storage.delete(storageId);
      return null;
    }
    if (item.mockupStorageId && item.mockupStorageId !== storageId) {
      await releaseUpload(ctx, item.mockupStorageId);
    }
    await ctx.db.patch("wardrobeItems", itemId, {
      mockupStatus: "complete",
      mockupStorageId: storageId,
      mockupError: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});
