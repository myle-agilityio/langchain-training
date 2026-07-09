"use client";

import { useEffect, useRef } from "react";
import { z } from "zod";
import {
  useAgent,
  useComponent,
  useHumanInTheLoop,
  UseAgentUpdate,
} from "@copilotkit/react-core/v2";
import { EmailAnalysisCard } from "@/components/generative-ui/email-analysis-card";
import { ComposeReplyReview } from "@/components/generative-ui/email-compose-review";
import { BugTicketReview } from "@/components/generative-ui/email-bug-review";
import type { Email } from "@/types/types";

const IntentEnum = z.enum(["question", "bug", "billing", "feature", "complex"]);
const UrgencyEnum = z.enum(["low", "medium", "high", "critical"]);

/**
 * Registers the email agent's generative UI and human-in-the-loop review tools.
 * These are the ONLY code paths that can flip an email to "replied" or
 * "bug_filed" -- the backend's manage_emails tool schema deliberately excludes
 * those statuses, so review here is structurally required, not just prompted.
 */
export const useEmailAgent = () => {
  const { agent } = useAgent({ updates: [UseAgentUpdate.OnRunStatusChanged] });

  // If this hook's host unmounts while a run is active -- e.g. a dev-mode hot
  // reload while a composeReply/createBugTicket review card is pending -- the
  // in-flight tool call's promise is abandoned without a response, which then
  // makes the *next* LLM call fail with "tool_calls must be followed by tool
  // messages". Aborting the run on unmount keeps that from happening.
  const runningRef = useRef(false);
  useEffect(() => {
    runningRef.current = agent.isRunning;
  }, [agent.isRunning]);
  useEffect(() => {
    return () => {
      if (runningRef.current) agent.abortRun();
    };
  }, [agent]);

  useComponent({
    name: "showEmailAnalysis",
    description:
      "Controlled Generative UI that displays the result of classifying an email (intent, urgency, topic, summary).",
    parameters: z.object({
      emailId: z.string(),
      intent: IntentEnum,
      urgency: UrgencyEnum,
      topic: z.string(),
      summary: z.string(),
    }),
    render: EmailAnalysisCard,
  });

  useHumanInTheLoop({
    name: "composeReply",
    description:
      "Draft a reply to a customer email and ask the human to review, edit, and approve it before it is sent. Always required before sending any reply.",
    parameters: z.object({
      emailId: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
    render: ({ status, args, respond }) => (
      <ComposeReplyReview
        status={status}
        respond={respond}
        emailId={args.emailId}
        subject={args.subject}
        body={args.body}
        onApprove={(finalBody) => {
          const emails = (agent.state?.emails ?? []) as Email[];
          agent.setState({
            ...agent.state,
            emails: emails.map((e) =>
              e.id === args.emailId
                ? {
                    ...e,
                    // A prior bug_filed status wins -- this reply may just be the
                    // follow-up notification for an already-filed bug ticket.
                    status: e.status === "bug_filed" ? "bug_filed" : "replied",
                    reply: finalBody,
                  }
                : e,
            ),
          });
        }}
      />
    ),
  });

  useHumanInTheLoop({
    name: "createBugTicket",
    description:
      "File a bug ticket for a customer-reported issue and ask the human to review and approve it before it is created. Always required before creating a bug ticket.",
    parameters: z.object({
      emailId: z.string(),
      title: z.string(),
      description: z.string(),
      severity: UrgencyEnum,
    }),
    render: ({ status, args, respond }) => (
      <BugTicketReview
        status={status}
        respond={respond}
        emailId={args.emailId}
        title={args.title}
        description={args.description}
        severity={args.severity}
        onApprove={(ticketId) => {
          const emails = (agent.state?.emails ?? []) as Email[];
          agent.setState({
            ...agent.state,
            emails: emails.map((e) =>
              e.id === args.emailId ? { ...e, status: "bug_filed", bugTicketId: ticketId } : e,
            ),
          });
        }}
      />
    ),
  });
};
