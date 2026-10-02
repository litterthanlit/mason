import { listUIMessages, saveMessage, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { components, internal } from "./_generated/api";
import { query } from "./_generated/server";
import { getCurrentUser } from "./lib/auth";
import { authedMutation, authedQuery } from "./lib/customFunctions";
import { rateLimiter } from "./lib/rateLimits";
import { stylistAgent } from "./lib/stylistAgent";
import { assertThreadOwner } from "./lib/threads";

/** The user's most recent stylist conversation, so the chat survives leaving the tab. */
export const currentThread = authedQuery({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const session = await ctx.db
      .query("stylingSessions")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .order("desc")
      .first();
    return session?.threadId ?? null;
  },
});

/** Start a fresh conversation; it becomes the current one. */
export const createThread = authedMutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const threadId = await stylistAgent.createThread(ctx, { userId: ctx.user._id });
    const now = Date.now();
    await ctx.db.insert("stylingSessions", {
      userId: ctx.user._id,
      threadId: threadId.threadId,
      suggestedOutfitIds: [],
      createdAt: now,
      updatedAt: now,
    });
    return threadId.threadId;
  },
});

export const listThreadMessages = query({
  args: {
    threadId: v.string(),
    paginationOpts: paginationOptsValidator,
    streamArgs: vStreamArgs,
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    await assertThreadOwner(ctx, args.threadId, user._id);

    const paginated = await listUIMessages(ctx, components.agent, args);
    const streams = await syncStreams(ctx, components.agent, args);
    return { ...paginated, streams };
  },
});

/**
 * Saves the user's message and schedules the reply. The reply streams into the
 * thread, so every open client sees it arrive; nothing waits on an action.
 */
export const sendChatMessage = authedMutation({
  args: {
    threadId: v.string(),
    prompt: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, { threadId, prompt }) => {
    await assertThreadOwner(ctx, threadId, ctx.user._id);
    await rateLimiter.limit(ctx, "stylistMessage", { key: ctx.user._id, throws: true });

    const { messageId } = await saveMessage(ctx, components.agent, {
      threadId,
      userId: ctx.user._id,
      prompt,
    });
    await ctx.scheduler.runAfter(0, internal.stylingAgent.respond, {
      threadId,
      userId: ctx.user._id,
      promptMessageId: messageId,
    });
    return null;
  },
});
