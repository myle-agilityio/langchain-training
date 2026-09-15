import type { Meta, StoryObj } from "@storybook/react-vite";
import { REPLY_DECISION } from "@repo/constants";
import { ReplyToEmailCard } from ".";

const meta = {
  title: "Tool cards/ReplyToEmailCard",
  component: ReplyToEmailCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { id: "e1" } },
} satisfies Meta<typeof ReplyToEmailCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Drafting: Story = { args: { status: "executing" } };

export const Approved: Story = {
  args: {
    result: `The teacher ${REPLY_DECISION.APPROVED} this draft and it has been sent.`,
  },
};

export const Rejected: Story = {
  args: {
    result: `The teacher ${REPLY_DECISION.REJECTED} this draft and nothing was sent.`,
  },
};

export const SendFailed: Story = {
  args: {
    result: `The teacher said yes to sending this draft, but ${REPLY_DECISION.SEND_FAILED} due to a server error.`,
  },
};

// e.g. composeEmailErrorHandler's backstop text after a crash mid-approval — matches none of
// the known phrasings, so it renders as a generic error rather than a false "reviewed".
export const AgentError: Story = { args: { status: "complete" } };
