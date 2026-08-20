"use node";

import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { DataModel } from "./_generated/dataModel";
import { stylistAgent } from "./lib/stylistAgent";
import {
  formatStylistContext,
  OUTFIT_REQUEST,
  type ProfileForStylist,
  type WardrobeItemForStylist,
} from "./lib/styleCanon";

async function buildStylistContext(ctx: GenericActionCtx<DataModel>, userId: string) {
  const [inventory, profile] = await Promise.all([
    ctx.runQuery(internal.stylingInternal.getInventoryInternal, { userId: userId as never }),
    ctx.runQuery(internal.stylingInternal.getProfileInternal, { userId: userId as never }),
  ]);

  return formatStylistContext(
    profile as ProfileForStylist | null,
    inventory as WardrobeItemForStylist[],
  );
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
      ? `\nOccasion: ${occasion}${weather ? `\nWeather: ${weather}` : ""}`
      : "";

    const { thread } = await stylistAgent.continueThread(ctx, { threadId });
    const result = await thread.generateText({
      prompt: `${context}${occasionContext}\n\n${prompt}`,
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

    const weatherLine = weather ? `\nWeather: ${weather}` : "";
    const result = await thread.generateText({
      prompt: `${context}\n\nOccasion: ${occasion}${weatherLine}\n\n${OUTFIT_REQUEST}`,
    });

    return result.text;
  },
});
