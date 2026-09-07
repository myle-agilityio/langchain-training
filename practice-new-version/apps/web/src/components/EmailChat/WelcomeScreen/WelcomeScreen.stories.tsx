import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button, Input } from "@/components/common";
import { WelcomeScreen } from ".";

const meta = {
  title: "Chat/WelcomeScreen",
  component: WelcomeScreen,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="mx-auto h-dvh w-[420px] min-w-[320px] border-x border-border bg-panel">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof WelcomeScreen>;

export default meta;

type Story = StoryObj<typeof meta>;

// `input` and `suggestionView` come from CopilotChat in the app; stand-ins here so the slot
// layout can be seen without the runtime.
export const Default: Story = {
  args: {
    suggestionView: (
      <div className="flex flex-wrap justify-center gap-2">
        {["Triage my inbox", "Draft a reply to Felix", "What's urgent?"].map(
          (label) => (
            <Button key={label} variant="outline" size="sm">
              {label}
            </Button>
          ),
        )}
      </div>
    ),
    input: <Input placeholder="Ask about the inbox…" className="h-11" />,
  },
};
