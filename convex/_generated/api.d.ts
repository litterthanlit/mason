/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ai_extractStyleDNA from "../ai/extractStyleDNA.js";
import type * as ai_recognizeGarment from "../ai/recognizeGarment.js";
import type * as crons from "../crons.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_customFunctions from "../lib/customFunctions.js";
import type * as lib_looks from "../lib/looks.js";
import type * as lib_models from "../lib/models.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_styleCanon from "../lib/styleCanon.js";
import type * as lib_stylistAgent from "../lib/stylistAgent.js";
import type * as lib_threads from "../lib/threads.js";
import type * as lib_uploads from "../lib/uploads.js";
import type * as lib_validators from "../lib/validators.js";
import type * as outfits from "../outfits.js";
import type * as recognition from "../recognition.js";
import type * as recognitionActions from "../recognitionActions.js";
import type * as styleProfile from "../styleProfile.js";
import type * as styleProfileActions from "../styleProfileActions.js";
import type * as styling from "../styling.js";
import type * as stylingAgent from "../stylingAgent.js";
import type * as stylingInternal from "../stylingInternal.js";
import type * as users from "../users.js";
import type * as wardrobe from "../wardrobe.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ai/extractStyleDNA": typeof ai_extractStyleDNA;
  "ai/recognizeGarment": typeof ai_recognizeGarment;
  crons: typeof crons;
  "lib/auth": typeof lib_auth;
  "lib/customFunctions": typeof lib_customFunctions;
  "lib/looks": typeof lib_looks;
  "lib/models": typeof lib_models;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/styleCanon": typeof lib_styleCanon;
  "lib/stylistAgent": typeof lib_stylistAgent;
  "lib/threads": typeof lib_threads;
  "lib/uploads": typeof lib_uploads;
  "lib/validators": typeof lib_validators;
  outfits: typeof outfits;
  recognition: typeof recognition;
  recognitionActions: typeof recognitionActions;
  styleProfile: typeof styleProfile;
  styleProfileActions: typeof styleProfileActions;
  styling: typeof styling;
  stylingAgent: typeof stylingAgent;
  stylingInternal: typeof stylingInternal;
  users: typeof users;
  wardrobe: typeof wardrobe;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  agent: import("@convex-dev/agent/_generated/component.js").ComponentApi<"agent">;
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
