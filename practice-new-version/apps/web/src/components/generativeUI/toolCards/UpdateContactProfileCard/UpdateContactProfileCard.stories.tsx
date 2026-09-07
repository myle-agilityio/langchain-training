import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleToolError, toolFailure, toolResult } from "@/stories";
import { UpdateContactProfileCard } from ".";

const meta = {
  title: "Tool cards/UpdateContactProfileCard",
  component: UpdateContactProfileCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { sender: "Angelina Connelly" } },
} satisfies Meta<typeof UpdateContactProfileCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Saved: Story = {
  args: {
    result: toolResult({
      profile: {
        name: "Angelina Connelly",
        tone: "formal",
        facts: [
          "Period 3, Math 12",
          "Asks about grading criteria often",
          "Prefers a written explanation over a meeting",
        ],
      },
    }),
  },
};

// Nothing but a name saved yet — no tone, no facts.
export const NameOnly: Story = {
  args: {
    result: toolResult({
      profile: { name: "Felix Gislason", tone: null, facts: [] },
    }),
  },
};

export const Running: Story = { args: { status: "executing" } };

export const Failed: Story = { args: { result: toolFailure(sampleToolError) } };
