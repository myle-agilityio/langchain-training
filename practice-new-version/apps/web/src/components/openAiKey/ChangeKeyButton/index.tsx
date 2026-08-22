import { useState } from "react";
import { KeyRound } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/common";
import { useOpenAiKey } from "@/stores";
import { KeyForm } from "../KeyForm";

// The only way back out of a saved-but-invalid key — the gate only checks the "sk-" prefix, so a
// wrong-but-well-formed key would otherwise lock the app behind 401s with no way to replace it.
export const ChangeKeyButton = () => {
  const clearApiKey = useOpenAiKey((s) => s.clearApiKey);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Change OpenAI API key"
          title="Change OpenAI API key"
        >
          <KeyRound className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Change your OpenAI API key</DialogTitle>
        </DialogHeader>
        <p className="mb-3 text-sm text-muted-foreground">
          Chats or drafts failing usually mean the saved key is wrong, revoked,
          or out of credit. Paste a new one here.
        </p>
        <KeyForm submitLabel="Save key" onSaved={() => setOpen(false)} />
        <Button
          type="button"
          variant="ghost"
          className="mt-1 text-muted-foreground"
          onClick={() => {
            setOpen(false);
            clearApiKey();
          }}
        >
          Remove saved key
        </Button>
      </DialogContent>
    </Dialog>
  );
};
