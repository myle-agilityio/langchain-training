// One hue per meaning; each entry only sets `--tone`, the treatment is chosen by whatever reads it.
export const TONE = {
  blue: "[--tone:var(--tone-blue)]",
  red: "[--tone:var(--tone-red)]",
  amber: "[--tone:var(--tone-amber)]",
  violet: "[--tone:var(--tone-violet)]",
  teal: "[--tone:var(--tone-teal)]",
  green: "[--tone:var(--tone-green)]",
} as const;

export const FALLBACK_TONE = TONE.violet;
