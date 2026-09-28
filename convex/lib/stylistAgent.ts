import { anthropic } from "@ai-sdk/anthropic";
import { Agent, createTool } from "@convex-dev/agent";
import { z } from "zod";
import { components, internal } from "../_generated/api";
import { STYLIST_INSTRUCTIONS } from "./styleCanon";

export const stylistAgent = new Agent(components.agent, {
  name: "Fashion Stylist",
  languageModel: anthropic("claude-sonnet-5"),
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
          userId: ctx.userId as never,
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
          userId: ctx.userId as never,
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
