import { useInterrupt } from "@copilotkit/react-core/v2";
import { EmailReplyCard } from "@/components/generative-ui/email-reply-card";

// Matches the discriminator agent/src/constants/index.ts puts in interrupt()'s value.
const COMPOSE_REPLY_ACTION = "compose_reply";

interface ComposeReplyInterrupt {
  action: string;
  args: {
    id: string;
    subject: string;
    body: string;
    compliance?: { compliant: boolean; violations: string[] };
  };
}

// The AG-UI/LangGraph bridge forwards interrupt() values as a JSON string on a generic
// "on_interrupt" custom event — parse it and only claim the ones this card understands.
function parseComposeReply(raw: string): ComposeReplyInterrupt | null {
  try {
    const parsed = JSON.parse(raw);
    return parsed?.action === COMPOSE_REPLY_ACTION ? parsed : null;
  } catch {
    return null;
  }
}

export const useEmailAgent = () => {
  useInterrupt<string>({
    enabled: (event) => parseComposeReply(event.value) !== null,
    render: ({ event, resolve }) => {
      const { args } = parseComposeReply(event.value)!;
      return (
        <EmailReplyCard
          status="executing"
          respond={(response) => void resolve(response)}
          id={args.id}
          subject={args.subject}
          body={args.body}
          compliance={args.compliance}
        />
      );
    },
  });
};
