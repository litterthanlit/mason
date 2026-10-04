import type { Doc } from "../_generated/dataModel";

type Garment = Pick<
  Doc<"wardrobeItems">,
  "name" | "category" | "subcategory" | "colors" | "pattern" | "fit" | "material"
>;

// The same backdrop everywhere, so mockups and renders read as one catalogue
// and the model has less to invent (docs/TRY-ON.md: consistency is cheaper).
const BACKDROP = "a seamless warm off-white studio backdrop (#EEEBE5), soft even daylight, a soft contact shadow";

const PRESENTATION: Record<Garment["category"], string> = {
  top: "an invisible-mannequin (ghost mannequin) front view, sleeves relaxed",
  outerwear: "an invisible-mannequin (ghost mannequin) front view, closed or as photographed",
  dress: "an invisible-mannequin (ghost mannequin) front view, full length in frame",
  bottom: "a front view laid flat and straight, full length in frame",
  shoes: "the pair, side-by-side, three-quarter view from the outer side",
  bag: "upright, front view, handles or strap arranged naturally",
  accessory: "front view, centred, at a scale that fills the frame",
  other: "front view, centred",
};

function describe(g: Garment) {
  const parts = [g.subcategory || g.name, g.fit && `${g.fit} fit`, g.pattern, g.material].filter(Boolean);
  return `${parts.join(", ")} (colours ${g.colors.join(", ")})`;
}

/** Turn a closet photo into a catalogue packshot without redesigning the garment. */
export function mockupPrompt(g: Garment) {
  return `This photo shows one garment: ${describe(g)}.

Re-photograph exactly this garment as a clean e-commerce product image:
- Presentation: ${PRESENTATION[g.category]}.
- Background: ${BACKDROP}. Remove hangers, hands, people, furniture and clutter.
- Portrait 3:4 frame, garment centred with even margins.

Fidelity is the whole job. Keep the cut, length, proportions, colour, wash, fabric texture, pattern scale, print, logos, labels, buttons, zips, stitching and any wear exactly as photographed. Do not add, remove, restyle, recolour, or "improve" anything. Smooth only creases caused by how it was laid down. No text, no watermark.`;
}

const LAYER_ORDER: Garment["category"][] = ["dress", "top", "bottom", "outerwear", "shoes", "bag", "accessory", "other"];

/** Inside-out wearing order. Send garment images in this order too: the prompt numbers them by it. */
export function byLayer<T extends Pick<Garment, "category">>(garments: T[]) {
  return [...garments].sort((a, b) => LAYER_ORDER.indexOf(a.category) - LAYER_ORDER.indexOf(b.category));
}

/** Dress the person in image 1 with the garments in images 2..n, already in `byLayer` order. */
export function tryOnPrompt(ordered: Garment[]) {
  const list = ordered.map((g, i) => `  Image ${i + 2} — ${g.category}: ${describe(g)}`).join("\n");
  const replaces = new Set(ordered.map((g) => g.category));
  const keep =
    replaces.has("dress") || (replaces.has("top") && replaces.has("bottom"))
      ? "Replace their clothing entirely with the pieces listed."
      : "Replace only the matching pieces; keep anything not listed exactly as they wear it in image 1.";

  return `Image 1 is a real person. The other images are garments from their own closet:
${list}

Make one photorealistic full-length photograph of the person in image 1 wearing these garments.

Identity is fixed: same face, hair, skin tone, body shape, height and proportions as image 1. Keep their pose and camera angle. Do not slim, age, beautify or retouch them.

Garments are fixed: reproduce each one exactly — colour, pattern scale, print, logos, length, fabric weight and drape. Fit it to their body the way that cut would really fall. Do not invent extra pieces. ${keep} Layer outerwear over the top, open if that is how it is usually worn.

Setting: ${BACKDROP}, full body in frame head to feet, portrait 3:4. No text, no watermark.`;
}
