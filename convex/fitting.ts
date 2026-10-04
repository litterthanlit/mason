import { calculateRateLimit } from "@convex-dev/rate-limiter";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery, type QueryCtx } from "./_generated/server";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { displayUrl } from "./lib/images";
import { LIMITS, rateLimiter } from "./lib/rateLimits";
import { claimUpload, releaseUpload } from "./lib/uploads";
import { garmentCategory, jobStatus } from "./lib/validators";

const MAX_LIKENESS = 3;
const MAX_PIECES = 6;
// A render still "running" after this died with its action; let it be re-run.
const STALE_RUN_MS = 10 * 60 * 1000;

// ---------------------------------------------------------------- likeness

export const likeness = authedQuery({
  args: {},
  returns: v.array(v.object({ _id: v.id("likenessPhotos"), url: v.union(v.string(), v.null()) })),
  handler: async (ctx) => {
    const photos = await ctx.db
      .query("likenessPhotos")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
    return await Promise.all(
      photos.map(async (p) => ({ _id: p._id, url: await ctx.storage.getUrl(p.storageId) })),
    );
  },
});

export const addLikeness = authedMutation({
  args: { storageId: v.id("_storage") },
  returns: v.id("likenessPhotos"),
  handler: async (ctx, { storageId }) => {
    const existing = await ctx.db
      .query("likenessPhotos")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
    if (existing.length >= MAX_LIKENESS) {
      throw new ConvexError(`Keep at most ${MAX_LIKENESS} photos. Remove one first.`);
    }
    await claimUpload(ctx, ctx.user._id, storageId);
    return await ctx.db.insert("likenessPhotos", {
      userId: ctx.user._id,
      storageId,
      createdAt: Date.now(),
    });
  },
});

/** Removing a photo of you also removes every render made from it. */
export const removeLikeness = authedMutation({
  args: { likenessId: v.id("likenessPhotos") },
  returns: v.null(),
  handler: async (ctx, { likenessId }) => {
    const photo = await ctx.db.get("likenessPhotos", likenessId);
    if (!photo || photo.userId !== ctx.user._id) throw new ConvexError("Photo not found");

    const renders = await ctx.db
      .query("tryOns")
      .withIndex("by_likeness", (q) => q.eq("likenessId", likenessId))
      .collect();
    for (const render of renders) await deleteTryOn(ctx, render);

    await ctx.db.delete("likenessPhotos", likenessId);
    await releaseUpload(ctx, photo.storageId);
    return null;
  },
});

// ---------------------------------------------------------------- try-ons

const pieceValidator = v.object({
  itemId: v.id("wardrobeItems"),
  name: v.string(),
  category: garmentCategory,
  imageUrl: v.string(),
});

const tryOnValidator = v.object({
  _id: v.id("tryOns"),
  status: jobStatus,
  error: v.optional(v.string()),
  imageUrl: v.union(v.string(), v.null()),
  likenessId: v.id("likenessPhotos"),
  pieces: v.array(pieceValidator),
  createdAt: v.number(),
});

async function toView(ctx: QueryCtx, tryOn: Doc<"tryOns">) {
  const pieces = [];
  for (const itemId of tryOn.itemIds) {
    const item = await ctx.db.get("wardrobeItems", itemId);
    // Deleted pieces drop out of the caption; the render itself is kept.
    if (item) {
      pieces.push({ itemId, name: item.name, category: item.category, imageUrl: await displayUrl(ctx, item) });
    }
  }
  return {
    _id: tryOn._id,
    status: tryOn.status,
    error: tryOn.error,
    imageUrl: tryOn.storageId ? await ctx.storage.getUrl(tryOn.storageId) : null,
    likenessId: tryOn.likenessId,
    pieces,
    createdAt: tryOn.createdAt,
  };
}

async function deleteTryOn(ctx: Parameters<typeof releaseUpload>[0], tryOn: Doc<"tryOns">) {
  await ctx.db.delete("tryOns", tryOn._id);
  if (tryOn.storageId) await releaseUpload(ctx, tryOn.storageId);
}

export const list = authedQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(tryOnValidator),
  handler: async (ctx, { limit }) => {
    const tryOns = await ctx.db
      .query("tryOns")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(Math.min(limit ?? 20, 50));
    return await Promise.all(tryOns.map((t) => toView(ctx, t)));
  },
});

export const get = authedQuery({
  args: { tryOnId: v.id("tryOns") },
  returns: v.union(tryOnValidator, v.null()),
  handler: async (ctx, { tryOnId }) => {
    const tryOn = await ctx.db.get("tryOns", tryOnId);
    if (!tryOn || tryOn.userId !== ctx.user._id) return null;
    return await toView(ctx, tryOn);
  },
});

/** Renders left right now, so the room can say so before anyone taps. */
export const allowance = authedQuery({
  args: {},
  returns: v.object({ remaining: v.number(), capacity: v.number() }),
  handler: async (ctx) => {
    const current = await rateLimiter.getValue(ctx, "tryOn", { key: ctx.user._id });
    const { value } = calculateRateLimit(current, LIMITS.tryOn, Date.now());
    return { remaining: Math.max(0, Math.floor(value)), capacity: LIMITS.tryOn.capacity };
  },
});

export const start = authedMutation({
  args: {
    likenessId: v.id("likenessPhotos"),
    itemIds: v.array(v.id("wardrobeItems")),
  },
  returns: v.id("tryOns"),
  handler: async (ctx, { likenessId, itemIds }) => {
    const photo = await ctx.db.get("likenessPhotos", likenessId);
    if (!photo || photo.userId !== ctx.user._id) throw new ConvexError("Photo not found");

    const unique = [...new Set(itemIds)].sort() as Id<"wardrobeItems">[];
    if (unique.length === 0) throw new ConvexError("Pick at least one piece");
    if (unique.length > MAX_PIECES) throw new ConvexError(`Try on at most ${MAX_PIECES} pieces at once`);

    const slots = new Set<string>();
    for (const itemId of unique) {
      const item = await ctx.db.get("wardrobeItems", itemId);
      if (!item || item.userId !== ctx.user._id) throw new ConvexError("Invalid wardrobe item");
      if (item.category !== "accessory" && slots.has(item.category)) {
        throw new ConvexError("One piece per slot, except accessories");
      }
      slots.add(item.category);
    }
    if (slots.has("dress") && (slots.has("top") || slots.has("bottom"))) {
      throw new ConvexError("A dress replaces the top and bottom. Pick one or the other.");
    }

    // Same person, same pieces: reuse the render instead of paying twice.
    const key = `${likenessId}:${unique.join(",")}`;
    const existing = await ctx.db
      .query("tryOns")
      .withIndex("by_user_and_key", (q) => q.eq("userId", ctx.user._id).eq("key", key))
      .first();
    const now = Date.now();
    if (existing) {
      const inFlight =
        (existing.status === "queued" || existing.status === "running") &&
        now - existing.updatedAt < STALE_RUN_MS;
      if (existing.status === "complete" || inFlight) return existing._id;
    }

    await rateLimiter.limit(ctx, "tryOn", { key: ctx.user._id, throws: true });

    let tryOnId: Id<"tryOns">;
    if (existing) {
      tryOnId = existing._id;
      await ctx.db.patch("tryOns", tryOnId, { status: "queued", error: undefined, updatedAt: now });
    } else {
      tryOnId = await ctx.db.insert("tryOns", {
        userId: ctx.user._id,
        likenessId,
        itemIds: unique,
        key,
        status: "queued",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.scheduler.runAfter(0, internal.fittingActions.render, { tryOnId });
    return tryOnId;
  },
});

export const remove = authedMutation({
  args: { tryOnId: v.id("tryOns") },
  returns: v.null(),
  handler: async (ctx, { tryOnId }) => {
    const tryOn = await ctx.db.get("tryOns", tryOnId);
    if (!tryOn || tryOn.userId !== ctx.user._id) throw new ConvexError("Render not found");
    await deleteTryOn(ctx, tryOn);
    return null;
  },
});

// ---------------------------------------------------------------- internal

const garmentInput = v.object({
  storageId: v.id("_storage"),
  name: v.string(),
  category: garmentCategory,
  subcategory: v.string(),
  colors: v.array(v.string()),
  pattern: v.string(),
  fit: v.string(),
  material: v.optional(v.string()),
});

export const renderInput = internalQuery({
  args: { tryOnId: v.id("tryOns") },
  returns: v.union(
    v.object({ likenessStorageId: v.id("_storage"), garments: v.array(garmentInput) }),
    v.null(),
  ),
  handler: async (ctx, { tryOnId }) => {
    const tryOn = await ctx.db.get("tryOns", tryOnId);
    if (!tryOn) return null;
    const photo = await ctx.db.get("likenessPhotos", tryOn.likenessId);
    if (!photo) return null;

    const garments = [];
    for (const itemId of tryOn.itemIds) {
      const item = await ctx.db.get("wardrobeItems", itemId);
      if (!item) continue;
      garments.push({
        // The clean packshot is a better reference than a photo on a bed.
        storageId:
          item.mockupStatus === "complete" && item.mockupStorageId ? item.mockupStorageId : item.storageId,
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        colors: item.colors,
        pattern: item.pattern,
        fit: item.fit,
        material: item.material,
      });
    }
    return { likenessStorageId: photo.storageId, garments };
  },
});

export const setStatus = internalMutation({
  args: { tryOnId: v.id("tryOns"), status: jobStatus, error: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, { tryOnId, status, error }) => {
    if (!(await ctx.db.get("tryOns", tryOnId))) return null;
    await ctx.db.patch("tryOns", tryOnId, { status, error, updatedAt: Date.now() });
    return null;
  },
});

export const complete = internalMutation({
  args: { tryOnId: v.id("tryOns"), storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, { tryOnId, storageId }) => {
    const tryOn = await ctx.db.get("tryOns", tryOnId);
    // Removed (or its photo removed) while rendering: drop the file too.
    if (!tryOn) {
      await ctx.storage.delete(storageId);
      return null;
    }
    if (tryOn.storageId && tryOn.storageId !== storageId) await releaseUpload(ctx, tryOn.storageId);
    await ctx.db.patch("tryOns", tryOnId, {
      status: "complete",
      storageId,
      error: undefined,
      updatedAt: Date.now(),
    });
    return null;
  },
});
