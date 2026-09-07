import type { Meta, StoryObj } from "@storybook/react-vite";
import { useComposeApproval } from "@/stores";
import { ToolReasoning } from ".";

const meta = {
  title: "Chat/ToolReasoning",
  component: ToolReasoning,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    status: {
      control: "inline-radio",
      options: ["inProgress", "executing", "complete"],
    },
  },
  beforeEach: () => {
    useComposeApproval.setState({ awaitingApproval: false });
  },
} satisfies Meta<typeof ToolReasoning>;

export default meta;

type Story = StoryObj<typeof meta>;

// The fallback renderer for any tool without a card of its own.
export const Executing: Story = {
  args: {
    name: "classify_emails",
    status: "executing",
    args: { ids: ["1d4ff3e7", "d01cce28"], force: false },
  },
};

export const Complete: Story = {
  args: {
    name: "search_knowledge_base",
    status: "complete",
    args: { query: "late work policy" },
  },
};

export const NoArguments: Story = {
  args: { name: "get_inbox_summary", status: "complete" },
};

// Paused on the compose_reply interrupt: the spinner becomes the blinking dot — nothing is
// running, the draft is waiting on the teacher.
export const AwaitingApproval: Story = {
  args: {
    name: "compose_reply",
    status: "executing",
    args: { id: "1d4ff3e7" },
  },
  beforeEach: () => {
    useComposeApproval.setState({ awaitingApproval: true });
  },
};
