import type { Meta, StoryObj } from "@storybook/react-vite";
import { useOpenAIKey } from "@/stores";
import { KeyForm } from ".";

const meta = {
  title: "OpenAI key/KeyForm",
  component: KeyForm,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
  args: { submitLabel: "Save key" },
  beforeEach: () => {
    useOpenAIKey.setState({ apiKey: null });
  },
} satisfies Meta<typeof KeyForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// Submitting anything that does not start with sk- shows the inline error.
export const Default: Story = {};

export const FirstRunLabel: Story = {
  args: { submitLabel: "Save and start chatting" },
};
