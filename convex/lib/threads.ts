import { getThreadMetadata } from "@convex-dev/agent";
import { components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../_generated/server";

/**
 * Agent threads live in the agent component, keyed only by threadId. Every
 * public function that takes a threadId must prove the caller owns it.
 */
export async function assertThreadOwner(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  threadId: string,
  userId: string,
) {
  const thread = await getThreadMetadata(ctx, components.agent, { threadId }).catch(() => null);
  if (!thread || thread.userId !== userId) {
    throw new Error("Thread not found");
  }
}
