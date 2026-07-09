"use client";

import { useState } from "react";
import { useAgent, useCopilotKit } from "@copilotkit/react-core/v2";
import { EmailList } from "./email-list";
import { EmailDetail } from "./email-detail";
import type { Email } from "../../types/types";

export function ExampleCanvas() {
  const { agent } = useAgent();
  const { copilotkit } = useCopilotKit();
  const emails = (agent.state?.emails ?? []) as Email[];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = emails.find((e) => e.id === selectedId) ?? null;

  const selectEmail = (email: Email) => {
    setSelectedId(email.id);
    if (email.status === "unread") {
      agent.setState({
        ...agent.state,
        emails: emails.map((e) => (e.id === email.id ? { ...e, status: "read" } : e)),
      });
    }
  };

  const askAgent = (instruction: string) => {
    agent.addMessage({ id: crypto.randomUUID(), role: "user", content: instruction });
    void copilotkit.runAgent({ agent });
  };

  return (
    <div className="h-full flex overflow-hidden bg-[--background]">
      <div className="w-[320px] shrink-0 border-r border-[var(--border)] h-full overflow-y-auto">
        <EmailList emails={emails} selectedId={selectedId} onSelect={selectEmail} />
      </div>
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        <EmailDetail
          email={selected}
          isAgentRunning={agent.isRunning}
          onAnalyze={() =>
            selected &&
            askAgent(
              `Please read and classify email ${selected.id}, then take the appropriate action ` +
                `for my review -- file a bug ticket if it's a bug, otherwise draft a reply.`,
            )
          }
        />
      </div>
    </div>
  );
}
