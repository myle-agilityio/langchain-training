import { Check, Cpu } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/common";
import { useChatModel } from "@/stores";
import { CHAT_MODEL_OPTIONS } from "@repo/constants";
import { cn } from "@/utils";

// Picks which model powers the chat's replies — forwarded as a header, see App.tsx.
export const ModelPicker = () => {
  const modelId = useChatModel((s) => s.modelId);
  const setModelId = useChatModel((s) => s.setModelId);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Choose chat model"
          title="Choose chat model"
        >
          <Cpu className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {CHAT_MODEL_OPTIONS.map((option) => (
          <DropdownMenuItem
            key={option.id}
            onClick={() => setModelId(option.id)}
          >
            <Check
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                option.id === modelId ? "opacity-100" : "opacity-0",
              )}
            />
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
