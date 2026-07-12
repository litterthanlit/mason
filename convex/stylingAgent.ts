"use node";

import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { stylistAgent } from "./lib/stylistAgent";

type InventoryItem = {
  _id: string;
  name: string;
  category: string;
  colors: string[];
  season: string[];
};

type ProfileSummary = {
  summary: string;
  aesthetics: string[];
  palette: string[];
  avoid: string[];
};

async function buildStylistContext(ctx: GenericActionCtx<DataModel>, userId: string) {
  const [inventory, profile] = await Promise.all([
    ctx.runQuery(internal.stylingInternal.getInventoryInternal, { userId: userId as never }),
    ctx.runQuery(internal.stylingInternal.getProfileInternal, { userId: userId as never }),
  ]);

  const profileData = profile as ProfileSummary | null;
  const profileText = profileData
    ? `Style DNA: ${profileData.summary}\nAesthetics: ${profileData.aesthetics.join(", ")}\nPalette: ${profileData.palette.join(", ")}\nAvoid: ${profileData.avoid.join(", ") || "none"}`
    : "No Style DNA profile yet.";

  const items = inventory as InventoryItem[];
  const wardrobeText =
    items.length > 0
      ? items
          .map(
            (item) =>
              `- [${item._id}] ${item.name} (${item.category}, colors: ${item.colors.join(", ")}, seasons: ${item.season.join(", ")})`,
          )
          .join("\n")
      : "Wardrobe is empty.";

  return `${profileText}\n\nWardrobe:\n${wardrobeText}`;
}

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    occasion: v.optional(v.string()),
    weather: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, prompt, occasion, weather }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.stylingInternal.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const context = await buildStylistContext(ctx, user._id);
    const occasionContext = occasion
      ? `\nOccasion: ${occasion}${weather ? `, Weather: ${weather}` : ""}`
      : "";

    const { thread } = await stylistAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({
      prompt: `Context:\n${context}${occasionContext}\n\nUser: ${prompt}`,
    });

    return result.text;
  },
});

export const generateOutfits = action({
  args: {
    occasion: v.string(),
    weather: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { occasion, weather }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.runQuery(internal.stylingInternal.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new Error("User not found");

    const context = await buildStylistContext(ctx, user._id);
    const { threadId } = await stylistAgent.createThread(ctx, { userId: user._id });
    const { thread } = await stylistAgent.continueThread(ctx, { threadId });

    const result = await thread.generateText({
      prompt: `Context:\n${context}\n\nOccasion: ${occasion}${weather ? `\nWeather: ${weather}` : ""}\n\nSuggest 2-3 complete outfits using ONLY items from the wardrobe. For each outfit, list the item IDs in brackets and explain why it works. If the closet can't support this occasion, explain what's missing.`,
    });

    return result.text;
  },
});
