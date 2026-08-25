import type { WorkType } from "@/types";

// Colourless (outline badge): a filter facet, not a triage signal.
export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  practice: "Practice",
  exercise: "Exercise",
  homework: "Homework",
  quiz: "Quiz",
  test: "Test",
  project: "Project",
  none: "",
};
