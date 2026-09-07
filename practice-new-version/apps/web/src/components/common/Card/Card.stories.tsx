import type { Meta, StoryObj } from "@storybook/react-vite";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from ".";

const meta = {
  title: "Common/Card",
  component: Card,
  tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Related knowledge</CardTitle>
        <CardDescription>
          Articles the assistant found for the open email.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">
        Late work loses 10% per calendar day, to a maximum of 30%.
      </CardContent>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card className="w-80">
      <CardContent className="p-6 text-sm">
        A card with no header — the shape the reply card uses.
      </CardContent>
    </Card>
  ),
};
