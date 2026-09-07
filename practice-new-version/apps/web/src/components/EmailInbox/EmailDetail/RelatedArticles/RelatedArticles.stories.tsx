import type { Meta, StoryObj } from "@storybook/react-vite";
import { sampleArticles, withQueryData } from "@/stories";
import { RelatedArticles } from ".";

const QUERY = "Question about #4 on the related rates quiz";

const meta = {
  title: "Inbox/RelatedArticles",
  component: RelatedArticles,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-[560px]">
        <Story />
      </div>
    ),
  ],
  args: { query: QUERY },
} satisfies Meta<typeof RelatedArticles>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithArticles: Story = {
  decorators: [
    withQueryData((client) =>
      client.setQueryData(["knowledge", QUERY], sampleArticles),
    ),
  ],
};

export const NoArticles: Story = {
  decorators: [
    withQueryData((client) => client.setQueryData(["knowledge", QUERY], [])),
  ],
};

// Nothing seeded and no key saved, so the lookup never runs — same empty line the app shows.
export const NotSearched: Story = { args: { query: "" } };
