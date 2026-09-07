import type { Meta, StoryObj } from "@storybook/react-vite";
import { useOpenAIKey } from "@/stores";
import { KeyRequiredCard } from ".";

const meta = {
  title: "OpenAI key/KeyRequiredCard",
  component: KeyRequiredCard,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-dvh bg-panel">
        <Story />
      </div>
    ),
  ],
  beforeEach: () => {
    useOpenAIKey.setState({ apiKey: null });
  },
} satisfies Meta<typeof KeyRequiredCard>;

export default meta;

type Story = StoryObj<typeof meta>;

// What stands in for the chat panel until a key is saved.
export const Default: Story = {};
