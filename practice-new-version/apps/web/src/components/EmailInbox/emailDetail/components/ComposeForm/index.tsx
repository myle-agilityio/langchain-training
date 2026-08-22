import { useState } from "react";
import { Button, Input, Textarea } from "@/components";

interface ComposeFormProps {
  initialSubject: string;
  onSend: (subject: string, body: string) => void;
  onCancel: () => void;
}

export const ComposeForm = ({
  initialSubject,
  onSend,
  onCancel,
}: ComposeFormProps) => {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");

  const canSend = subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="space-y-3">
      <Input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject"
        className="font-medium"
      />
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write your reply…"
        rows={8}
      />
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!canSend}
          onClick={() => onSend(subject.trim(), body.trim())}
        >
          Send
        </Button>
      </div>
    </div>
  );
};
