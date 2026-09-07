import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Email } from "@/types";
import {
  repliedEmail,
  sampleArticles,
  sampleEmail,
  unclassifiedEmail,
  withQueryData,
} from "@/stories";
import { EmailDetail } from ".";

// RelatedArticles asks for `subject\nbody` — seeding that key keeps the pane offline.
const seedKnowledge = (email: Email) =>
  withQueryData((client) =>
    client.setQueryData(
      ["knowledge", `${email.subject}\n${email.body}`],
      sampleArticles,
    ),
  );

const meta = {
  title: "Inbox/EmailDetail",
  component: EmailDetail,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-dvh overflow-y-auto bg-panel">
        <Story />
      </div>
    ),
  ],
  args: {
    email: sampleEmail,
    isLoading: false,
    onSendReply: () => {},
    onAskAgent: () => {},
    isAgentBusy: false,
    isDrafting: false,
  },
} satisfies Meta<typeof EmailDetail>;

export default meta;

type Story = StoryObj<typeof meta>;

// "Compose reply" opens the manual form; "Ask AI to draft" is the agent path.
export const Classified: Story = { decorators: [seedKnowledge(sampleEmail)] };

export const Unclassified: Story = {
  args: { email: unclassifiedEmail },
  decorators: [seedKnowledge(unclassifiedEmail)],
};

export const AlreadyReplied: Story = {
  args: { email: repliedEmail },
  decorators: [seedKnowledge(repliedEmail)],
};

export const Drafting: Story = {
  args: { isAgentBusy: true, isDrafting: true },
  decorators: [seedKnowledge(sampleEmail)],
};

// Busy with something else — the draft button goes flat, not "Drafting…".
export const AgentBusy: Story = {
  args: { isAgentBusy: true },
  decorators: [seedKnowledge(sampleEmail)],
};

export const NothingSelected: Story = { args: { email: null } };

export const LoadingInbox: Story = { args: { email: null, isLoading: true } };
