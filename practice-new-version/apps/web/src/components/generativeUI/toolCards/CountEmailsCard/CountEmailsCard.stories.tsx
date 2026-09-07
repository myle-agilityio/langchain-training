import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleToolError, toolFailure, toolResult } from "@/stories";
import { CountEmailsCard } from ".";

const meta = {
  title: "Tool cards/CountEmailsCard",
  component: CountEmailsCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: {} },
} satisfies Meta<typeof CountEmailsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TotalOnly: Story = { args: { result: toolResult({ total: 24 }) } };

// Grouped counts get a bar each, sorted by size.
export const GroupedByStatus: Story = {
  args: {
    parameters: { groupBy: "status" },
    result: toolResult({
      total: 24,
      byGroup: { unread: 11, read: 8, replied: 4, flagged_for_followup: 1 },
    }),
  },
};

export const GroupedByTopicWithFilter: Story = {
  args: {
    parameters: { groupBy: "topic", filter: { status: "unread" } },
    result: toolResult({
      total: 11,
      byGroup: {
        question: 5,
        submission: 3,
        grade_dispute: 2,
        unclassified: 1,
      },
    }),
  },
};

export const Running: Story = { args: { status: "executing" } };

export const Failed: Story = { args: { result: toolFailure(sampleToolError) } };
