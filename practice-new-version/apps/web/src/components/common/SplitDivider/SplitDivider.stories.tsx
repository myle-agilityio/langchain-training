import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { SplitDivider } from ".";

const meta = {
  title: "Common/SplitDivider",
  component: SplitDivider,
  parameters: { layout: "fullscreen" },
  args: { onDrag: () => {} },
} satisfies Meta<typeof SplitDivider>;

export default meta;

type Story = StoryObj<typeof meta>;

// Drag the handle to see it report movement back into a ratio, the way Inbox/index.tsx does.
const SplitDividerDemo = () => {
  const [ratio, setRatio] = useState(0.5);

  return (
    <div className="flex h-dvh w-full bg-canvas p-3">
      <div
        className="flex h-full flex-1 items-center justify-center rounded-xl bg-panel text-sm text-muted-foreground"
        style={{ flexBasis: `${ratio * 100}%` }}
      >
        Chat
      </div>
      <SplitDivider
        onDrag={(deltaX) =>
          setRatio((current) =>
            Math.min(
              0.75,
              Math.max(0.25, current + deltaX / window.innerWidth),
            ),
          )
        }
      />
      <div
        className="flex h-full flex-1 items-center justify-center rounded-xl bg-panel text-sm text-muted-foreground"
        style={{ flexBasis: `${(1 - ratio) * 100}%` }}
      >
        App
      </div>
    </div>
  );
};

export const Default: Story = {
  render: () => <SplitDividerDemo />,
};
