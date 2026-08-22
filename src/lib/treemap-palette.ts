/**
 * Fills for additive treemaps.
 *
 * One accented lead colour, then ink and muted accent steps — never a rainbow.
 * Light tiles use dark label ink so text stays readable (DESIGN.md charts).
 */

export type TreemapInk = "light" | "dark";

export type TreemapTileStyle = {
  fill: string;
  ink: TreemapInk;
};

const TILES: readonly TreemapTileStyle[] = [
  { fill: "var(--chart-primary)", ink: "light" },
  { fill: "var(--chart-secondary)", ink: "light" },
  { fill: "var(--color-accent-700)", ink: "light" },
  { fill: "var(--color-neutral-700)", ink: "light" },
  { fill: "var(--color-accent-600)", ink: "light" },
  { fill: "var(--chart-tertiary)", ink: "light" },
  { fill: "var(--color-accent-500)", ink: "light" },
  { fill: "var(--color-neutral-600)", ink: "light" },
  { fill: "var(--color-accent-400)", ink: "dark" },
  { fill: "var(--chart-quaternary)", ink: "dark" },
  { fill: "var(--color-accent-300)", ink: "dark" },
  { fill: "var(--color-neutral-500)", ink: "light" },
];

export function treemapTile(index: number): TreemapTileStyle {
  return TILES[Math.max(0, index) % TILES.length]!;
}
