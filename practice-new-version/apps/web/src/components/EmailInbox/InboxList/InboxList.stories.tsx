import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { Email } from "@/types";
import { sampleEmails } from "@/stories";
import { InboxList } from ".";

const noop = () => {};

const meta = {
  title: "Inbox/InboxList",
  component: InboxList,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-dvh w-[360px] overflow-y-auto bg-panel">
        <Story />
      </div>
    ),
  ],
  args: {
    emails: sampleEmails,
    totalCount: sampleEmails.length,
    isLoading: false,
    isFiltered: false,
    isRefreshing: false,
    onRefresh: noop,
    onMarkAllRead: noop,
    onMarkAllUnread: noop,
    selectedId: null,
    onSelect: noop,
    onToggleRead: noop,
    hasMore: false,
    isLoadingMore: false,
    onLoadMore: noop,
  },
} satisfies Meta<typeof InboxList>;

export default meta;

type Story = StoryObj<typeof meta>;

// Click a row: selection, the header's mark-all buttons and the per-row menu are all wired here.
export const Default: Story = {
  render: function SelectableList(args) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [emails, setEmails] = useState<Email[]>(args.emails);

    const toggleRead = (email: Email) =>
      setEmails((rows) =>
        rows.map((row) =>
          row.id === email.id
            ? { ...row, status: row.status === "unread" ? "read" : "unread" }
            : row,
        ),
      );

    return (
      <InboxList
        {...args}
        emails={emails}
        selectedId={selectedId}
        onSelect={(email) => setSelectedId(email.id)}
        onToggleRead={toggleRead}
        onMarkAllRead={() =>
          setEmails((rows) =>
            rows.map((row) =>
              row.status === "unread" ? { ...row, status: "read" } : row,
            ),
          )
        }
        onMarkAllUnread={() =>
          setEmails((rows) =>
            rows.map((row) =>
              row.status === "read" ? { ...row, status: "unread" } : row,
            ),
          )
        }
      />
    );
  },
};

export const Selected: Story = {
  args: { selectedId: sampleEmails[1].id },
};

export const Loading: Story = { args: { isLoading: true, emails: [] } };

export const Refreshing: Story = { args: { isRefreshing: true } };

export const Empty: Story = { args: { emails: [], totalCount: 0 } };

export const Filtered: Story = {
  args: {
    emails: sampleEmails.slice(0, 2),
    totalCount: sampleEmails.length,
    isFiltered: true,
  },
};

export const LoadingMore: Story = {
  args: { hasMore: true, isLoadingMore: true },
};

// Nothing classified yet: the rail falls back to the brand lilac.
export const Unclassified: Story = {
  args: {
    emails: sampleEmails.map(
      ({ classification: _classification, ...email }) => email,
    ),
  },
};
