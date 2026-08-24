import { useEffect, useState } from "react";
import type { Email } from "@/types";
import { Badge, Button, Spinner } from "@/components";
import { ComposeForm } from "./components/ComposeForm";
import {
  COURSE_LABEL,
  STATUS_TONE,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_TONE,
  URGENCY_VARIANT,
  WORK_TYPE_LABEL,
} from "@/constants";
import { formatReceivedAtFull } from "@/lib/formatDate";
import { Mail, Sparkles } from "lucide-react";

interface EmailDetailProps {
  email: Email | null;
  isLoading: boolean;
  onSendReply: (id: string, subject: string, body: string) => void;
  onAskAgent: (email: Email) => void;
  // True while the agent is running or paused awaiting approval — disables the draft button
  // whatever it's busy with.
  isAgentBusy: boolean;
  // True only while the compose pipeline is drafting a reply to THIS email, so the button can
  // say so instead of just going dead.
  isDrafting: boolean;
}

export const EmailDetail = ({
  email,
  isLoading,
  onSendReply,
  onAskAgent,
  isAgentBusy,
  isDrafting,
}: EmailDetailProps) => {
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    setComposing(false);
  }, [email?.id]);

  if (!email) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <Mail className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading inbox…" : "Select an email to read it"}
        </p>
      </div>
    );
  }

  return (
    // pt-20 clears the ChatSidebar's floating "Open chat" button (fixed top-4 right-4) that
    // appears in this corner when the sidebar is collapsed and the inbox goes full-width.
    <div className="mx-auto px-8 pb-8 pt-20">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {email.subject}
        </h1>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{email.from.name}</span>
          <span>&lt;{email.from.email}&gt;</span>
          <span>·</span>
          <time dateTime={email.receivedAt} suppressHydrationWarning>
            {formatReceivedAtFull(email.receivedAt)}
          </time>
        </div>
        {email.classification && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            <Badge
              variant="tone"
              className={TOPIC_TONE[email.classification.topic]}
            >
              {TOPIC_LABEL[email.classification.topic]}
            </Badge>
            {email.classification.course !== "none" && (
              <Badge variant="outline">
                {COURSE_LABEL[email.classification.course]}
              </Badge>
            )}
            {email.classification.workType !== "none" && (
              <Badge variant="outline">
                {WORK_TYPE_LABEL[email.classification.workType]}
              </Badge>
            )}
            <Badge
              variant={URGENCY_VARIANT[email.classification.urgency]}
              className={URGENCY_TONE[email.classification.urgency]}
            >
              {email.classification.urgency} urgency
            </Badge>
          </div>
        )}
      </div>

      <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">
        {email.body}
      </p>

      <div className="mt-10 pt-8 border-t border-border">
        {email.reply ? (
          <div className={STATUS_TONE.replied}>
            <p className="text-xs font-semibold text-(color:--tone) mb-2">
              Your reply — sent {new Date(email.reply.sentAt).toLocaleString()}
            </p>
            <div className="rounded-xl border border-(--tone)/30 bg-(--tone)/10 p-5 shadow-sm">
              <p className="text-sm font-medium text-foreground">
                {email.reply.subject}
              </p>
              <p className="text-sm mt-2 whitespace-pre-wrap text-foreground">
                {email.reply.body}
              </p>
            </div>
          </div>
        ) : composing ? (
          <ComposeForm
            initialSubject={`Re: ${email.subject}`}
            onSend={(subject, body) => {
              onSendReply(email.id, subject, body);
              setComposing(false);
            }}
            onCancel={() => setComposing(false)}
          />
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => onAskAgent(email)}
              disabled={isAgentBusy}
            >
              {isDrafting ? (
                <>
                  <Spinner size="sm" />
                  Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Ask AI to draft
                </>
              )}
            </Button>
            <Button onClick={() => setComposing(true)}>Compose reply</Button>
          </div>
        )}
      </div>
    </div>
  );
};
