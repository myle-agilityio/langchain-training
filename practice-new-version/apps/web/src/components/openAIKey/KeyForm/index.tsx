import { useState } from "react";
import { Button, Input } from "@/components/common";
import { useOpenAIKey } from "@/stores";

interface KeyFormProps {
  submitLabel: string;
  onSaved?: () => void;
}

// Shared by the first-run gate and the change-key dialog so the "sk-" check lives in one place.
export const KeyForm = ({ submitLabel, onSaved }: KeyFormProps) => {
  const setApiKey = useOpenAIKey((s) => s.setApiKey);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed.startsWith("sk-")) {
      setError(
        'That doesn\'t look like an OpenAI key — it should start with "sk-".',
      );
      return;
    }
    setDraft("");
    setApiKey(trimmed);
    onSaved?.();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        autoFocus
        type="password"
        placeholder="sk-..."
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setError(null);
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={!draft.trim()}>
        {submitLabel}
      </Button>
      <a
        href="https://platform.openai.com/api-keys"
        target="_blank"
        rel="noreferrer"
        className="text-xs text-muted-foreground hover:underline text-center"
      >
        Get a key from platform.openai.com
      </a>
    </form>
  );
};
