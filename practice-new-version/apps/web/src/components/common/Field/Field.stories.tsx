import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, Input, Select, Textarea } from ".";

const meta = {
  title: "Common/Field",
  component: Field,
  tags: ["autodocs"],
} satisfies Meta<typeof Field>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  args: {
    label: "Subject contains",
    children: <Input placeholder="Subject text" />,
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export const Dropdown: Story = {
  args: {
    label: "Urgency",
    children: (
      <Select defaultValue="">
        <option value="">Any</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </Select>
    ),
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export const MultilineInput: Story = {
  args: {
    label: "Reply body",
    children: <Textarea rows={5} placeholder="Write your reply…" />,
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

// The whole control set at once — one look across text, date, select and textarea.
export const EveryControl: Story = {
  args: { label: "From", children: <Input placeholder="Name or email" /> },
  render: () => (
    <div className="flex w-96 flex-col gap-3">
      <Field label="From">
        <Input placeholder="Name or email" />
      </Field>
      <Field label="Received after">
        <Input type="date" />
      </Field>
      <Field label="Status">
        <Select defaultValue="unread">
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </Select>
      </Field>
      <Field label="Has the words">
        <Textarea rows={3} placeholder="Search the email body" />
      </Field>
      <Field label="Disabled">
        <Input disabled value="Locked while a run is in flight" readOnly />
      </Field>
    </div>
  ),
};
