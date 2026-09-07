import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleEmail } from "@/stories";
import { ComposeForm } from ".";

const meta = {
  title: "Inbox/ComposeForm",
  component: ComposeForm,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[560px]">
        <Story />
      </div>
    ),
  ],
  args: {
    initialSubject: `Re: ${sampleEmail.subject}`,
    onSend: () => {},
    onCancel: () => {},
  },
} satisfies Meta<typeof ComposeForm>;

export default meta;

type Story = StoryObj<typeof meta>;

// Send stays disabled until both the subject and the body have content.
export const Default: Story = {};

export const NoSubject: Story = { args: { initialSubject: "" } };
