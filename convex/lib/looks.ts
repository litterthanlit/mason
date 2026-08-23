import { z } from "zod";

export const looksPayloadSchema = z.object({
  looks: z
    .array(
      z.object({
        name: z.string(),
        itemIds: z.array(z.string()),
        rationale: z.string(),
      }),
    )
    .max(2),
  missing: z.string().nullable(),
});

export type LooksPayload = z.infer<typeof looksPayloadSchema>;

export function parseLooksPayload(text: string): LooksPayload {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("The stylist returned nothing wearable.");
  }

  const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
  return looksPayloadSchema.parse(parsed);
}
