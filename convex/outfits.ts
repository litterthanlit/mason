import { ConvexError, v } from "convex/values";
import { authedMutation, authedQuery } from "./lib/customFunctions";

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
