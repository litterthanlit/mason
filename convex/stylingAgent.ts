"use node";

import { generateText, Output } from "ai";
import { ConvexError, v } from "convex/values";
import type { GenericActionCtx } from "convex/server";
import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import type { DataModel, Id } from "./_generated/dataModel";
import { looksPayloadSchema } from "./lib/looks";
import { stylistModel } from "./lib/models";
import { rateLimiter } from "./lib/rateLimits";
import { stylistAgent } from "./lib/stylistAgent";
import {
  formatStylistContext,
  OUTFIT_REQUEST,
  STYLIST_INSTRUCTIONS,
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
  outfitId: Id<"outfits">;
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
  outfitId: v.id("outfits"),
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
  userId: Id<"users">,
): Promise<{ inventory: WardrobeItemForStylist[]; system: string }> {
  const [inventory, profile] = await Promise.all([
    ctx.runQuery(internal.stylingInternal.getInventoryInternal, { userId }),
    ctx.runQuery(internal.stylingInternal.getProfileInternal, { userId }),
  ]);

  const items = inventory as WardrobeItemForStylist[];
  // Closet and DNA ride in the system prompt, so they are not copied into
  // thread history on every turn.
  return {
    inventory: items,
    system: `${STYLIST_INSTRUCTIONS}\n\n${formatStylistContext(profile as ProfileForStylist | null, items)}`,
  };
}

/** Scheduled by styling.sendChatMessage; streams the reply into the thread. */
export const respond = internalAction({
  args: {
    threadId: v.string(),
    userId: v.id("users"),
    promptMessageId: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, userId, promptMessageId }) => {
    const { system } = await loadStylistInputs(ctx, userId);
    const result = await stylistAgent.streamText(
      ctx,
      { threadId, userId },
      { promptMessageId, system },
      { saveStreamDeltas: true },
    );
    await result.consumeStream();
    return null;
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
    if (!identity) throw new ConvexError("Not authenticated");

    const user = await ctx.runQuery(internal.stylingInternal.getUserByToken, {
      tokenIdentifier: identity.tokenIdentifier,
    });
    if (!user) throw new ConvexError("User not found");

    await rateLimiter.limit(ctx, "composeLooks", { key: user._id, throws: true });

    const { inventory, system } = await loadStylistInputs(ctx, user._id);
    if (inventory.length === 0) {
      return { looks: [], missing: "Photograph the closet first." };
    }

    // One-shot structured call: no thread to accumulate, no JSON to scrape.
    const weatherLine = weather ? `\nWeather: ${weather}` : "";
    let payload;
    try {
      const result = await generateText({
        model: stylistModel,
        system,
        prompt: `Occasion: ${occasion}${weatherLine}\n\n${OUTFIT_REQUEST}`,
        output: Output.object({ schema: looksPayloadSchema }),
      });
      payload = result.output;
    } catch (err) {
      console.error("[generateOutfits] failed:", err);
      throw new ConvexError("The stylist could not compose from this closet.");
    }

    const looks: ComposedLook[] = [];
    for (const look of payload.looks) {
      const pieces: LookPiece[] = await ctx.runQuery(internal.stylingInternal.hydratePiecesInternal, {
        userId: user._id,
        itemIds: look.itemIds,
      });
      if (pieces.length === 0) continue;

      const outfitId: Id<"outfits"> = await ctx.runMutation(internal.stylingInternal.createOutfitInternal, {
        userId: user._id,
        name: look.name,
        itemIds: pieces.map((piece) => piece.itemId),
        occasion,
        weather,
        rationale: look.rationale,
      });

      looks.push({ outfitId, name: look.name, rationale: look.rationale, pieces });
    }

    return {
      looks,
      missing: looks.length === 0 ? (payload.missing ?? "The closet cannot support this yet.") : payload.missing,
    };
  },
});
