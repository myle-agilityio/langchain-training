import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from ".";

const meta = {
  title: "Common/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FromTrigger: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open dialog</Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Change your OpenAI API key</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Everything in the app that calls OpenAI runs on this key.
        </p>
      </DialogContent>
    </Dialog>
  ),
};

// Controlled, the way FilterDialog is driven from the inbox header.
export const Controlled: Story = {
  render: function ControlledDialog() {
    const [open, setOpen] = useState(true);

    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Reopen
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Filter inbox</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Open state lives in the parent.
            </p>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};
