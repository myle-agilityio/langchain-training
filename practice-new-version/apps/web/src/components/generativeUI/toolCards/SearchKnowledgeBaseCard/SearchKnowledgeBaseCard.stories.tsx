import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  sampleArticles,
  sampleToolError,
  toolFailure,
  toolResult,
} from "@/stories";
import { SearchKnowledgeBaseCard } from ".";

const meta = {
  title: "Tool cards/SearchKnowledgeBaseCard",
  component: SearchKnowledgeBaseCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  args: { status: "complete", parameters: { query: "late work policy" } },
} satisfies Meta<typeof SearchKnowledgeBaseCard>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithHits: Story = {
  args: { result: toolResult({ articles: sampleArticles }) },
};

export const NoHits: Story = { args: { result: toolResult({ articles: [] }) } };

export const Running: Story = { args: { status: "executing" } };

export const Failed: Story = { args: { result: toolFailure(sampleToolError) } };
