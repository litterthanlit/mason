# Fashion Agent

Native mobile AI stylist built with Expo, Convex, and Clerk.

## Features

- **Digital Closet** — Photograph clothes, AI recognizes garment attributes, save to your wardrobe
- **Style DNA** — Upload inspiration photos to build a personal style profile
- **Style Me** — Occasion-based outfit suggestions from your closet
- **AI Stylist** — Conversational chat grounded in your wardrobe and style profile

Photoreal avatar / virtual try-on is **not shipped**. Direction, cost model, and the paste-a-link pipeline live in [`docs/TRY-ON.md`](docs/TRY-ON.md).

## Stack

- Expo SDK 57 + Expo Router
- Convex (database, file storage, real-time sync, AI actions)
- Clerk (auth)
- Gemini Flash (garment recognition + style DNA)
- Claude Sonnet 5 via `@convex-dev/agent` (styling agent; model ids in `convex/lib/models.ts`)
- `@convex-dev/rate-limiter` (per-user limits on uploads and AI calls)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in:

- `EXPO_PUBLIC_CONVEX_URL` — from `npx convex dev`
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` — from Clerk dashboard
- `CLERK_JWT_ISSUER_DOMAIN` — set in Convex env vars

In Convex dashboard, also set:

- `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GEMINI_MODEL` (optional) — override the Gemini Flash model id without a deploy

### Clerk

- Create a **JWT template named `convex`** in the Clerk dashboard (Convex reads it via `auth.config.ts`).
- Enable **email + password** with **email verification code**. Sign-up asks for the code in-app.

### 3. Start Convex

```bash
npx convex dev
```

### 4. Start Expo

```bash
npm start
```

Press `i` for iOS simulator or scan QR code on device.

## Checks

```bash
npm run lint              # ESLint (eslint-config-expo)
npm run typecheck         # app
npm run typecheck:convex  # Convex functions
npm test                  # convex-test: auth, ownership, rate limits
```

CI runs all four on every pull request.

## Project structure

```
app/            Expo Router screens
components/ui/  Design system: Title, Kicker, Body, Button, Chip, Field, Screen
components/     Feature components (GarmentForm, LookCard, ItemCard, Swatch)
convex/         Backend (schema, wardrobe, recognition, stylist agent, crons)
convex/lib/     Auth, ownership (threads, uploads), rate limits, models, prompts
lib/            Client utilities (uploads, error messages, color names)
docs/           AUDIT.md (findings and status), TRY-ON.md (direction)
```

## EAS Build

```bash
npx eas build --profile preview --platform ios
```
