import type { Meta, StoryObj } from "@storybook/react-vite";
import { threadsQueryKey } from "@/hooks";
import { sampleThreads, withCopilotRuntime, withQueryData } from "@/stories";
import { ThreadsList } from ".";

const meta = {
  title: "Chat/ThreadsList",
  component: ThreadsList,
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
      <div className="h-96 w-72">
        <Story />
      </div>
    ),
  ],
  args: { className: "h-full" },
} satisfies Meta<typeof ThreadsList>;

export default meta;

type Story = StoryObj<typeof meta>;

// The list rendered inside the ThreadsSidebar.
export const Default: Story = {};

export const Empty: Story = {
  decorators: [
    withQueryData((client) =>
      client.setQueryData(threadsQueryKey, {
        pageParams: [0],
        pages: [{ threads: [], hasNext: false }],
      }),
    ),
  ],
};

// ThreadsSidebar passes this once forced open below @min-[1400px] — the collapse button sits
// beside "New chat" instead of hunting for a control elsewhere.
export const WithCollapseButton: Story = {
  args: { onCollapse: () => {} },
};
