import type { Meta, StoryObj } from "@storybook/react-vite";
import { ERROR_CODE } from "@/types";
import { ToolFailure } from ".";

const meta = {
  title: "Tool cards/Common/ToolFailure",
  component: ToolFailure,
  tags: ["autodocs"],
} satisfies Meta<typeof ToolFailure>;

export default meta;

type Story = StoryObj<typeof meta>;

// Wording comes from the code, never from the agent's own message.
export const KnownCode: Story = {
  args: {
    error: { code: ERROR_CODE.EMAIL_NOT_FOUND, message: "no row for that id" },
  },
};

export const UnknownCode: Story = {
  args: { error: { code: "SOMETHING_NEW", message: "raw server wording" } },
};
