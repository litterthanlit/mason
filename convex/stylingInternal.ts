import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server";
import { displayUrl } from "./lib/images";

export const getUserByToken = internalQuery({
  args: { tokenIdentifier: v.string() },
  returns: v.union(v.object({ _id: v.id("users") }), v.null()),
  handler: async (ctx, { tokenIdentifier }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", tokenIdentifier))
      .unique();
    return user ? { _id: user._id } : null;
  },
});

const wardrobeItemForStylist = v.object({
  _id: v.id("wardrobeItems"),
  name: v.string(),
  category: v.string(),
  subcategory: v.string(),
  colors: v.array(v.string()),
  pattern: v.string(),
  fit: v.string(),
  season: v.array(v.string()),
  occasions: v.array(v.string()),
  material: v.optional(v.string()),
  brand: v.optional(v.string()),
});

function toStylistItem(item: Doc<"wardrobeItems">) {
  return {
    _id: item._id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    colors: item.colors,
    pattern: item.pattern,
    fit: item.fit,
    season: item.season,
    occasions: item.occasions,
    material: item.material,
    brand: item.brand,
  };
}

export const getInventoryInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(wardrobeItemForStylist),
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return items.map(toStylistItem);
  },
});

export const getProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      summary: v.string(),
      aesthetics: v.array(v.string()),
      palette: v.array(v.string()),
      colorTemperature: v.string(),
      silhouettes: v.array(v.string()),
      patterns: v.array(v.string()),
      avoid: v.array(v.string()),
    }),
    v.null(),
  ),
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db
      .query("styleProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (!profile) return null;
    return {
      summary: profile.summary,
      aesthetics: profile.aesthetics,
      palette: profile.palette,
      colorTemperature: profile.colorTemperature,
      silhouettes: profile.silhouettes,
      patterns: profile.patterns,
      avoid: profile.avoid,
    };
  },
});

export const searchWardrobeInternal = internalQuery({
  args: {
    userId: v.id("users"),
    category: v.optional(v.string()),
    color: v.optional(v.string()),
    season: v.optional(v.string()),
    fit: v.optional(v.string()),
  },
  returns: v.array(wardrobeItemForStylist),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return items
      .filter((item) => {
        if (args.category && item.category !== args.category) return false;
        if (args.season && !item.season.includes(args.season)) return false;
        if (args.fit && !item.fit.toLowerCase().includes(args.fit.toLowerCase())) return false;
        if (
          args.color &&
          !item.colors.some((c) => c.toLowerCase().includes(args.color!.toLowerCase()))
        ) {
          return false;
        }
        return true;
      })
      .map(toStylistItem);
  },
});

export const createOutfitInternal = internalMutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    // Raw strings: the stylist tool passes model output straight through.
    itemIds: v.array(v.string()),
    occasion: v.string(),
    weather: v.optional(v.string()),
    rationale: v.string(),
  },
  returns: v.id("outfits"),
  handler: async (ctx, args) => {
    const itemIds: Id<"wardrobeItems">[] = [];
    for (const raw of args.itemIds) {
      const id = ctx.db.normalizeId("wardrobeItems", raw);
      if (!id || itemIds.includes(id)) continue;
      const item = await ctx.db.get("wardrobeItems", id);
      if (item && item.userId === args.userId) itemIds.push(id);
    }
    if (itemIds.length === 0) {
      throw new Error("None of these pieces are in this closet");
    }

    const now = Date.now();
    return await ctx.db.insert("outfits", {
      userId: args.userId,
      name: args.name,
      itemIds,
      occasion: args.occasion,
      weather: args.weather,
      rationale: args.rationale,
      agentGenerated: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const hydratePiecesInternal = internalQuery({
  args: {
    userId: v.id("users"),
    itemIds: v.array(v.string()),
  },
  returns: v.array(
    v.object({
      itemId: v.id("wardrobeItems"),
      name: v.string(),
      imageUrl: v.string(),
      category: v.string(),
    }),
  ),
  handler: async (ctx, { userId, itemIds }) => {
    const seen = new Set<string>();
    const result: {
      itemId: Doc<"wardrobeItems">["_id"];
      name: string;
      imageUrl: string;
      category: string;
    }[] = [];

    for (const raw of itemIds) {
      const id = ctx.db.normalizeId("wardrobeItems", raw);
      if (!id || seen.has(id)) continue;
      const item = await ctx.db.get("wardrobeItems", id);
      if (!item || item.userId !== userId) continue;
      seen.add(id);
      result.push({
        itemId: item._id,
        name: item.name,
        imageUrl: await displayUrl(ctx, item),
        category: item.category,
      });
    }
    return result;
  },
});
