import { useState } from "react";
import type { Decorator } from "@storybook/react-vite";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import {
  CopilotKit,
  CopilotChatConfigurationProvider,
} from "@copilotkit/react-core/v2";
import { StoryProviders } from "./StoryProviders";
import { RuntimeBoundary } from "./RuntimeBoundary";

// Gives a story a visible edge on the flat canvas. Fullscreen stories bring their own frame
// (a sidebar, a panel, the whole screen), so they are left alone.
export const withStoryFrame: Decorator = (Story, context) => {
  if (context.parameters.layout === "fullscreen") {
    return <Story />;
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <Story />
    </div>
  );
};

// Applied to every story from .storybook/preview.tsx.
export const withProviders: Decorator = (Story) => (
  <StoryProviders>
    <Story />
  </StoryProviders>
);

// Writes into the story's own query client before the first render, so a component that reads
// server state renders a chosen state instead of firing a request.
export const withQueryData = (seed: (client: QueryClient) => void): Decorator =>
  function WithQueryData(Story) {
    const client = useQueryClient();

    // Seeded during the first render, before the component below asks for the data.
    useState(() => seed(client));

    return <Story />;
  };

// Only for the components that call CopilotKit hooks — see RuntimeBoundary.
export const withCopilotRuntime: Decorator = (Story) => (
  <RuntimeBoundary>
    <CopilotKit runtimeUrl="/api/copilotkit" useSingleEndpoint={false}>
      <CopilotChatConfigurationProvider agentId="default">
        <Story />
      </CopilotChatConfigurationProvider>
    </CopilotKit>
  </RuntimeBoundary>
);
