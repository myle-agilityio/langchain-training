import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  sampleEmails,
  sampleToolError,
  toolFailure,
  toolResult,
} from "@/stories";
import { UpdateEmailStatusCard } from ".";

const patches = [
  { id: sampleEmails[0].id, status: "read" as const },
  { id: sampleEmails[1].id, status: "flagged_for_followup" as const },
];

const meta = {
  title: "Tool cards/UpdateEmailStatusCard",
  component: UpdateEmailStatusCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { patches } },
} satisfies Meta<typeof UpdateEmailStatusCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Updated: Story = {
  args: {
    result: toolResult({
      results: patches.map((patch) => ({ ...patch, ok: true })),
    }),
  },
};

// A transition the inbox refuses: replied cannot go back to unread.
export const PartialFailure: Story = {
  args: {
    result: toolResult({
      results: [
        { id: patches[0].id, ok: true, status: "read" },
        {
          id: sampleEmails[4].id,
          ok: false,
          error: {
            code: "STATUS_TRANSITION_INVALID",
            message: "replied -> unread",
          },
        },
      ],
    }),
  },
};

export const Running: Story = { args: { status: "executing" } };

export const Failed: Story = { args: { result: toolFailure(sampleToolError) } };
