import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common";
import { KeyForm } from "../KeyForm";

// Blocks the whole app, not just the chat pane, until a key is saved — every surface
// (chat, inbox reply, agent tools) ends up calling OpenAI.
export const KeyGateOverlay = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Enter your OpenAI API key to continue</CardTitle>
        <CardDescription>
          This app doesn&apos;t supply its own key — every chat, classification,
          and drafted reply runs on your key, billed to your OpenAI account.
          It&apos;s stored only in this browser (localStorage), never on our
          servers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <KeyForm submitLabel="Save and continue" />
      </CardContent>
    </Card>
  </div>
);
