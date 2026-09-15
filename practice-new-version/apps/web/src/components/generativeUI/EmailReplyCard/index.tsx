import { useState } from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Input,
  Textarea,
} from "@/components/common";
import { Mail, Check, X, TriangleAlert } from "lucide-react";
import { REPLY_DECISION } from "@repo/constants";
import { usePatchEmail } from "@/hooks";

export interface EmailReplyCardProps {
  status: "inProgress" | "executing" | "complete";
  respond?: (response: string) => void;
  id: string;
  subject: string;
  body: string;
  // From check_compliance — a guardrail flag, not a hard block: the teacher still decides.
  compliance?: { compliant: boolean; violations: string[] };
}

export const EmailReplyCard = ({
  status,
  respond,
  id,
  subject: draftSubject,
  body: draftBody,
  compliance,
}: EmailReplyCardProps) => {
  const patchEmail = usePatchEmail();
  const [subject, setSubject] = useState(draftSubject);
  const [body, setBody] = useState(draftBody);
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [sendFailed, setSendFailed] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Tool args arrive empty on the first ("inProgress") render, only populating at "executing" —
  // useState's initializer runs once, so without this the fields would stay blank.
  const [syncedDraft, setSyncedDraft] = useState({ draftSubject, draftBody });

  if (
    syncedDraft.draftSubject !== draftSubject ||
    syncedDraft.draftBody !== draftBody
  ) {
    setSyncedDraft({ draftSubject, draftBody });
    setSubject(draftSubject);
    setBody(draftBody);
  }

  // The interrupt's resume doesn't replay the backend tool, so this card applies the state
  // change via patchEmail. respond() only fires once patchEmail's outcome is known — telling
  // the model it sent before the request even resolves would be a lie if it then fails.
  const handleApprove = () => {
    setDecision("approve");
    setIsSending(true);
    patchEmail(
      id,
      {
        status: "replied",
        reply: { subject, body, sentAt: new Date().toISOString() },
      },
      {
        onSuccess: () => {
          setIsSending(false);
          respond?.(
            JSON.stringify({
              decision: "approve",
              // ReplyToEmailCard matches REPLY_DECISION's value out of this text, so it stays in
              // sync even if the sentence around it changes.
              instruction:
                `The teacher ${REPLY_DECISION.APPROVED} this draft and it has been sent. The UI ` +
                "already shows a 'Reply sent' confirmation with the subject. Do NOT repeat the " +
                "draft body, the subject, the classification, or anything from the knowledge " +
                "base. Reply with one friendly line confirming it was sent, then stop.",
            }),
          );
        },
        onError: () => {
          setIsSending(false);
          setSendFailed(true);
          respond?.(
            JSON.stringify({
              decision: "approve",
              // Deliberately avoids the literal word "approved" (REPLY_DECISION.APPROVED) —
              // ReplyToEmailCard matches that substring to render "Draft approved and sent.",
              // which would be a lie here. Falls through to its generic "Draft reviewed."
              instruction:
                "The teacher said yes to sending this draft, but the send itself failed due " +
                "to a server error. The action is NOT complete — nothing was sent. Retry " +
                "sending this exact draft, then tell the teacher what happened in one short " +
                "line.",
            }),
          );
        },
      },
    );
  };

  // `respond` clears the interrupt by continuing the run — no way to resolve one without the
  // agent getting another turn. A bare `{"decision":"reject"}` reads as "try again" to the model.
  const handleReject = () => {
    setDecision("reject");
    respond?.(
      JSON.stringify({
        decision: "reject",
        // The draft as last seen (edits included) — the agent keeps it for a later "adjust it".
        subject,
        body,
        // Same REPLY_DECISION-matching note as handleApprove above.
        instruction:
          `The teacher ${REPLY_DECISION.REJECTED} this draft and nothing was sent. Do NOT ` +
          "write another draft and do NOT call compose_reply again unless they explicitly " +
          "ask. Reply with one polite line acknowledging it, then stop.",
      }),
    );
  };

  if (decision === "approve" && isSending) {
    return (
      <Card className="w-full mb-4 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-accent">
              <Mail className="h-5 w-5 text-ring" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Sending…</h3>
              <p className="text-sm text-muted-foreground mt-1">{subject}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-4 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center h-9 w-9 rounded-full bg-accent shrink-0">
            <Mail className="h-4 w-4 text-ring" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-foreground">
              Review reply
            </h3>
            <p className="text-xs text-muted-foreground">
              Editable before sending
            </p>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
            {id.slice(0, 8)}
          </Badge>
        </div>

        {status === "inProgress" ? (
          <div className="text-sm text-muted-foreground">Drafting reply…</div>
        ) : (
          <div className="space-y-3">
            {compliance && !compliance.compliant && (
              <div className="flex gap-2 rounded-xl border border-tone-amber/30 bg-tone-amber/10 px-3 py-2 text-xs text-tone-amber">
                <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    Compliance check flagged this draft
                  </p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {compliance.violations.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={status !== "executing"}
              className="font-medium"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={status !== "executing"}
              rows={6}
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
};
