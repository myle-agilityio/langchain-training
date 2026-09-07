import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/common";
import { toast, useToast } from "@/stores";
import { Toaster } from ".";

const meta = {
  title: "Common/Toast/Toaster",
  component: Toaster,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
} satisfies Meta<typeof Toaster>;

export default meta;

type Story = StoryObj<typeof meta>;

// The real stack: pushed through the store, capped at 3, auto-dismissed after 6s.
export const Interactive: Story = {
  render: function InteractiveToaster() {
    const [n, setN] = useState(0);

    return (
      <div className="h-dvh p-6">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              toast.error(`Something went wrong (${n}).`);
              setN((count) => count + 1);
            }}
          >
            Push an error
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              toast.info(`Inbox refreshed (${n}).`);
              setN((count) => count + 1);
            }}
          >
            Push an info
          </Button>
          <Button
            variant="ghost"
            onClick={() => useToast.setState({ toasts: [] })}
          >
            Clear
          </Button>
        </div>
        <Toaster />
      </div>
    );
  },
};
