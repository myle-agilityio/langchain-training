"use client";

import { z } from "zod";
import { useHumanInTheLoop } from "@copilotkit/react-core/v2";
import { EmailReplyCard } from "@/components/generative-ui/email-reply-card";

export const useEmailAgent = () => {
  // Matches the backend's compose_reply tool by name — the agent calls
  // copilotKitInterrupt({ action: "compose_reply", args }) from inside that
  // tool, which is what this hook's render/respond cycle actually resolves.
  useHumanInTheLoop({
    name: "compose_reply",
    description:
      "Draft a reply to an email; pauses for human approval before sending.",
    parameters: z.object({
      id: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
    render: ({ status, args, respond }) => (
      <EmailReplyCard
        status={status}
        respond={respond}
        id={args.id ?? ""}
        subject={args.subject ?? ""}
        body={args.body ?? ""}
      />
    ),
  });
};
