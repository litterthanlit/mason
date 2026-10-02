import { HOUR, MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

/**
 * Per-user budgets for everything that uploads files or calls a paid model.
 * Token buckets: `capacity` is the burst, `rate` per `period` is the refill.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
  upload: { kind: "token bucket", rate: 60, period: HOUR, capacity: 20 },
  recognizeGarment: { kind: "token bucket", rate: 40, period: HOUR, capacity: 10 },
  extractStyleDna: { kind: "token bucket", rate: 5, period: HOUR, capacity: 2 },
  composeLooks: { kind: "token bucket", rate: 20, period: HOUR, capacity: 5 },
  stylistMessage: { kind: "token bucket", rate: 10, period: MINUTE, capacity: 5 },
});
