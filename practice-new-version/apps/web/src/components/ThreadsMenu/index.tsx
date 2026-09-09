import { useState } from "react";
import { Clock } from "lucide-react";
import { useCopilotChatConfiguration } from "@copilotkit/react-core/v2";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/common";
import { ThreadsList } from "@/components/ThreadsList";

// The compact form of the conversation list, for when the sidebar isn't on screen: a clock
// trigger with the same list in a popover. Radix unmounts the content on close, so the search
// box and any rename in progress reset themselves.
export const ThreadsMenu = () => {
  const config = useCopilotChatConfiguration();
  const [open, setOpen] = useState(false);

  if (!config) {
    return null;
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Conversation history"
          title="Conversation history"
        >
          <Clock className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        <ThreadsList
          onPicked={() => setOpen(false)}
          className="max-h-[26rem]"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
