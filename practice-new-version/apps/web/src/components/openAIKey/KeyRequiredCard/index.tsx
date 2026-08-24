import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common";
import { KeyForm } from "../KeyForm";

// Stands in for the chat until a key is saved. The inbox stays usable behind it — only the
// parts that actually call OpenAI are gated.
export const KeyRequiredCard = () => (
  <div className="flex h-full items-center justify-center p-4">
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Enter your OpenAI API key to chat</CardTitle>
        <CardDescription>
          This app doesn&apos;t supply its own key — every chat, classification,
          and drafted reply runs on your key, billed to your OpenAI account.
          It&apos;s stored only in this browser (localStorage), never on our
          servers.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <KeyForm submitLabel="Save and start chatting" />
      </CardContent>
    </Card>
  </div>
);
