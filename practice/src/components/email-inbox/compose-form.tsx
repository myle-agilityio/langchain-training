"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ComposeFormProps {
  initialSubject: string;
  onSend: (subject: string, body: string) => void;
  onCancel: () => void;
}

// Manual counterpart to EmailReplyCard: sends directly via agent.setState with
// no agent/interrupt round-trip at all, for when the human wants to write the
// reply themselves instead of asking the model to draft one.
export function ComposeForm({ initialSubject, onSend, onCancel }: ComposeFormProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-3">
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="w-full rounded-[var(--radius)] border border-[var(--border)]
          bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)]"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your reply…"
        rows={8}
        className="w-full rounded-[var(--radius)] border border-[var(--border)]
          bg-[var(--background)] px-3 py-2 text-sm resize-none text-[var(--foreground)]"
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" disabled={!canSend} onClick={() => onSend(subject.trim(), body.trim())}>
          Send
        </Button>
      </div>
    </div>
  );
}
