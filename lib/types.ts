export type GarmentCategory =
  | "top"
  | "bottom"
  | "dress"
  | "outerwear"
  | "shoes"
  | "accessory"
  | "bag"
  | "other";

export const GARMENT_CATEGORIES: GarmentCategory[] = [
  "top",
  "bottom",
  "dress",
  "outerwear",
  "shoes",
  "accessory",
  "bag",
  "other",
];

export const OCCASIONS = [
  "casual",
  "work",
  "formal",
  "smart-casual",
  "athletic",
  "evening",
  "date",
] as const;

export const SEASONS = ["spring", "summer", "fall", "winter", "all-season"] as const;

export const CATEGORY_LABELS: Record<GarmentCategory, string> = {
  top: "Top",
  bottom: "Bottom",
  dress: "Dress",
  outerwear: "Outerwear",
  shoes: "Shoes",
  accessory: "Accessory",
  bag: "Bag",
  other: "Other",
};
