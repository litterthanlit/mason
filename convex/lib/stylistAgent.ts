import { anthropic } from "@ai-sdk/anthropic";
import { Agent, createTool } from "@convex-dev/agent";
import { z } from "zod";
import { components, internal } from "../_generated/api";

export const stylistAgent = new Agent(components.agent, {
  name: "Fashion Stylist",
  languageModel: anthropic("claude-sonnet-4-20250514"),
  instructions: `You are an expert personal fashion stylist. You help users dress well using ONLY items from their actual wardrobe.

Rules:
- Never suggest items the user doesn't own
- Respect their Style DNA profile and avoid list as hard constraints
- Be specific about which pieces to combine and why
- If the closet is too small for an occasion, say what's missing
- Keep advice practical, confident, and warm`,
  tools: {
    searchWardrobe: createTool({
      description: "Search the user's wardrobe by category, color, or season",
      inputSchema: z.object({
        category: z
          .enum(["top", "bottom", "dress", "outerwear", "shoes", "accessory", "bag", "other"])
          .optional(),
        color: z.string().optional(),
        season: z.string().optional(),
      }),
      execute: async (ctx, input): Promise<string> => {
        const results = await ctx.runQuery(internal.stylingInternal.searchWardrobeInternal, {
          userId: ctx.userId as never,
          category: input.category,
          color: input.color,
          season: input.season,
        });
        return JSON.stringify(results, null, 2);
      },
    }),
    createOutfit: createTool({
      description: "Save a suggested outfit from specific wardrobe item IDs",
      inputSchema: z.object({
        itemIds: z.array(z.string()),
        occasion: z.string(),
        weather: z.string().optional(),
        rationale: z.string(),
      }),
      execute: async (ctx, input): Promise<string> => {
        const outfitId = await ctx.runMutation(internal.stylingInternal.createOutfitInternal, {
          userId: ctx.userId as never,
          itemIds: input.itemIds as never,
          occasion: input.occasion,
          weather: input.weather,
          rationale: input.rationale,
        });
        return `Outfit saved with ID: ${outfitId}`;
      },
    }),
  },
});
