import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleToolError, toolFailure, toolResult } from "@/stories";
import { GenericToolCard } from ".";

const meta = {
  title: "Tool cards/GenericToolCard",
  component: GenericToolCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: {
    name: "toggleTheme",
    status: "complete",
    parameters: { sender: "Flo", ids: ["a", "b", "c"], limit: 20 },
  },
} satisfies Meta<typeof GenericToolCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Running: Story = { args: { status: "executing" } };

export const Done: Story = { args: { result: toolResult({ ok: true }) } };

export const NoArguments: Story = {
  args: { parameters: undefined, result: toolResult({ ok: true }) },
};

export const Failed: Story = {
  args: { result: toolFailure(sampleToolError) },
};
