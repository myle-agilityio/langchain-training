import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import { Popover, PopoverContent, PopoverTrigger } from ".";

const meta = {
  title: "Common/Popover",
  component: Popover,
  tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Filter inbox</Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72">
        <p className="text-sm text-muted-foreground">
          Anchored content — the same panel FilterPopover uses for its form.
        </p>
      </PopoverContent>
    </Popover>
  ),
};
