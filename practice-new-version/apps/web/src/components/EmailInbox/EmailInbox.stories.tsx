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
        <div className="h-full overflow-hidden rounded-xl bg-panel">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof EmailInbox>;

export default meta;

type Story = StoryObj<typeof meta>;

// Emails come from the seeded inbox query, not the agent's Postgres. Click a row to swap the
// list for the reading pane; "Inbox" at the top goes back.
export const Default: Story = {};
