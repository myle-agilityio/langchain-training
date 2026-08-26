import { messageForCode } from "@/constants";
import type { ToolError } from "@/types";
import { Failure } from "../Failure";

// The one failure branch every card renders — wording comes from the code, so a message the
// agent generated is never shown verbatim.
export const ToolFailure = ({ error }: { error: ToolError }) => {
  return <Failure text={messageForCode(error.code)} />;
};
