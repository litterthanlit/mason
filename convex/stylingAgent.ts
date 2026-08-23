"use node";

import { v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { parseLooksPayload } from "./lib/looks";
import { stylistAgent } from "./lib/stylistAgent";
import {
  formatStylistContext,
  OUTFIT_REQUEST,
  type ProfileForStylist,
  type WardrobeItemForStylist,
} from "./lib/styleCanon";

type LookPiece = {
  itemId: Id<"wardrobeItems">;
  name: string;
  imageUrl: string;
  category: string;
};

type ComposedLook = {
  name: string;
  rationale: string;
  pieces: LookPiece[];
};

type GenerateLooksResult = {
  looks: ComposedLook[];
  missing: string | null;
};

const lookPieceValidator = v.object({
  itemId: v.id("wardrobeItems"),
  name: v.string(),
  imageUrl: v.string(),
  category: v.string(),
});

const lookValidator = v.object({
  name: v.string(),
  rationale: v.string(),
  pieces: v.array(lookPieceValidator),
});

const generateLooksResultValidator = v.object({
  looks: v.array(lookValidator),
  missing: v.union(v.string(), v.null()),
});

async function loadStylistInputs(
  ctx: GenericActionCtx<DataModel>,
  userId: string,
): Promise<{ inventory: WardrobeItemForStylist[]; context: string }> {
  const [inventory, profile] = await Promise.all([
    ctx.runQuery(internal.stylingInternal.getInventoryInternal, { userId: userId as never }),
    ctx.runQuery(internal.stylingInternal.getProfileInternal, { userId: userId as never }),
  ]);

  const items = inventory as WardrobeItemForStylist[];
  return {
    inventory: items,
    context: formatStylistContext(profile as ProfileForStylist | null, items),
  };
}

export const sendMessage = action({
  args: {
    threadId: v.string(),
    prompt: v.string(),
    occasion: v.optional(v.string()),
    weather: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, { threadId, prompt, occasion, weather }): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = (await ctx.runQuery(internal.stylingInternal.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    })) as { _id: Id<"users"> } | null;
    if (!user) throw new Error("User not found");

    const { context } = await loadStylistInputs(ctx, user._id);
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
  returns: generateLooksResultValidator,
  handler: async (ctx, { occasion, weather }): Promise<GenerateLooksResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = (await ctx.runQuery(internal.stylingInternal.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    })) as { _id: Id<"users"> } | null;
    if (!user) throw new Error("User not found");

    const { inventory, context } = await loadStylistInputs(ctx, user._id);
    if (inventory.length === 0) {
      return { looks: [], missing: "Photograph the closet first." };
    }

    const { threadId } = await stylistAgent.createThread(ctx, { userId: user._id });
    const { thread } = await stylistAgent.continueThread(ctx, { threadId });

    const weatherLine = weather ? `\nWeather: ${weather}` : "";
    const result = await thread.generateText({
      prompt: `${context}\n\nOccasion: ${occasion}${weatherLine}\n\n${OUTFIT_REQUEST}`,
    });

    let payload;
    try {
      payload = parseLooksPayload(result.text);
    } catch {
      throw new Error("The stylist could not compose from this closet.");
    }
    const looks: ComposedLook[] = [];

    for (const look of payload.looks) {
      const pieces = (await ctx.runQuery(internal.stylingInternal.hydratePiecesInternal, {
        userId: user._id,
        itemIds: look.itemIds,
      })) as LookPiece[];
      if (pieces.length === 0) continue;

      await ctx.runMutation(internal.stylingInternal.createOutfitInternal, {
        userId: user._id,
        name: look.name,
        itemIds: pieces.map((piece) => piece.itemId),
        occasion,
        weather,
        rationale: look.rationale,
      });

      looks.push({
        name: look.name,
        rationale: look.rationale,
        pieces,
      });
    }

    return {
      looks,
      missing: looks.length === 0 ? (payload.missing ?? "The closet cannot support this yet.") : payload.missing,
    };
  },
});
