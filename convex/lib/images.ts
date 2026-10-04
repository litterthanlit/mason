import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { rateLimiter } from "./rateLimits";

/** The studio mockup when it exists, so every surface shows the same packshot. */
export async function mockupUrl(ctx: QueryCtx, item: Doc<"wardrobeItems">) {
  if (item.mockupStatus !== "complete" || !item.mockupStorageId) return null;
  return await ctx.storage.getUrl(item.mockupStorageId);
}

export async function displayUrl(ctx: QueryCtx, item: Doc<"wardrobeItems">) {
  return (await mockupUrl(ctx, item)) ?? item.imageUrl;
}

/**
 * Queue a studio mockup for a closet item. On save (`throws: false`) a spent
 * budget or a missing API key just skips it; the photo stands in and the item
 * page offers to make one. An explicit request (`throws: true`) reports why.
 */
export async function requestMockup(
  ctx: MutationCtx,
  userId: Id<"users">,
  itemId: Id<"wardrobeItems">,
  { throws }: { throws: boolean },
) {
  if (!throws && !process.env.GEMINI_API_KEY) return;
  const { ok } = await rateLimiter.limit(ctx, "renderMockup", { key: userId, throws });
  if (!ok) return;
  await ctx.db.patch("wardrobeItems", itemId, {
    mockupStatus: "queued",
    mockupError: undefined,
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.mockupActions.renderMockup, { itemId });
}
