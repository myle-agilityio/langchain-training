import { Reply } from "lucide-react";
import type { ToolCardProps } from "@/types";
import { Pending, Shell } from "../common";

// reply_to_email never returns a JSON envelope — the router hands it straight to the
// compose_email subgraph, which answers the call once the teacher approves or rejects.
export const ReplyToEmailCard = ({ status }: ToolCardProps<{ id: string }>) => {
  return (
    <Shell icon={Reply} title="Draft reply" status={status}>
      {status === "complete" ? (
        <p className="text-xs text-muted-foreground">Draft reviewed.</p>
      ) : (
        <Pending label="Drafting a reply for approval…" />
      )}
    </Shell>
  );
};
