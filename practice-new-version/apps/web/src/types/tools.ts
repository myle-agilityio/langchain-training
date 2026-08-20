export type ToolStatus = "inProgress" | "executing" | "complete";

export interface ToolCardProps<P> {
  status: ToolStatus;
  parameters: Partial<P>;
  result?: string;
}
