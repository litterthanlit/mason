import { ConvexError } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

// An unclaimed file older than this was not uploaded for the current flow.
const CLAIM_WINDOW_MS = 60 * 60 * 1000;

/**
 * Convex upload URLs are not tied to a user, so ownership is recorded the first
 * time a mutation uses the file. Only the uploader learns a fresh storageId, so
 * first use within the window is a safe claim; after that it belongs to them.
 */
export async function claimUpload(
  ctx: MutationCtx,
  userId: Id<"users">,
  storageId: Id<"_storage">,
) {
  const existing = await ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
  if (existing) {
    if (existing.userId !== userId) throw new ConvexError("Image not found");
    return;
  }

  const file = await ctx.db.system.get("_storage", storageId);
  if (!file || Date.now() - file._creationTime > CLAIM_WINDOW_MS) {
    throw new ConvexError("Image not found");
  }
  await ctx.db.insert("uploads", { storageId, userId, createdAt: Date.now() });
}

export async function releaseUpload(ctx: MutationCtx, storageId: Id<"_storage">) {
  const upload = await ctx.db
    .query("uploads")
    .withIndex("by_storage", (q) => q.eq("storageId", storageId))
    .unique();
  if (upload) await ctx.db.delete("uploads", upload._id);
  if (await ctx.db.system.get("_storage", storageId)) {
    await ctx.storage.delete(storageId);
  }
}
