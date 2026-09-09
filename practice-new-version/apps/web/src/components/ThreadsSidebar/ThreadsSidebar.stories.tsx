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
        <div className="@container flex h-full overflow-hidden rounded-xl bg-panel">
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

// The sidebar only opens once its `@container` parent is at least 1400px wide — resize the
// viewport (this story renders fullscreen) to see it collapse.
export const Default: Story = {};
