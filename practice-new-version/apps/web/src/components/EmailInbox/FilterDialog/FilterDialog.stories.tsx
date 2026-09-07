import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "@/components/common";
import { EMPTY_FILTERS, hasActiveFilters, type EmailFilters } from "@/utils";
import { FilterDialog } from ".";

const meta = {
  title: "Inbox/FilterDialog",
  component: FilterDialog,
  tags: ["autodocs"],
  args: {
    open: true,
    onOpenChange: () => {},
    filters: EMPTY_FILTERS,
    onApply: () => {},
  },
} satisfies Meta<typeof FilterDialog>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithActiveFilters: Story = {
  args: {
    filters: {
      status: "unread",
      urgency: "high",
      course: "math_12",
      from: "connelly",
    },
  },
};

// Apply/Clear write back to the parent, and the draft resets on each reopen.
export const Interactive: Story = {
  render: function InteractiveDialog() {
    const [open, setOpen] = useState(false);
    const [filters, setFilters] = useState<EmailFilters>(EMPTY_FILTERS);

    return (
      <div className="flex flex-col items-center gap-3">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Filter inbox
        </Button>
        {hasActiveFilters(filters) && (
          <p className="text-xs text-muted-foreground">
            Applied:{" "}
            {Object.entries(filters)
              .map(([key, value]) => `${key}=${value}`)
              .join(", ")}
          </p>
        )}
        <FilterDialog
          open={open}
          onOpenChange={setOpen}
          filters={filters}
          onApply={setFilters}
        />
      </div>
    );
  },
};
