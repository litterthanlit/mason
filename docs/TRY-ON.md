# Personal Stylist Avatar & Try-On — Master Note

Status: **direction, not shipped.** The app today is a closet + Style DNA + stylist. Face scan, photoreal wearing, and paste-a-link try-on are **not** user-facing yet. Do not treat this document as a completed feature.

Captured: September 2026.

---

## Thesis

A personal fashion assistant that:

1. Captures **you** (face + enough body to fit clothes).
2. Takes **what you own** and **what you want to buy**.
3. Recreates a **realistic still of you wearing those clothes**.

The render is proof. The product is the stylist: closet as a dataset, identity that does not drift, taste that learns what you actually wear.

The moat is not “put a shirt on a face.” Everyone will have that.

---

## Two products hiding in one idea

| | Try-on | Avatar stylist |
|---|---|---|
| Input | Photo of you + photo (or URL) of a garment | Scan once, then keep adding closet + wishlist |
| Output | One composite | The same person, dressed over time |
| Job | “Should I buy this?” | “Dress me, from what I own and might own” |
| Difficulty | Buildable now | Harder; this is the version we mean |

Most apps fake the second with the first. Users notice.

This repo already has the non-visual half of the stylist (wardrobe, DNA, occasion looks, chat). Try-on is the missing proof layer — and a new input path for **wishlist** items, which the current stylist is forbidden to invent.

---

## What “scan your face” actually needs

A face crop is not enough if clothes should look like they fit *this* body.

Need:

- Identity — face, hair, skin
- Body — height, shoulders, torso, hips
- A lighting/camera model so new clothes do not look pasted on

Phones are enough: 3–5 full-body photos, or LiDAR on iPhone, plus a parametric body (SMPL-family). No booth. A theatrical 60-second face scan is the wrong capture flow. Bad capture makes a permanent cousin, not a twin.

---

## What makes clothes look real

Three layers, increasing difficulty:

1. **2D virtual try-on** — warp the garment onto the photo. Good for tops and dresses. Weak on fit, occlusions, weird poses, patterned fabric. Best for “this exact SKU.”
2. **Image generation with identity lock** — “this person wearing this item.” Best-looking *as a photo* in 2025–2026. Least physically true. Hallucinates collar, length, logo, drape. Risky if people buy from it.
3. **3D garment on a 3D body** — real drape, size, cloth sim (CLO / Marvelous). Slow, expensive, needs clean garment data most brands will not give. Lab + partnerships, not v1.

If we ever want *really* realistic, mix them: stable 3D body as source of truth, then a tightly constrained photoreal pass (Gaussian/NeRF avatar or locked image model) so it does not look like a mannequin.

**The thing that actually breaks is not the first wow screenshot. It is consistency.** Same person next Tuesday, different lighting, new jacket. Hands, hair, shoes, glasses. Knit vs structured tailoring. A size 4 and a size 10 on the same photo is a lie people will punish.

A stylist that recommends well and visualizes “good enough” can ship. A stylist that claims the render is how it will look on your body is making a **fit promise**. That is a trust product, not a demo.

---

## Where to aim (v1)

Not a full 3D metaverse avatar.

- Capture: 3–5 photos, not scan theater
- Closet: photos of what you own + links/screenshots of what you want
- Output: photoreal try-on **and** a still that still looks like you, same identity every time
- Stylist layer: “this with that, for this context”
- One good still of a known garment on a stable you
- Not video, not every SKU on the internet, not perfect fabric physics

---

## Cost and sustainability

Renders are the scarce resource. The closet is not.

Unlimited photoreal “paste 20 links, see yourself in all of them” is a money incinerator. A closet you keep forever, plus a small number of serious try-ons, can work.

### Where the money goes

Almost nothing is expensive except the image.

| Step | Typical cost (Sep 2026) | How often |
|---|---|---|
| Fetch a product page, extract title/price/images | fractions of a cent | **once per product, then cache** |
| Clean/crop the garment | ~$0.001–0.01 | once per product |
| Face/body pack | cheap after first capture | once |
| Dedicated virtual try-on | ~$0.02–0.08 | every look |
| Identity-locked photoreal (Flux-class / Nano Banana / GPT Image with reference photos) | ~$0.05–0.25 | every look |
| Video / 360 / many poses | dollars, fast | skip for v1 |

Ballpark APIs (will move; re-check before building):

- Cheap research try-on (e.g. IDM-VTON on Replicate): ~$0.024/run. Many of these checkpoints are **non-commercial**. The $0.02 demo is not production cost.
- Commercial try-on APIs: ~$0.04–0.08
- FASHN-class: ~$0.075
- Flux schnell: ~$0.003/MP; Flux.2 Pro: ~$0.03/MP; Nano Banana Pro: ~$0.15/image
- GPT Image high quality with your photos as inputs: often $0.05–0.20+ (pay for images in **and** out)

**Trap:** one user tap is not one model call. Extract + segment + try-on + face-lock refine is 2–4 paid inferences. A $0.03 demo becomes a $0.12 look.

### A monthly picture that works

Charge **$12/month**:

- 30 cheap previews at $0.02 → $0.60
- 10 “this is me” stills at $0.10 → $1.00
- Fetch / storage / LLM glue → ~$0.20
- **COGS ≈ $1.80** before app, support, retries, failed gens, moderation

Same user in shopping mode: 8 brands × 6 items × 2 colors = 96 renders. At $0.10 that is **$9.60 GPU on a $12 plan**. One heavy user wipes the margin. AI photo apps die this way unless they meter.

### What makes the unit economics hold

- Cache the **garment**, never re-scrape the same dress for the 4,000th user
- Compute **you** once (face embedding + 3–5 refs + body)
- Preview cheap and slightly fake; HD only when they are close to buying
- Style in language first, render **1–3 looks**, not 40
- Same studio lighting and pose every time — consistency is cheaper than “photoreal in any cafe”
- At a few thousand daily looks, APIs are fine. Self-host GPUs only after demand exists
- Free scan/closet, paid renders. Example: 20 previews + 5 HD / week, not infinity

**Sustainable loop:** extract once, identity once, render rarely, reuse always.

**Unsustainable loop:** every tap is a new photoreal generation.

Two different businesses, two cost ceilings:

- **$10/mo closet app** — metered stills
- **Brand widget** — they pay because it lifts conversion (classic way this becomes sustainable; consumer app is the wedge)

---

## Paste a product link — how it actually gets made

The model does **not** visit the PDP and imagine the clothes. That is how you get a beige hallucination that is not the SKU.

### Pipeline

1. **Resolve the URL** — Shopify / JSON-LD / Open Graph, or a shopping API. Raw scraping is fragile (bot walls, ToS, regions, sold-out variants).
2. **Pick a garment image, not a lifestyle image.** Packshot / ghost mannequin / flat lay beats a model in a forest. If you only have a model shot, **segment the garment off their body** first.
3. **Normalize** — colorway, front view, crop, category (`upper` / `lower` / `dress`). Garbage here and no generator will save you. This is the quiet quality step, and it will cost more engineering than the avatar.
4. **Save a closet/wishlist object** — image + mask + title + merchant + size if available. Next time it is free.
5. **Try it on the avatar** — locked identity photos + that garment image → one still.

### Two ways to “make it” (not interchangeable)

| Method | What it does | Use when |
|---|---|---|
| **Virtual try-on** (IDM-VTON class, FASHN, etc.) | Warps the **actual product pixels** onto the body | “Should I buy this exact item” |
| **Identity-locked image model** | “This person wearing this garment” | Beautiful almost-right stylist stills |

For purchase decisions, prefer try-on fidelity. For stylist proof, a two-pass is allowed: try-on for the garment, then a light photoreal grade that is **not allowed to redesign the clothes**.

### The link itself is a bad primary input

Product pages lie: stacked shots, on-model photos, three colors in one carousel, zoom tiles, watermarks.

What works in the wild, in order:

1. User uploads a photo of the item (most reliable)
2. Affiliate / product APIs with structured images
3. Brand partnerships (they give the packshot)
4. Link paste as convenience, with **“is this the right item?”** before spending GPU

Legal/product note: personal try-on of a branded SKU is a different product than generating catalog images for resale.

---

## How this sits on the current app

Already in the repo (user-facing):

- Photograph clothes → garment attributes → wardrobe
- Style DNA from inspiration photos
- Occasion outfits from **owned** pieces only
- Conversational stylist grounded in wardrobe + DNA (`convex/lib/styleCanon.ts`)

Not built:

- Body/face capture pack
- Persistent visual identity
- Wishlist items (today the stylist must not invent pieces)
- Product URL ingest
- Any try-on or photoreal wearing path
- Credits / metered renders

If try-on ships, wishlist items become first-class wardrobe objects (owned vs wanted). The stylist can then compose across both, and the render is how you see the gap.

---

## Build rules if this gets scheduled

- Do not claim try-on complete until there is a user-facing path (capture or closet item → still of you in it).
- Do not ship unlimited HD.
- Do not use non-commercial try-on checkpoints in production.
- Do not let the photoreal pass change the garment.
- Confirm the SKU crop before GPU.
- Expo SDK 57 docs before any native capture work: https://docs.expo.dev/versions/v57.0.0/

---

## Open questions

1. Consumer metered app, brand widget, or both (widget pays for the consumer GPU)?
2. Purchase-grade fidelity (VTON) vs stylist-grade beauty (identity-locked gen) as the default still?
3. Capture: photo pack only, or LiDAR where available?
4. Wishlist: URL, screenshot, or photo-first with URL as a shortcut?
5. Does “Style Me” stay owned-only, with try-on on a separate Buy / Want surface?
