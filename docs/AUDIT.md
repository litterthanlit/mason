# Repo Audit — September 2026

Scope: every source file in `app/`, `components/`, `lib/`, `convex/`, plus config (`app.json`, `eas.json`, `package.json`, tsconfigs). Both `tsc` projects were clean before and after the changes.

Legend: **Fixed** = changed on this branch. **Open** = recommended, not done yet.

---

## 1. Security

| # | Finding | Status |
|---|---|---|
| S1 | **Thread IDOR.** `styling.listThreadMessages`, `styling.sendChatMessage` and `stylingAgent.sendMessage` took any `threadId` and only checked that the caller was signed in. Any user could read another user's stylist chat, or write into it and run the agent with their own closet as context. | **Fixed** — `convex/lib/threads.ts` `assertThreadOwner` checks the thread's `userId` on all three. |
| S2 | **Agent could save outfits with any id.** The `createOutfit` tool passed model output to `createOutfitInternal` with `as never`, with no ownership check. A foreign or made-up id either crashed the validator or was stored. | **Fixed** — `createOutfitInternal` normalizes the ids, keeps only the user's own items, and rejects an empty result. |
| S3 | **Storage ids are trusted.** `startRecognition`, `startExtraction` and `wardrobe.create` accept any `_storage` id. Ids are hard to guess, but nothing ties an upload to the uploader. | Open — record uploads in an `uploads` table (`storageId`, `userId`) from a mutation called after upload, and check it before use. |
| S4 | **No rate limits on paid AI calls.** `generateOutfits`, `sendMessage`, `startRecognition`, `startExtraction` can be called in a loop and bill Gemini/Anthropic without limit. | Open — add `@convex-dev/rate-limiter` (per user, token bucket) around the four entry points. |
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
| B9 | Style DNA extraction runs in the background with no status. After "Analyze", the user lands on Home and still sees "Discover your Style DNA" until the job finishes, or forever if it failed. | Open — reuse the `recognitionJobs` pattern (a `styleDnaJobs` row with status) and show progress on Home. |
| B10 | The stylist chat lives in component state. Every visit to the tab creates a new thread, and history is lost when the screen unmounts. `listThreadMessages` and `sendChatMessage` exist but nothing calls them. | Open — keep the user's latest thread (a `stylingSessions` row) and render with `useUIMessages` + streaming from `@convex-dev/agent/react`. |
| B11 | Generated looks are thrown away when the user leaves the tab, although they are saved as `outfits`. No screen lists saved outfits. | Open — add a "Saved looks" list built on `outfits.list`. |
| B12 | The review step on the add screen shows only name, category and subcategory. Colors, pattern, fit, season and occasions can't be corrected before saving. Item detail only allows renaming. | Open. |

## 3. AI and model hygiene

| # | Finding | Status |
|---|---|---|
| A1 | The stylist used `claude-sonnet-4-20250514`, which is **deprecated**. | **Fixed** — `claude-sonnet-5` (the current Sonnet, supported by the installed `@ai-sdk/anthropic`). |
| A2 | Gemini `gemini-2.0-flash` is hard-coded in two places and is an older generation. | Open — check Google's current Flash model and move the id into one constant or an env var. |
| A3 | `generateOutfits` asks for JSON in prose and parses it with a regex. | Open — use the agent's `generateObject` with `looksPayloadSchema` so the output is always valid. |
| A4 | `generateOutfits` creates a new agent thread on every tap. Threads pile up and are never read. | Open — use a one-shot `generateObject` with no thread, or reuse one per session. |
| A5 | The whole wardrobe and profile are added to *every* chat message, so each thread stores many copies and token cost grows with every turn. | Open — pass it as per-call system context, or add it once per thread. |
| A6 | Gemini `mimeType` is cast from the response header with no check. | Open — the upload path always makes JPEGs, so default to `image/jpeg` when the header isn't a supported image type. |

## 4. Data model and backend structure

- **Fixed:** the category union was copied in 5 places and the garment-result object in 3. They now live in `convex/lib/validators.ts`.
- **Fixed:** `getJobInternal` was an `internalMutation` used only for reading. It is now an `internalQuery`.
- Open: `wardrobeItems.imageUrl` stores a URL at insert time. Save only `storageId` and resolve the URL on read, so it survives changes to the storage URL format.
- Open: `recognitionJobs.styleDnaResult` and `completeStyleDnaJob.result` use `v.any()`. Use a real validator.
- Open: `recognitionJobs` and unconfirmed uploads are never cleaned up. Add a daily cron that deletes jobs older than 24h that have no `wardrobeItemId`, together with their files.
- Open: `stylingSessions` and `wardrobe.search` / `getInventorySummary` / `outfits.create` / `outfits.remove` / `users.completeOnboarding` are defined but unused. Wire them up or delete them.
- Open: `.collect()` on the whole wardrobe is fine now. Past a few hundred items, paginate `wardrobe.list` and filter by category with the existing `by_user_and_category` index.
- Open: the `as never` casts in `stylingAgent.ts` and `stylistAgent.ts` (the `userId` passes) hide type errors. Type `ctx.userId` as `Id<"users">` once, in one helper.

## 5. Frontend and design system

- **Two visual languages.** `style-me.tsx` and `LookCard` use the editorial system (Instrument Serif + IBM Plex, uppercase tracking, hairlines, square buttons). Home, Closet, Add, Item, Sign-in, Style DNA and Chat still use starter-template styling (bold system font, 12px rounded pills). Open — pull `Kicker`, `Title`, `Button` (primary/outline) and `Chip` into `components/ui/` and move every screen onto them.
- **Accessibility** (open, except sign-in and AuthGate, which are fixed):
  - Most `Pressable`s have no `accessibilityRole="button"`, and chips have no `accessibilityState={{ selected }}`.
  - Color swatches carry the only color information. Give each an `accessibilityLabel`, such as a readable color name.
  - Garment images have no `accessibilityLabel` (use the item name).
  - Loading states give screen readers nothing to announce. Add `accessibilityLiveRegion` or labels.
  - Several touch targets, such as the occasion links and filter chips, are under 44×44pt. Add `hitSlop` or padding.
- `add.tsx` and `style-dna.tsx` use RN `Image`. Use `expo-image` everywhere, as the rest of the app does, for caching.
- `agent.tsx` uses `keyboardVerticalOffset={90}`, which is wrong on some devices. Use `useHeaderHeight()`.
- `FlatList` keys use the array index in chat, the color value for swatches (duplicates collide) and `look.name` in Looks.
- Leftover template files: `EditScreenInfo.tsx`, `StyledText.tsx`, `ExternalLink.tsx`, `Themed.tsx` (only `+not-found` uses it).
- No sign-out control anywhere.
- Onboarding is not enforced: `users.onboardingComplete` is stored but never read on the client.

## 6. Tooling, config and release readiness

- **Fixed:** there was no CI. `.github/workflows/ci.yml` now runs both typechecks (`typecheck`, new `typecheck:convex`).
- Open: no tests. Start with `convex-test` + Vitest for the auth and ownership rules above (S1, S2, B6, B7), since a regression there is a data leak.
- Open: no ESLint or Prettier. Add `eslint-config-expo` and `npx expo lint`.
- Open: `app.json` has `name`/`slug`/`scheme` set to `"fashion"` and no `ios.bundleIdentifier` or `android.package`. EAS production builds and store submission need both.
- Open: `@anthropic-ai/sdk`, `expo-camera` (only listed as a plugin), `expo-haptics`, `expo-file-system` and `expo-linking` are installed but never imported. Remove them or use them.
- Open: `ai` and `@ai-sdk/*` are in `devDependencies` but run in production Convex functions. Move them to `dependencies`.
- Open: there's no crash or error reporting (e.g. Sentry via `sentry-expo`) and no product analytics.
- Open: README doesn't mention that Clerk needs the **Convex JWT template**, or that email verification is on.

---

## Suggested order for the open work

1. Rate limits (S4) and upload ownership (S3). These cost money and privacy if skipped.
2. `convex-test` coverage for the ownership rules on this branch.
3. Chat persistence and streaming (B10), plus Style DNA status (B9). These are the two most visible UX gaps.
4. Structured output for looks (A3/A4) and a single model config (A2).
5. Shared `components/ui` primitives, with an accessibility pass as screens move onto them.
6. Release config: bundle ids, lint, Sentry.
