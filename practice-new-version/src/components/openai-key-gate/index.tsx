import { useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useOpenAiKey } from "@/stores/use-openai-key";

// Deliberately not a Dialog: there's nothing to dismiss to — no close button, no
// click-outside/Escape affordance — until a key is actually saved.
export const OpenAiKeyGate = ({ children }: { children: ReactNode }) => {
  const { apiKey, setApiKey } = useOpenAiKey();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (apiKey) return <>{children}</>;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed.startsWith("sk-")) {
      setError('That doesn\'t look like an OpenAI key — it should start with "sk-".');
      return;
    }
    setApiKey(trimmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Enter your OpenAI API key</CardTitle>
          <CardDescription>
            This app doesn&apos;t supply its own key — every chat, classification, and drafted
            reply runs on your key, billed to your OpenAI account. It&apos;s stored only in this
            browser (localStorage), never on our servers.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={!draft.trim()}>
              Save and continue
            </Button>
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-[var(--muted-foreground)] hover:underline text-center"
            >
              Get a key from platform.openai.com
            </a>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
