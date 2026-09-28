import { Agent, createTool } from "@convex-dev/agent";
import { z } from "zod";
import { components, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { stylistModel } from "./models";
import { STYLIST_INSTRUCTIONS } from "./styleCanon";

// Every stylist thread is created with the owner's users._id (styling.createThread).
function threadOwner(userId: string | undefined): Id<"users"> {
  if (!userId) throw new Error("Stylist tools need a thread owner");
  return userId as Id<"users">;
}

export const stylistAgent = new Agent(components.agent, {
  name: "Fashion Stylist",
  languageModel: stylistModel,
  instructions: STYLIST_INSTRUCTIONS,
  tools: {
    searchWardrobe: createTool({
      description:
        "Search the wardrobe by category, color, season, or fit. Use this to check visual weight and proportion before composing a look.",
      inputSchema: z.object({
        category: z
          .enum(["top", "bottom", "dress", "outerwear", "shoes", "accessory", "bag", "other"])
          .optional(),
        color: z.string().optional(),
        season: z.string().optional(),
        fit: z.string().optional(),
      }),
      execute: async (ctx, input): Promise<string> => {
        const results = await ctx.runQuery(internal.stylingInternal.searchWardrobeInternal, {
          userId: threadOwner(ctx.userId),
          category: input.category,
          color: input.color,
          season: input.season,
          fit: input.fit,
        });
        return JSON.stringify(results, null, 2);
      },
    }),
    createOutfit: createTool({
      description:
        "Save a composed look. rationale must be the silhouette-then-tension paragraph, not a caption.",
      inputSchema: z.object({
        itemIds: z.array(z.string()),
        occasion: z.string(),
        weather: z.string().optional(),
        rationale: z.string(),
      }),
      execute: async (ctx, input): Promise<string> => {
        const outfitId = await ctx.runMutation(internal.stylingInternal.createOutfitInternal, {
          userId: threadOwner(ctx.userId),
          itemIds: input.itemIds,
          occasion: input.occasion,
          weather: input.weather,
          rationale: input.rationale,
        });
        return `Outfit saved with ID: ${outfitId}`;
      },
    }),
  },
});
