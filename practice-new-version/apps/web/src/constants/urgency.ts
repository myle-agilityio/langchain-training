import type { Urgency } from "@/types";

import { TONE } from "./tone";

export const URGENCY_LABEL: Record<Urgency, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

// Blue for medium, not amber — amber sits too close to high's red at flag-icon size.
export const URGENCY_TONE: Record<Urgency, string> = {
  high: TONE.red,
  medium: TONE.blue,
  low: TONE.teal,
};

// Only `high` gets the solid fill, keeping at most one loud badge per row.
export const URGENCY_VARIANT: Record<Urgency, "tone" | "toneSolid"> = {
  high: "toneSolid",
  medium: "tone",
  low: "tone",
};
