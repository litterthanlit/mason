import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

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

export const getInventoryInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("wardrobeItems"),
      name: v.string(),
      category: v.string(),
      colors: v.array(v.string()),
      season: v.array(v.string()),
      occasions: v.array(v.string()),
    }),
  ),
  handler: async (ctx, { userId }) => {
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return items.map((item) => ({
      _id: item._id,
      name: item.name,
      category: item.category,
      colors: item.colors,
      season: item.season,
      occasions: item.occasions,
    }));
  },
});

export const getProfileInternal = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      summary: v.string(),
      aesthetics: v.array(v.string()),
      palette: v.array(v.string()),
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
  },
  returns: v.array(
    v.object({
      _id: v.id("wardrobeItems"),
      name: v.string(),
      category: v.string(),
      colors: v.array(v.string()),
      season: v.array(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("wardrobeItems")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return items
      .filter((item) => {
        if (args.category && item.category !== args.category) return false;
        if (args.season && !item.season.includes(args.season)) return false;
        if (
          args.color &&
          !item.colors.some((c) => c.toLowerCase().includes(args.color!.toLowerCase()))
        ) {
          return false;
        }
        return true;
      })
      .map((item) => ({
        _id: item._id,
        name: item.name,
        category: item.category,
        colors: item.colors,
        season: item.season,
      }));
  },
});

export const createOutfitInternal = internalMutation({
  args: {
    userId: v.id("users"),
    itemIds: v.array(v.id("wardrobeItems")),
    occasion: v.string(),
    weather: v.optional(v.string()),
    rationale: v.string(),
  },
  returns: v.id("outfits"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("outfits", {
      userId: args.userId,
      itemIds: args.itemIds,
      occasion: args.occasion,
      weather: args.weather,
      rationale: args.rationale,
      agentGenerated: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});
