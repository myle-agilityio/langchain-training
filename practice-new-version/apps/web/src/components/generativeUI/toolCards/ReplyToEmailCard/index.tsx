import { Reply, X } from "lucide-react";
import { REPLY_DECISION } from "@repo/constants";
import type { ToolCardProps } from "@/types";
import { Pending, Shell } from "../common";

// reply_to_email never returns a JSON envelope — requestApproval.ts answers the call with free
// text meant for the model's next turn, not a structured result. Matching REPLY_DECISION's value
// (the same constant EmailReplyCard weaves into that text) keeps this in sync with it — a
// reworded instruction can't silently break what this renders.
export const ReplyToEmailCard = ({
  status,
  result,
}: ToolCardProps<{ id: string }>) => {
  const approved = result?.includes(REPLY_DECISION.APPROVED);
  const rejected = result?.includes(REPLY_DECISION.REJECTED);

  return (
    <Shell
      icon={Reply}
      title="Draft reply"
      status={status}
      customStatusIcon={
        rejected ? <X className="h-3 w-3 text-muted-foreground" /> : undefined
      }
    >
      {status !== "complete" ? (
        <Pending label="Drafting a reply for approval…" />
      ) : approved ? (
        <p className="text-xs text-muted-foreground">
          Draft approved and sent.
        </p>
      ) : rejected ? (
        <p className="text-xs text-muted-foreground">
          Draft rejected — nothing sent.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">Draft reviewed.</p>
      )}
    </Shell>
  );
};
