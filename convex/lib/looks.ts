import { z } from "zod";

export const looksPayloadSchema = z.object({
  looks: z
    .array(
      z.object({
        name: z.string().describe("Two or three words, editorial, not 'Outfit 1'"),
        itemIds: z.array(z.string()).describe("Exact wardrobe ids from the list, in wearing order"),
        rationale: z.string().describe("One paragraph: silhouette, then the tension"),
      }),
    )
    .max(2),
  missing: z
    .string()
    .nullable()
    .describe("One specific missing garment, or null if the closet can dress this"),
});

export type LooksPayload = z.infer<typeof looksPayloadSchema>;
