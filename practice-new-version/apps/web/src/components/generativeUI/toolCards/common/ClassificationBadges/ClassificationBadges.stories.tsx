import type { Meta, StoryObj } from "@storybook/react-vite";
import { ClassificationBadges } from ".";

const meta = {
  title: "Tool cards/Common/ClassificationBadges",
  component: ClassificationBadges,
  tags: ["autodocs"],
} satisfies Meta<typeof ClassificationBadges>;

export default meta;

type Story = StoryObj<typeof meta>;

export const HighUrgency: Story = {
  args: {
    classification: {
      topic: "grade_dispute",
      course: "math_12",
      workType: "quiz",
      urgency: "high",
    },
  },
};

export const LowUrgency: Story = {
  args: {
    classification: {
      topic: "submission",
      course: "math_11",
      workType: "homework",
      urgency: "low",
    },
  },
};

// `none` for course/work type drops those badges instead of printing "none".
export const NoCourseOrWorkType: Story = {
  args: {
    classification: {
      topic: "admin",
      course: "none",
      workType: "none",
      urgency: "medium",
    },
  },
};
