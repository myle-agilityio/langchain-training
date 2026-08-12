import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, Check, X, TriangleAlert } from "lucide-react";
import { useSharedInbox } from "@/hooks/use-shared-inbox";

export interface EmailReplyCardProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  id: string;
  subject: string;
  body: string;
  // From check_compliance — a guardrail flag, not a hard block: the teacher still decides.
  compliance?: { compliant: boolean; violations: string[] };
}

export function EmailReplyCard({
  status,
  respond,
  id,
  subject: draftSubject,
  body: draftBody,
  compliance,
}: EmailReplyCardProps) {
  const { patchEmail } = useSharedInbox();
  const [subject, setSubject] = useState(draftSubject);
  const [body, setBody] = useState(draftBody);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);

  // The tool call's args arrive empty on the first ("inProgress") render and only populate at
  // "executing" — useState's initializer only runs once, so without this the fields would stay
  // permanently blank.
  useEffect(() => {
    setSubject(draftSubject);
    setBody(draftBody);
  }, [draftSubject, draftBody]);

  // The interrupt's resume doesn't replay the backend tool to completion, so this card — not
  // the backend — applies the state change, via patchEmail. The respond() payload carries an
  // instruction because the model gets a turn either way; left bare it narrates the whole job
  // back, all of which this card is already showing on screen.
  const handleApprove = () => {
    setDecision("approve");
    patchEmail(id, {
      status: "replied",
      reply: { subject, body, sentAt: new Date().toISOString() },
    });
    respond?.(
      JSON.stringify({
        decision: "approve",
        instruction:
          "The teacher approved this draft and it has been sent. The UI already shows a " +
          "'Reply sent' confirmation with the subject. Do NOT repeat the draft body, the " +
          "subject, the classification, or anything from the knowledge base. Reply with one " +
          "friendly line confirming it was sent, then stop.",
      }),
    );
  };

  // `respond` is what clears the pending interrupt, and CopilotKit answers it by continuing the
  // run — there's no exposed way to resolve an interrupt without the agent getting another
  // turn. A bare `{"decision":"reject"}` reads to the model as "try again", and it would
  // immediately produce a second card.
  const handleReject = () => {
    setDecision("reject");
    respond?.(
      JSON.stringify({
        decision: "reject",
        // The draft as last seen (edits included) — the agent keeps it for a later "adjust it".
        subject,
        body,
        instruction:
          "The teacher rejected this draft and nothing was sent. Do NOT write another " +
          "draft and do NOT call compose_reply again unless they explicitly ask. Reply " +
          "with one polite line acknowledging it, then stop.",
      }),
    );
  };

  if (decision === "approve") {
    return (
      <Card className="max-w-md w-full mx-auto mb-4 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[#189370]">
              <Check className="h-5 w-5 text-white" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Reply sent
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                {subject}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (decision === "reject") {
    return (
      <Card className="max-w-md w-full mx-auto mb-4 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-[var(--secondary)]">
              <X className="h-6 w-6 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Reply rejected
              </h3>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Nothing was sent.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-md w-full mx-auto mb-4 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-[var(--accent)] shrink-0">
            <Mail className="h-4 w-4 text-[#BEC2FF]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[var(--foreground)]">
              Review reply
            </h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Editable before sending
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
            {id.slice(0, 8)}
          </Badge>
        </div>

        {status === "inProgress" ? (
          <div className="text-sm text-[var(--muted-foreground)]">
            Drafting reply…
          </div>
        ) : (
          <div className="space-y-3">
            {compliance && !compliance.compliant && (
              <div className="flex gap-2 rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
                <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Compliance check flagged this draft</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {compliance.violations.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={status !== "executing"}
              className="w-full rounded-[var(--radius)] border border-[var(--border)]
                bg-[var(--background)] px-3 py-2 text-sm font-medium
                text-[var(--foreground)] disabled:opacity-70"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={status !== "executing"}
              rows={6}
              className="w-full rounded-[var(--radius)] border border-[var(--border)]
                bg-[var(--background)] px-3 py-2 text-sm resize-none
                text-[var(--foreground)] disabled:opacity-70"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                disabled={status !== "executing"}
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                size="sm"
                disabled={status !== "executing"}
                onClick={handleApprove}
              >
                Approve &amp; Send
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
