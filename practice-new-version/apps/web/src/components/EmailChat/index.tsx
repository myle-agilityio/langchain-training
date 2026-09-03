import { CopilotChat, isAbortError } from "@copilotkit/react-core/v2";
import { reportFailure, toChatError } from "@/lib/errors";
import { useComposeApproval, useOpenAIKey } from "@/stores";
import { KeyRequiredCard } from "@/components/openAIKey";

// Locks the composer while paused on a compose_reply interrupt: answer the card, not the chat.
export const EmailChat = () => {
  const apiKey = useOpenAIKey((s) => s.apiKey);
  const awaitingApproval = useComposeApproval((s) => s.awaitingApproval);
  const locked = awaitingApproval ? { disabled: true as const } : undefined;

  if (!apiKey) {
    return <KeyRequiredCard />;
  }

  return (
    <CopilotChat
      // The agent reports its own failures as chat text; this catches the ones that never got
      // back — a dropped stream otherwise just stops, with nothing said.
      onError={(event) => {
        // The prop also carries the div's DOM onError, so take only CopilotKit's error event.
        if (!("error" in event) || isAbortError(event.error)) {
          return;
        }

        reportFailure(toChatError(event), "chat.stream");
      }}
      attachments={{ enabled: true }}
      messageView={{
        userMessage: { messageRenderer: "userMessageBubble" },
      }}
      input={{
        disclaimer: () => null,
        className: "pb-6",
        textArea: awaitingApproval
          ? {
              disabled: true,
              placeholder: "Approve or reject the draft to continue…",
            }
          : undefined,
        sendButton: locked,
        addMenuButton: locked,
      }}
    />
  );
};
