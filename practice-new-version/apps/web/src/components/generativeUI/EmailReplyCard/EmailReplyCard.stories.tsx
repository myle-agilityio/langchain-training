import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleEmail } from "@/stories";
import { EmailReplyCard } from ".";

const draft = {
  id: sampleEmail.id,
  subject: `Re: ${sampleEmail.subject}`,
  body: "Hi Angelina,\n\nThanks for flagging this — implicit differentiation is a valid route here, so bring the quiz to Period 3 tomorrow and I will re-check question 4 with you.\n\nMs. Lam",
};

const meta = {
  title: "Generative UI/EmailReplyCard",
  component: EmailReplyCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[28rem]">
        <Story />
      </div>
    ),
  ],
  args: { status: "executing", ...draft, respond: () => {} },
  argTypes: {
    status: {
      control: "inline-radio",
      options: ["inProgress", "executing", "complete"],
    },
  },
} satisfies Meta<typeof EmailReplyCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// The approval interrupt: editable, and Approve marks the email replied through the inbox.
export const AwaitingApproval: Story = {};

// Args arrive empty on the first render, before the compose pipeline has anything to show.
export const Drafting: Story = {
  args: { status: "inProgress", subject: "", body: "" },
};

export const ComplianceFlagged: Story = {
  args: {
    compliance: {
      compliant: false,
      violations: [
        "Names another student in the reply",
        "Promises a grade change before reviewing the work",
      ],
    },
  },
};

// Answered already — the card is read-only until the run moves on.
export const Sent: Story = { args: { status: "complete" } };
