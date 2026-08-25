import type { Urgency } from "@/types";

import { TONE } from "./tone";

export const URGENCY_LABEL: Record<Urgency, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Shares hues with topics, so it's separated by treatment instead.
export const URGENCY_TONE: Record<Urgency, string> = {
  high: TONE.red,
  medium: TONE.amber,
  low: TONE.teal,
};

// Only `high` gets the solid fill, keeping at most one loud badge per row.
export const URGENCY_VARIANT: Record<Urgency, "tone" | "toneSolid"> = {
  high: "toneSolid",
  medium: "tone",
  low: "tone",
};
