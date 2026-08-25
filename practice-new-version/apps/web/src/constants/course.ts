import type { Course } from "@/types";

// Colourless (outline badge): a filter facet, not a triage signal.
export const COURSE_LABEL: Record<Course, string> = {
  math_11: "Grade 11",
  math_12: "Grade 12",
  none: "",
};
