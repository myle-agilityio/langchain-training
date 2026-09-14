import { Reply } from "lucide-react";
import type { ToolCardProps } from "@/types";
import { Pending, Shell } from "../common";

// reply_to_email never returns a JSON envelope — requestApproval.ts and composeEmailErrorHandler
// answer the call with free text meant for the model's next turn, not a structured result.
const outcomeLabel = (result?: string): string => {
  if (result?.includes("teacher approved")) {
    return "Draft approved and sent.";
  }

  if (result?.includes("teacher rejected")) {
    return "Draft rejected — nothing sent.";
  }

  return "Draft reviewed.";
};

export const ReplyToEmailCard = ({
  status,
  result,
}: ToolCardProps<{ id: string }>) => {
  return (
    <Shell icon={Reply} title="Draft reply" status={status}>
      {status === "complete" ? (
        <p className="text-xs text-muted-foreground">{outcomeLabel(result)}</p>
      ) : (
        <Pending label="Drafting a reply for approval…" />
      )}
    </Shell>
  );
};
