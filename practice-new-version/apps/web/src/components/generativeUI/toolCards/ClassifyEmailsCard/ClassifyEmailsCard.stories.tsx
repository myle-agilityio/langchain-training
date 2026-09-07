import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  sampleEmails,
  sampleToolError,
  toolFailure,
  toolResult,
} from "@/stories";
import { ClassifyEmailsCard } from ".";

const ids = sampleEmails.slice(0, 3).map((email) => email.id);

const meta = {
  title: "Tool cards/ClassifyEmailsCard",
  component: ClassifyEmailsCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { ids } },
} satisfies Meta<typeof ClassifyEmailsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Classified: Story = {
  args: {
    result: toolResult({
      results: sampleEmails.slice(0, 3).map((email) => ({
        id: email.id,
        ok: true,
        classification: email.classification,
      })),
    }),
  },
};

// One row failed, the rest went through — the card shows both at once.
export const PartialFailure: Story = {
  args: {
    result: toolResult({
      results: [
        {
          id: sampleEmails[0].id,
          ok: true,
          classification: sampleEmails[0].classification,
        },
        { id: sampleEmails[1].id, ok: false, error: sampleToolError },
      ],
    }),
  },
};

export const Running: Story = {
  args: { status: "executing", result: undefined },
};

export const Failed: Story = { args: { result: toolFailure(sampleToolError) } };
