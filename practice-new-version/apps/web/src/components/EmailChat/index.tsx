import { CopilotChat } from "@copilotkit/react-core/v2";
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
      attachments={{ enabled: true }}
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
