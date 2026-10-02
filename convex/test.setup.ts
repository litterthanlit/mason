/// <reference types="vite/client" />
import { register as registerAgent } from "@convex-dev/agent/test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

export const modules = import.meta.glob("./**/*.*s");

export function setup() {
  const t = convexTest(schema, modules);
  registerAgent(t);
  registerRateLimiter(t);
  return t;
}

export type Test = ReturnType<typeof setup>;

export async function signIn(t: Test, subject: string) {
  const as = t.withIdentity({ subject, name: subject });
  const userId: Id<"users"> = await as.mutation(api.users.upsertFromAuth, {});
  return { as, userId };
}

export async function storeImage(t: Test) {
  return await t.run((ctx) => ctx.storage.store(new Blob(["img"], { type: "image/jpeg" })));
}
