import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, MailOpen } from "lucide-react";
import { Button } from "../Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from ".";

const meta = {
  title: "Common/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
} satisfies Meta<typeof DropdownMenu>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">List actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>
          <MailOpen className="h-3.5 w-3.5" />
          Mark all as read
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="h-3.5 w-3.5" />
          Mark all as unread
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

export const WithDisabledItem: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Email actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem>
          <MailOpen className="h-3.5 w-3.5" />
          Mark as read
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Mail className="h-3.5 w-3.5" />
          Mark as unread
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
