import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EMPTY_FILTERS, type EmailFilters } from "@/utils";
import { InboxSearchBar } from ".";

const meta = {
  title: "Inbox/InboxSearchBar",
  component: InboxSearchBar,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-dvh bg-canvas p-3">
        <div className="max-w-md">
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    search: "",
    onSearchChange: () => {},
    filters: EMPTY_FILTERS,
    onApplyFilters: () => {},
  },
} satisfies Meta<typeof InboxSearchBar>;

export default meta;

type Story = StoryObj<typeof meta>;

// Click the sliders icon: the panel spans the bar's own width, not just the icon's corner.
export const Default: Story = {
  render: function InboxSearchBarDemo() {
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState<EmailFilters>(EMPTY_FILTERS);

    return (
      <InboxSearchBar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onApplyFilters={setFilters}
      />
    );
  },
};

// Applied filters come back as pills inline with the typed text — the X clears just those,
// leaving the typed search alone.
export const WithActiveFilters: Story = {
  render: function InboxSearchBarDemo() {
    const [search, setSearch] = useState("quiz");
    const [filters, setFilters] = useState<EmailFilters>({
      status: "unread",
      urgency: "high",
      search: "quiz",
    });

    return (
      <InboxSearchBar
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onApplyFilters={setFilters}
      />
    );
  },
};

export const Disabled: Story = { args: { disabled: true } };
