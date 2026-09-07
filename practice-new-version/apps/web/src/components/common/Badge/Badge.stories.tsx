import type { Meta, StoryObj } from "@storybook/react-vite";
import { TONE } from "@/constants";
import { Badge } from ".";

const meta = {
  title: "Common/Badge",
  component: Badge,
  tags: ["autodocs"],
  args: { children: "Homework" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "tone", "toneSolid"],
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { variant: "default" } };

export const Secondary: Story = { args: { variant: "secondary" } };

export const Outline: Story = { args: { variant: "outline" } };

// The tone variants read `--tone` from a sibling class — see constants/tone.ts.
export const Tone: Story = {
  args: { variant: "tone", className: TONE.violet },
};

export const ToneSolid: Story = {
  args: { variant: "toneSolid", className: TONE.teal },
};

export const EveryTone: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {Object.entries(TONE).map(([name, toneClass]) => (
        <Badge key={name} variant="tone" className={toneClass}>
          {name}
        </Badge>
      ))}
    </div>
  ),
};
