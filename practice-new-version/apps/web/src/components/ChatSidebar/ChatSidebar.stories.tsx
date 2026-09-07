import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/common";
import { withCopilotRuntime } from "@/stories";
import { ChatSidebar } from ".";

const meta = {
  title: "Chat/ChatSidebar",
  component: ChatSidebar,
  parameters: { layout: "fullscreen" },
  // Registers the enableChatMode/enableAppMode frontend tools, so it needs the runtime.
  decorators: [withCopilotRuntime],
  args: { collapsed: false, onCollapsedChange: () => {}, children: null },
} satisfies Meta<typeof ChatSidebar>;

export default meta;

type Story = StoryObj<typeof meta>;

const ChatPlaceholder = () => (
  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
    The chat panel goes here — see Chat/EmailChat for the real one.
  </div>
);

// Drag the left edge to resize, double-click it to reset.
export const Expanded: Story = {
  render: function ExpandedSidebar() {
    const [collapsed, setCollapsed] = useState(false);

    return (
      <div className="flex h-dvh gap-3 bg-canvas p-3">
        <div className="flex-1 rounded-xl bg-panel p-6 text-sm text-muted-foreground">
          Inbox side
          {collapsed && (
            <Button
              variant="outline"
              className="ml-3"
              onClick={() => setCollapsed(false)}
            >
              Open chat
            </Button>
          )}
        </div>
        <ChatSidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
          <ChatPlaceholder />
        </ChatSidebar>
      </div>
    );
  },
};

export const Collapsed: Story = {
  ...Expanded,
  render: function CollapsedSidebar() {
    const [collapsed, setCollapsed] = useState(true);

    return (
      <div className="flex h-dvh gap-3 bg-canvas p-3">
        <div className="flex-1 rounded-xl bg-panel p-6 text-sm text-muted-foreground">
          Inbox side
          <Button
            variant="outline"
            className="ml-3"
            onClick={() => setCollapsed(false)}
          >
            Open chat
          </Button>
        </div>
        <ChatSidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
          <ChatPlaceholder />
        </ChatSidebar>
      </div>
    );
  },
};
