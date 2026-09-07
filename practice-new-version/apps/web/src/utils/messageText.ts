// Loose shape instead of importing Message from @ag-ui/client directly — that package is only a
// transitive dependency here, not one of ours to import from.
export interface AgentMessage {
  role?: string;
  content?: unknown;
}

// AG-UI message content is either a plain string or an array of parts (text/image, for
// attachments) — pull the first text part out of either shape.
export const messageText = (message: AgentMessage): string | undefined => {
  const { content } = message;

  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const textPart = content.find(
      (part) =>
        typeof part === "object" &&
        part !== null &&
        (part as { type?: unknown }).type === "text",
    ) as { text?: string } | undefined;

    return textPart?.text;
  }

  return undefined;
};
