import type { Meta, StoryObj } from "@storybook/react-vite";
import { threadsQueryKey } from "@/hooks";
import { sampleThreads, withCopilotRuntime, withQueryData } from "@/stories";
import { ThreadsSidebar } from ".";

const meta = {
  title: "Chat/ThreadsSidebar",
  component: ThreadsSidebar,
  parameters: { layout: "fullscreen" },
  // Reads the active thread from CopilotKit's chat configuration — renders nothing without it.
  decorators: [
    withCopilotRuntime,
    withQueryData((client) =>
      client.setQueryData(threadsQueryKey, {
        pageParams: [0],
        pages: [{ threads: sampleThreads, hasNext: false }],
      }),
    ),
    (Story) => (
      <div className="h-dvh bg-canvas p-3">
        <div className="flex h-full overflow-hidden rounded-xl bg-panel">
          <Story />
          <div className="flex-1 p-6 text-sm text-muted-foreground">
            The chat goes here — see Chat/ChatPanel for the whole pane.
          </div>
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof ThreadsSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

// Below `md` the sidebar hides itself and the ThreadsMenu button takes over — narrow the
// viewport to see that.
export const Default: Story = {};
