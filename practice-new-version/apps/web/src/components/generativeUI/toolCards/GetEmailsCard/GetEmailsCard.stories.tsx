import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  sampleEmails,
  sampleToolError,
  toolFailure,
  toolResult,
} from "@/stories";
import { GetEmailsCard } from ".";

// The tool returns redacted rows — sender name and subject, never the body.
const redacted = sampleEmails.map(
  ({ id, from, subject, status, classification }) => ({
    id,
    from: { name: from.name },
    subject,
    status,
    classification,
  }),
);

const meta = {
  title: "Tool cards/GetEmailsCard",
  component: GetEmailsCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { filter: { status: "unread" } } },
} satisfies Meta<typeof GetEmailsCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithResults: Story = {
  args: { result: toolResult({ emails: redacted.slice(0, 3), count: 3 }) },
};

// More rows than the card shows — the rest collapse into a "+N more" line.
export const Truncated: Story = {
  args: { result: toolResult({ emails: redacted, count: redacted.length }) },
};

export const NoMatches: Story = {
  args: { result: toolResult({ emails: [], count: 0 }) },
};

export const Running: Story = { args: { status: "executing" } };

export const Failed: Story = { args: { result: toolFailure(sampleToolError) } };
