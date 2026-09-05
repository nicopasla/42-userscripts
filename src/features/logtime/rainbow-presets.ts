export interface RainbowPalette {
  label: string;
  colors: string[];
}

export const RAINBOW_PALETTES: Record<string, RainbowPalette> = {
  rainbow: {
    label: "Classic rainbow",
    colors: [
      "#ff0000",
      "#ff7f00",
      "#ffeb3b",
      "#4caf50",
      "#00bcd4",
      "#2196f3",
      "#3f51b5",
      "#9c27b0",
      "#e91e63",
      "#ff0000",
    ],
  },
  sunset: {
    label: "Sunset",
    colors: ["#ff512f", "#ff9966", "#ffd194", "#ffb347", "#e65c00", "#ff512f"],
  },
  ocean: {
    label: "Ocean",
    colors: ["#00c6ff", "#0072ff", "#00b4d8", "#48cae4", "#90e0ef", "#00c6ff"],
  },
  forest: {
    label: "Forest",
    colors: ["#56ab2f", "#a8e063", "#2d6a4f", "#40916c", "#74c69d", "#56ab2f"],
  },
  candy: {
    label: "Candy",
    colors: ["#ff9a9e", "#fad0c4", "#fbc2eb", "#a18cd1", "#fccb90", "#ff9a9e"],
  },
  mono: {
    label: "Mono teal",
    colors: ["#00bcba", "#006d77", "#83c5be", "#00bcba", "#2a9d8f", "#00bcba"],
  },
};

export function resolveRainbowColors(
  paletteId: string | undefined | null,
): string {
  const palette =
    (paletteId && RAINBOW_PALETTES[paletteId]) || RAINBOW_PALETTES.rainbow;
  return palette.colors.join(", ");
}
