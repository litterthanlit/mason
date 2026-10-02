// Coarse names so a screen reader can say what a swatch shows.
const NAMED: [string, [number, number, number]][] = [
  ["black", [20, 20, 20]],
  ["charcoal", [60, 60, 60]],
  ["grey", [128, 128, 128]],
  ["light grey", [200, 200, 200]],
  ["white", [250, 250, 250]],
  ["off-white", [236, 230, 218]],
  ["beige", [210, 190, 160]],
  ["camel", [190, 145, 95]],
  ["brown", [110, 70, 40]],
  ["navy", [25, 35, 75]],
  ["blue", [50, 90, 190]],
  ["pale blue", [165, 195, 225]],
  ["green", [50, 120, 60]],
  ["olive", [110, 110, 55]],
  ["red", [190, 40, 40]],
  ["oxblood", [95, 25, 30]],
  ["pink", [230, 160, 180]],
  ["yellow", [230, 200, 60]],
  ["orange", [225, 120, 40]],
  ["purple", [110, 60, 140]],
];

export function colorName(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  let best = NAMED[0];
  let bestDist = Infinity;
  for (const entry of NAMED) {
    const d = entry[1].reduce((sum, c, i) => sum + (c - rgb[i]) ** 2, 0);
    if (d < bestDist) {
      bestDist = d;
      best = entry;
    }
  }
  return best[0];
}

export function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value.trim());
}
