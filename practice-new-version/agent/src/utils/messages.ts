import { AIMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";

// Finds the most recent reply_to_email call — the one this entry into the subgraph answers.
export function findReplyCall(messages: BaseMessage[]) {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!AIMessage.isInstance(message)) continue;
    const call = (message.tool_calls ?? []).find((c) => c.name === "reply_to_email");
    if (call) return call;
  }
  return undefined;
}

// What the teacher actually said about this reply — original request, plus the "try again,
// but..." note on a redraft. Without it, write_draft has no instructions and just repeats itself.
export function collectRevisionNotes(messages: BaseMessage[], emailId: string): string {
  const callIndices = messages.reduce<number[]>((acc, message, i) => {
    if (!AIMessage.isInstance(message)) return acc;
    const call = (message.tool_calls ?? []).find(
      (c) => c.name === "reply_to_email" && (c.args as { id?: string }).id === emailId,
    );
    return call ? [...acc, i] : acc;
  }, []);
  if (callIndices.length === 0) return "";

  const currentIdx = callIndices[callIndices.length - 1];
  const sinceIdx = callIndices.length > 1 ? callIndices[callIndices.length - 2] : -1;

  return messages
    .slice(sinceIdx + 1, currentIdx)
    .filter((m): m is HumanMessage => HumanMessage.isInstance(m))
    .map((m) => (typeof m.content === "string" ? m.content : JSON.stringify(m.content)))
    .join("\n");
}
