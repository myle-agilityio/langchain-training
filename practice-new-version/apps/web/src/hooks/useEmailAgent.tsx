import { useInterrupt } from "@copilotkit/react-core/v2";
import { COMPOSE_REPLY_ACTION } from "@repo/constants";
import { EmailReplyCard } from "@/components/generativeUI/EmailReplyCard";

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
const parseComposeReply = (raw: string): ComposeReplyInterrupt | null => {
  try {
    const parsed = JSON.parse(raw);

    return parsed?.action === COMPOSE_REPLY_ACTION ? parsed : null;
  } catch (error) {
    // The graph only ever interrupt()s with COMPOSE_REPLY_ACTION, so a parse failure here means
    // the payload shape drifted from what this card expects, not routine routing.
    console.error("on_interrupt payload was not valid JSON:", raw, error);

    return null;
  }
};

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
