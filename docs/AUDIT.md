# Repo Audit — September 2026

Scope: every source file in `app/`, `components/`, `lib/`, `convex/`, plus config (`app.json`, `eas.json`, `package.json`, tsconfigs). Both `tsc` projects were clean before and after the changes.

Legend: **Fixed** = changed on this branch. **Open** = recommended, not done yet.

---

## 1. Security

| # | Finding | Status |
|---|---|---|
| S1 | **Thread IDOR.** `styling.listThreadMessages`, `styling.sendChatMessage` and `stylingAgent.sendMessage` took any `threadId` and only checked that the caller was signed in. Any user could read another user's stylist chat, or write into it and run the agent with their own closet as context. | **Fixed** — `convex/lib/threads.ts` `assertThreadOwner` checks the thread's `userId` on all three. |
| S2 | **Agent could save outfits with any id.** The `createOutfit` tool passed model output to `createOutfitInternal` with `as never`, with no ownership check. A foreign or made-up id either crashed the validator or was stored. | **Fixed** — `createOutfitInternal` normalizes the ids, keeps only the user's own items, and rejects an empty result. |
| S3 | **Storage ids are trusted.** `startRecognition`, `startExtraction` and `wardrobe.create` accept any `_storage` id. Ids are hard to guess, but nothing ties an upload to the uploader. | **Fixed** — `lib/uploads.ts` claims a file for its first user, within an hour of upload. Anyone else gets "Image not found". |
| S4 | **No rate limits on paid AI calls.** `generateOutfits`, `sendMessage`, `startRecognition`, `startExtraction` can be called in a loop and bill Gemini/Anthropic without limit. | **Fixed** — per-user token buckets in `lib/rateLimits.ts` on upload URLs, scans, Style DNA, looks and chat. |
| S5 | `startExtraction` accepted unbounded `storageIds` (only the first 10 are ever read). | **Fixed** — capped at 10. |

## 2. Correctness bugs

| # | Finding | Status |
|---|---|---|
| B1 | **Dark mode hid the buttons.** In dark mode `tint` is `#EDEAE4` (near-white) and seven screens hard-coded `#FFFFFF` text on it: sign-in, closet chips + Add, add-item Save, item Edit, Style DNA, camera picker, chat Send and user bubbles. | **Fixed** — all use `colors.onTint`. |
| B2 | **First launch crashed.** `AuthGate` fired `upsertFromAuth` and rendered the tabs at once. Every `authedQuery` throws `User not found` until that row exists, so a new user's first render hit the error boundary. | **Fixed** — `AuthGate` waits for the upsert, with a retry on failure. |
| B3 | **Sign-up → onboarding always failed.** `/onboarding/style-dna` is outside `(tabs)`, so `AuthGate` never ran and the `users` row was never created. `generateUploadUrl` threw on the first photo. | **Fixed** — the onboarding route is wrapped in `AuthGate`. |
| B4 | **Sign-up could not finish.** Clerk requires email verification by default. The screen said "check your email" but had nowhere to type the code, so new accounts were stuck. | **Fixed** — email-code step (`prepare/attemptEmailAddressVerification`), readable Clerk error messages, `<Redirect>` in place of `router.replace` during render. |
| B5 | **AI failures were saved as real data.** `recognizeGarment` returned a fake "clothing item" and `extractStyleDna` returned a placeholder profile on *any* error. The placeholder was saved as the user's Style DNA and onboarding was marked complete. | **Fixed** — real errors now throw. The job fails with a readable message. The no-API-key fallback is kept for local development. |
| B6 | **Double-tapping Save created duplicates.** `confirmGarment` ran again for the same job, and also ran for jobs that had not finished. | **Fixed** — it returns the existing item if one was saved, requires `status === "complete"` and `type === "garment"`. |
| B7 | **Deleting an item left dangling data.** The image stayed in storage, and outfits kept the deleted id, so `LookCard` links pointed at "Item not found". | **Fixed** — `wardrobe.remove` deletes the file and removes the id from outfits (an outfit left with no items is deleted). |
| B8 | A missing `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` rendered the app without providers, which crashed later inside `useQuery` with an unclear error. | **Fixed** — it now throws at startup with the variable's name, the same way `lib/convex.ts` does. |
| B9 | Style DNA extraction runs in the background with no status. After "Analyze", the user lands on Home and still sees "Discover your Style DNA" until the job finishes, or forever if it failed. | **Fixed** — `styleDnaJobs` table. Home shows reading / failed / the profile. |
| B10 | The stylist chat lives in component state. Every visit to the tab creates a new thread, and history is lost when the screen unmounts. `listThreadMessages` and `sendChatMessage` exist but nothing calls them. | **Fixed** — `styling.currentThread` resumes the latest thread. Replies stream through saved deltas and `useUIMessages`. |
| B11 | Generated looks are thrown away when the user leaves the tab, although they are saved as `outfits`. No screen lists saved outfits. | **Fixed** — Looks lists saved outfits (`outfits.listLooks`), each with Remove. |
| B12 | The review step on the add screen shows only name, category and subcategory. Colors, pattern, fit, season and occasions can't be corrected before saving. Item detail only allows renaming. | **Fixed** — `GarmentForm` edits every attribute, in both places. |

## 3. AI and model hygiene

| # | Finding | Status |
|---|---|---|
| A1 | The stylist used `claude-sonnet-4-20250514`, which is **deprecated**. | **Fixed** — `claude-sonnet-5` (the current Sonnet, supported by the installed `@ai-sdk/anthropic`). |
| A2 | Gemini `gemini-2.0-flash` is hard-coded in two places and is an older generation. | **Partly fixed** — every id lives in `lib/models.ts`. Setting `GEMINI_MODEL` in Convex moves to a newer Flash without a deploy. The default stays the same until someone confirms the current id. |
| A3 | `generateOutfits` asks for JSON in prose and parses it with a regex. | **Fixed** — `generateText` with `Output.object` and the zod schema. |
| A4 | `generateOutfits` creates a new agent thread on every tap. Threads pile up and are never read. | **Fixed** — a one-shot call with no thread. |
| A5 | The whole wardrobe and profile are added to *every* chat message, so each thread stores many copies and token cost grows with every turn. | **Fixed** — sent as the per-call `system` prompt. |
| A6 | Gemini `mimeType` is cast from the response header with no check. | **Fixed** — `geminiImageType` checks it. |

## 4. Data model and backend structure

- **Fixed:** the category union was copied in 5 places and the garment-result object in 3. They now live in `convex/lib/validators.ts`.
- **Fixed:** `getJobInternal` was an `internalMutation` used only for reading. It is now an `internalQuery`.
- Open: `wardrobeItems.imageUrl` stores a URL at insert time. Save only `storageId` and resolve the URL on read, so it survives changes to the storage URL format.
- Open: `recognitionJobs.styleDnaResult` and `completeStyleDnaJob.result` use `v.any()`. Use a real validator.
- **Fixed:** a daily cron (`convex/crons.ts`) deletes scans older than 24h that were never saved, along with their photos.
- **Fixed:** `stylingSessions` and `outfits.remove` are now used. `wardrobe.search`, `getInventorySummary` and `users.completeOnboarding` are deleted.
- Open: `.collect()` on the whole wardrobe is fine now. Past a few hundred items, paginate `wardrobe.list` and filter by category with the existing `by_user_and_category` index.
- **Fixed:** the `as never` casts are gone. `threadOwner()` in `stylistAgent.ts` is the one checked conversion.

## 5. Frontend and design system

- **Fixed — two visual languages.** Home, Closet, Add, Item, Sign-in, Style DNA and Chat used starter-template styling. Every screen now builds from `components/ui/` (Kicker, Title, Body, Button, Chip, Field, Screen), in the editorial language that Looks had.
- **Fixed — accessibility.** Roles, states, labels and live regions are built into the primitives. Swatches have spoken color names, images have labels, and touch targets are at least 44pt.
- **Fixed:** every screen uses `expo-image`.
- **Fixed:** chat uses `useHeaderHeight()` for the keyboard offset.
- **Fixed:** list keys are now stable ids.
- **Fixed:** the leftover template files are deleted.
- **Fixed:** Home has a sign-out.
- By design: onboarding isn't forced. Home offers Style DNA until it exists, and without it the stylist says it is inferring.

## 6. Tooling, config and release readiness

- **Fixed:** there was no CI. `.github/workflows/ci.yml` now runs both typechecks (`typecheck`, new `typecheck:convex`).
- **Fixed:** there were no tests. `convex-test` + Vitest now cover S1, S2, S3, S4, B6, B7, saved looks and DNA jobs (`npm test`, in CI).
- **Fixed:** ESLint with `eslint-config-expo` (`npm run lint`, in CI). No Prettier yet.
- Open: `app.json` has `name`/`slug`/`scheme` set to `"fashion"` and no `ios.bundleIdentifier` or `android.package`. EAS production builds and store submission need both.
- **Fixed:** removed `@anthropic-ai/sdk`, `expo-camera` and `expo-haptics`. `expo-file-system` and `expo-linking` stay because Expo and Expo Router depend on them.
- **Fixed:** `ai` and `@ai-sdk/*` moved to `dependencies`. Both the Convex functions and the chat screen use them.
- Open: there's no crash or error reporting (e.g. Sentry via `sentry-expo`) and no product analytics.
- **Fixed:** README now covers the Clerk `convex` JWT template, email-code verification, the checks, and the layout.

---

## Still open

1. **App identity.** `app.json` still uses `name`/`slug`/`scheme` `"fashion"` and has no `ios.bundleIdentifier` or `android.package`. They need the owner's reverse-domain id, and they are hard to change after a store release.
2. **Crash reporting.** Add Sentry (`@sentry/react-native`) once there is a DSN.
3. `wardrobeItems.imageUrl` is stored at insert time. Resolving it from `storageId` on read needs a small migration.
4. `recognitionJobs.styleDnaResult` is `v.any()`, and the single-image `style_dna` recognition path is unused.
5. Paginate `wardrobe.list` past a few hundred items.
6. `convex/_generated/api.d.ts` was updated by hand, because no Convex deployment is available here. The first `npx convex dev` rewrites it, and the diff should be empty.
