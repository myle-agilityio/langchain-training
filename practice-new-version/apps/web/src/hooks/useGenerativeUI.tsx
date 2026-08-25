import { z } from "zod";
import { useTheme } from "@/stores/useTheme";

import {
  useFrontendTool,
  useDefaultRenderTool,
} from "@copilotkit/react-core/v2";

import { ToolReasoning } from "@/components/ToolRendering";
import { useToolRenderers } from "@/hooks/useToolRenderers";

export const useGenerativeUIExamples = () => {
  const setTheme = useTheme((s) => s.setTheme);

  // Named per-tool cards; they take precedence over the wildcard renderer below.
  useToolRenderers();

  // Renders every backend tool call as a collapsible card in the chat, so the teacher can see
  // which inbox tools ran and with what arguments.
  const ignoredTools = [
    "render_a2ui", // Rendered by A2UI streaming, not as a tool card
    "generate_a2ui", // Legacy: rendered by A2UI, not as a tool card
    "log_a2ui_event", // Internal A2UI event tracker
    "compose_reply", // Rendered as the approval card by useEmailAgent
  ];

  useDefaultRenderTool({
    render: ({ name, status, parameters }) => {
      if (ignoredTools.includes(name)) {
        return <></>;
      }

      return <ToolReasoning name={name} status={status} args={parameters} />;
    },
  });

  useFrontendTool(
    {
      name: "toggleTheme",
      description: "Frontend tool for toggling the theme of the app.",
      parameters: z.object({}),
      handler: async () => {
        const isDark = document.documentElement.classList.contains("dark");

        setTheme(isDark ? "light" : "dark");
      },
    },
    [setTheme],
  );
};
