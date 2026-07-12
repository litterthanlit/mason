# Fashion Agent

Native mobile AI stylist built with Expo, Convex, and Clerk.

## Features

- **Digital Closet** — Photograph clothes, AI recognizes garment attributes, save to your wardrobe
- **Style DNA** — Upload inspiration photos to build a personal style profile
- **Style Me** — Occasion-based outfit suggestions from your closet
- **AI Stylist** — Conversational chat grounded in your wardrobe and style profile

## Stack

- Expo SDK 57 + Expo Router
- Convex (database, file storage, real-time sync, AI actions)
- Clerk (auth)
- Gemini Flash (garment recognition + style DNA)
- Claude via `@convex-dev/agent` (styling agent)

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

### 3. Start Convex

```bash
npx convex dev
```

### 4. Start Expo

```bash
npm start
```

Press `i` for iOS simulator or scan QR code on device.

## Project structure

```
app/           Expo Router screens
components/    Shared UI components
convex/        Backend (schema, wardrobe, recognition, agent)
lib/           Client utilities
```

## EAS Build

```bash
npx eas build --profile preview --platform ios
```
