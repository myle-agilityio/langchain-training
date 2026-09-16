import { useEffect, useRef, type ComponentProps } from "react";
import {
  CopilotChat,
  CopilotChatUserMessage,
  isAbortError,
  useAgent,
  useCopilotKit,
} from "@copilotkit/react-core/v2";
import { reportFailure, toChatError } from "@/lib/errors";
import { useComposeApproval } from "@/stores";
import { SendButtonWithModelPicker } from "./SendButtonWithModelPicker";
import { WelcomeScreen } from "./WelcomeScreen";

type SendButtonProps = ComponentProps<typeof SendButtonWithModelPicker>;

// askAgentToReply (EmailInbox) prepends "Email id: <uuid>" to the prompt so the agent can act
// on it — the teacher never needs to see that line, so strip it from the displayed bubble only.
const hideEmailId = (content: string) => content.replace(/^Email id: .+\n?/m, "");

// Locks the composer while paused on a compose_reply interrupt: answer the card, not the chat.
// The OpenAI key itself is gated app-wide by KeyGateOverlay — by the time this mounts, one exists.
export const EmailChat = () => {
  const awaitingApproval = useComposeApproval((s) => s.awaitingApproval);
  const locked = awaitingApproval ? { disabled: true as const } : undefined;
  const { copilotkit } = useCopilotKit();
  const { agent } = useAgent();

  // Clicking stop can still surface as a normal run error, not an AbortError — this flag
  // marks "we just stopped it ourselves" so that error gets ignored instead of toasted.
  const userStoppedRef = useRef(false);

  useEffect(() => {
    const subscription = agent.subscribe({
      onRunStartedEvent: () => {
        userStoppedRef.current = false;
      },
    });

    return () => subscription.unsubscribe();
  }, [agent]);

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
      }}
      attachments={{ enabled: true }}
      className="bg-transparent"
      suggestionView={{
        suggestion: "bg-transparent",
        container: "bg-transparent",
      }}
      welcomeScreen={WelcomeScreen}
      messageView={{
        userMessage: {
          messageRenderer: ({ content }) => (
            <CopilotChatUserMessage.MessageRenderer
              content={hideEmailId(content)}
              className="userMessageBubble"
            />
          ),
        },
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
        sendButton: (props: SendButtonProps) => (
          <SendButtonWithModelPicker {...props} {...locked} />
        ),
        addMenuButton: locked,
      }}
    />
  );
};
