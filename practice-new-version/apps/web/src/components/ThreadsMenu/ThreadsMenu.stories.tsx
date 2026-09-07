import type { Meta, StoryObj } from "@storybook/react-vite";
import { threadsQueryKey } from "@/hooks";
import { sampleThreads, withCopilotRuntime, withQueryData } from "@/stories";
import { ThreadsMenu } from ".";

const meta = {
  title: "Chat/ThreadsMenu",
  component: ThreadsMenu,
  tags: ["autodocs"],
  // Reads the active thread from CopilotKit's chat configuration — renders nothing without it.
  decorators: [
    withCopilotRuntime,
    withQueryData((client) =>
      client.setQueryData(threadsQueryKey, {
        pageParams: [0],
        pages: [{ threads: sampleThreads, hasNext: false }],
      }),
    ),
  ],
} satisfies Meta<typeof ThreadsMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

// Open the clock button: search, rename and delete all act on the seeded list.
export const WithConversations: Story = {};

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
