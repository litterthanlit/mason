import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { displayUrl } from "./lib/images";

const outfitValidator = v.object({
  _id: v.id("outfits"),
  name: v.optional(v.string()),
  itemIds: v.array(v.id("wardrobeItems")),
  occasion: v.string(),
  weather: v.optional(v.string()),
  notes: v.optional(v.string()),
  rationale: v.optional(v.string()),
  agentGenerated: v.boolean(),
  createdAt: v.number(),
});

export const list = authedQuery({
  args: {},
  returns: v.array(outfitValidator),
  handler: async (ctx) => {
    const outfits = await ctx.db
      .query("outfits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .collect();
    return outfits.sort((a, b) => b.createdAt - a.createdAt);
  },
});

const lookValidator = v.object({
  outfitId: v.id("outfits"),
  name: v.string(),
  rationale: v.string(),
  occasion: v.string(),
  weather: v.optional(v.string()),
  createdAt: v.number(),
  pieces: v.array(
    v.object({
      itemId: v.id("wardrobeItems"),
      name: v.string(),
      imageUrl: v.string(),
      category: v.string(),
    }),
  ),
});

/** Recent looks with their garments, newest first. Looks whose pieces were all deleted are skipped. */
export const listLooks = authedQuery({
  args: { limit: v.optional(v.number()) },
  returns: v.array(lookValidator),
  handler: async (ctx, { limit }) => {
    const outfits = await ctx.db
      .query("outfits")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .take(Math.min(limit ?? 20, 50));

    const looks = [];
    for (const outfit of outfits) {
      const pieces = [];
      for (const itemId of outfit.itemIds) {
        const item = await ctx.db.get("wardrobeItems", itemId);
        if (item) {
          pieces.push({
            itemId: item._id,
            name: item.name,
            imageUrl: await displayUrl(ctx, item),
            category: item.category,
          });
        }
      }
      if (pieces.length === 0) continue;
      looks.push({
        outfitId: outfit._id,
        name: outfit.name ?? outfit.occasion,
        rationale: outfit.rationale ?? "",
        occasion: outfit.occasion,
        weather: outfit.weather,
        createdAt: outfit.createdAt,
        pieces,
      });
    }
    return looks;
  },
});

export const create = authedMutation({
  args: {
    itemIds: v.array(v.id("wardrobeItems")),
    occasion: v.string(),
    weather: v.optional(v.string()),
    notes: v.optional(v.string()),
    rationale: v.optional(v.string()),
    agentGenerated: v.optional(v.boolean()),
  },
  returns: v.id("outfits"),
  handler: async (ctx, args) => {
    for (const itemId of args.itemIds) {
      const item = await ctx.db.get("wardrobeItems", itemId);
      if (!item || item.userId !== ctx.user._id) {
        throw new ConvexError("Invalid wardrobe item");
      }
    }

    const now = Date.now();
    return await ctx.db.insert("outfits", {
      userId: ctx.user._id,
      itemIds: args.itemIds,
      occasion: args.occasion,
      weather: args.weather,
      notes: args.notes,
      rationale: args.rationale,
      agentGenerated: args.agentGenerated ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const remove = authedMutation({
  args: { outfitId: v.id("outfits") },
  returns: v.null(),
  handler: async (ctx, { outfitId }) => {
    const outfit = await ctx.db.get("outfits", outfitId);
    if (!outfit || outfit.userId !== ctx.user._id) {
      throw new ConvexError("Outfit not found");
    }
    await ctx.db.delete("outfits", outfitId);
    return null;
  },
});
