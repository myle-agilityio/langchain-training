import type { Meta, StoryObj } from "@storybook/react-vite";
import { useOpenAIKey } from "@/stores";
import { ChangeKeyButton } from ".";

const meta = {
  title: "OpenAI key/ChangeKeyButton",
  component: ChangeKeyButton,
  tags: ["autodocs"],
  beforeEach: () => {
    useOpenAIKey.setState({ apiKey: "sk-storybook-placeholder" });
  },
} satisfies Meta<typeof ChangeKeyButton>;

export default meta;

type Story = StoryObj<typeof meta>;

// The way back out of a saved-but-invalid key: replace it, or remove it entirely.
export const Default: Story = {};
