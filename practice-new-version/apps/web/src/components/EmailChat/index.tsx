import { useRef } from "react";
import {
  CopilotChat,
  isAbortError,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { reportFailure, toChatError } from "@/lib/errors";
import { useComposeApproval, useOpenAIKey } from "@/stores";
import { KeyRequiredCard } from "@/components/openAIKey";
import { WelcomeScreen } from "./WelcomeScreen";

// Locks the composer while paused on a compose_reply interrupt: answer the card, not the chat.
export const EmailChat = () => {
  const apiKey = useOpenAIKey((s) => s.apiKey);
  const awaitingApproval = useComposeApproval((s) => s.awaitingApproval);
  const locked = awaitingApproval ? { disabled: true as const } : undefined;
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent();

  // Clicking stop can still surface as a normal run error, not an AbortError — this flag
  // marks "we just stopped it ourselves" so that error gets ignored instead of toasted.
  const userStoppedRef = useRef(false);

  if (!apiKey) {
    return <KeyRequiredCard />;
  }

  return (
    <CopilotChat
      // The agent reports its own failures as chat text; this catches the ones that never got
      // back — a dropped stream otherwise just stops, with nothing said.
      onError={(event) => {
        // The prop also carries the div's DOM onError, so take only CopilotKit's error event.
        if (
          !("error" in event) ||
          isAbortError(event.error) ||
          userStoppedRef.current
        ) {
          return;
        }

        reportFailure(toChatError(event), "chat.stream");
      }}
      onStop={() => {
        userStoppedRef.current = true;
        copilotkit.stopAgent({ agent });
        setTimeout(() => {
          userStoppedRef.current = false;
        }, 1000);
      }}
      attachments={{ enabled: true }}
      className="bg-transparent"
      suggestionView={{
        suggestion: "bg-transparent",
        container: "bg-transparent",
      }}
      welcomeScreen={WelcomeScreen}
      messageView={{
        userMessage: { messageRenderer: "userMessageBubble" },
      }}
      input={{
        disclaimer: () => null,
        className: "pb-6 bg-transparent",
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
