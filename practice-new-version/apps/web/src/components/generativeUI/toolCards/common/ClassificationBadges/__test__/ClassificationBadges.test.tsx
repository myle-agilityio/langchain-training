import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Classification } from "@/types";
import { ClassificationBadges } from "..";

const badges = (overrides: Partial<Classification> = {}) =>
  render(
    <ClassificationBadges
      classification={{
        topic: "grade_dispute",
        course: "math_12",
        workType: "quiz",
        urgency: "high",
        ...overrides,
      }}
    />,
  );

describe("ClassificationBadges", () => {
  it("labels topic, grade, work type and urgency", () => {
    badges();

    expect(screen.getByText("Grade dispute")).toBeInTheDocument();
    expect(screen.getByText("Grade 12")).toBeInTheDocument();
    expect(screen.getByText("Quiz")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
  });

  it("leaves out a grade the classifier could not pin down", () => {
    badges({ course: "none" });

    expect(screen.queryByText("Grade 12")).not.toBeInTheDocument();
    expect(screen.getByText("Grade dispute")).toBeInTheDocument();
  });

  it("leaves out a work type set to none", () => {
    badges({ workType: "none" });

    expect(screen.queryByText("Quiz")).not.toBeInTheDocument();
  });
});
