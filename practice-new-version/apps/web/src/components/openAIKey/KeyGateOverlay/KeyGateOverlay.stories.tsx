import type { Meta, StoryObj } from "@storybook/react-vite";
import { useOpenAIKey } from "@/stores";
import { KeyGateOverlay } from ".";

const meta = {
  title: "OpenAI key/KeyGateOverlay",
  component: KeyGateOverlay,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-dvh bg-canvas">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    useOpenAIKey.setState({ apiKey: null });
  },
} satisfies Meta<typeof KeyGateOverlay>;

export default meta;

type Story = StoryObj<typeof meta>;

// What blocks the whole app until a key is saved.
export const Default: Story = {};
