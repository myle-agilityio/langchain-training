import type { Meta, StoryObj } from "@storybook/react-vite";
import { withCopilotRuntime } from "@/stories";
import { EmailInbox } from ".";

const meta = {
  title: "Inbox/EmailInbox",
  component: EmailInbox,
  parameters: { layout: "fullscreen" },
  // Publishes the open email as agent context and registers filterInbox/showEmail, so the
  // whole screen needs the runtime — the list and detail pane below don't.
  decorators: [
    withCopilotRuntime,
    (Story) => (
      <div className="h-dvh bg-canvas p-3">
        <Story />
      </div>
    ),
  ],
  args: { chatCollapsed: false, onOpenChat: () => {} },
} satisfies Meta<typeof EmailInbox>;

export default meta;

type Story = StoryObj<typeof meta>;

// Emails come from the seeded inbox query, not the agent's Postgres.
export const Default: Story = {};

export const ChatCollapsed: Story = { args: { chatCollapsed: true } };
