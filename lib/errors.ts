import { ConvexError } from "convex/values";

type RateLimited = { kind: "RateLimited"; name: string; retryAfter: number };

function isRateLimited(data: unknown): data is RateLimited {
  return typeof data === "object" && data !== null && (data as RateLimited).kind === "RateLimited";
}

/**
 * Turn any thrown value into a sentence for the UI. Plain server `Error`s are
 * redacted to "Server Error" in production, so user-facing server messages are
 * thrown as `ConvexError` and read from `.data` here.
 */
export function describeError(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof ConvexError) {
    if (typeof err.data === "string") return err.data;
    if (isRateLimited(err.data)) {
      const minutes = Math.max(1, Math.ceil(err.data.retryAfter / 60_000));
      return `That's a lot at once. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
    }
  }
  return fallback;
}
