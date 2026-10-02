import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { claimUpload, releaseUpload } from "./lib/uploads";
import { garmentCategory } from "./lib/validators";

const wardrobeItemValidator = v.object({
  _id: v.id("wardrobeItems"),
  _creationTime: v.number(),
  userId: v.id("users"),
  storageId: v.id("_storage"),
  imageUrl: v.string(),
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
  aiConfidence: v.optional(v.number()),
  notes: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const list = authedQuery({
  args: {
    category: v.optional(garmentCategory),
    season: v.optional(v.string()),
  },
  returns: v.array(wardrobeItemValidator),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();

    return items
      .filter((item) => {
        if (args.category && item.category !== args.category) return false;
        if (args.season && !item.season.includes(args.season)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const get = authedQuery({
  args: { itemId: v.id("wardrobeItems") },
  returns: v.union(wardrobeItemValidator, v.null()),
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get("wardrobeItems", itemId);
    if (!item || item.userId !== ctx.user._id) return null;
    return item;
  },
});

export const create = authedMutation({
  args: {
    storageId: v.id("_storage"),
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
    aiConfidence: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("wardrobeItems"),
  handler: async (ctx, args) => {
    await claimUpload(ctx, ctx.user._id, args.storageId);
    const imageUrl = await ctx.storage.getUrl(args.storageId);
    if (!imageUrl) throw new ConvexError("Image not found");

    const now = Date.now();
    return await ctx.db.insert("wardrobeItems", {
      userId: ctx.user._id,
      storageId: args.storageId,
      imageUrl,
      name: args.name,
      category: args.category,
      subcategory: args.subcategory,
      colors: args.colors,
      pattern: args.pattern,
      fit: args.fit,
      season: args.season,
      occasions: args.occasions,
      material: args.material,
      brand: args.brand,
      aiConfidence: args.aiConfidence,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = authedMutation({
  args: {
    itemId: v.id("wardrobeItems"),
    name: v.optional(v.string()),
    category: v.optional(garmentCategory),
    subcategory: v.optional(v.string()),
    colors: v.optional(v.array(v.string())),
    pattern: v.optional(v.string()),
    fit: v.optional(v.string()),
    season: v.optional(v.array(v.string())),
    occasions: v.optional(v.array(v.string())),
    material: v.optional(v.string()),
    brand: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { itemId, ...updates }) => {
    const item = await ctx.db.get("wardrobeItems", itemId);
    if (!item || item.userId !== ctx.user._id) {
      throw new ConvexError("Item not found");
    }

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) patch[key] = value;
    }

    await ctx.db.patch("wardrobeItems", itemId, patch);
    return null;
  },
});

export const remove = authedMutation({
  args: { itemId: v.id("wardrobeItems") },
  returns: v.null(),
  handler: async (ctx, { itemId }) => {
    const item = await ctx.db.get("wardrobeItems", itemId);
    if (!item || item.userId !== ctx.user._id) {
      throw new ConvexError("Item not found");
    }

    // Outfits keep raw ids; drop the piece so looks never point at a deleted garment.
    const outfits = await ctx.db
      .query("outfits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
    for (const outfit of outfits) {
      if (!outfit.itemIds.includes(itemId)) continue;
      const remaining = outfit.itemIds.filter((id) => id !== itemId);
      if (remaining.length === 0) {
        await ctx.db.delete("outfits", outfit._id);
      } else {
        await ctx.db.patch("outfits", outfit._id, { itemIds: remaining, updatedAt: Date.now() });
      }
    }

    await ctx.db.delete("wardrobeItems", itemId);
    await releaseUpload(ctx, item.storageId);
    return null;
  },
});
