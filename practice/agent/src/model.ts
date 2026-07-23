import { ChatOpenAI } from "@langchain/openai";

// One home for the model config, shared by the main graph (agent.ts) and the compose-reply
// subgraph. gpt-4o-mini everywhere, per the practice plan; one constant so the whole practice
// moves models in a single edit.
export const MODEL = "gpt-4o-mini";

// Tool-calling model for the main ReAct loop. parallel_tool_calls:false keeps it to one tool
// call per turn, which the router relies on.
export const model = new ChatOpenAI({
  model: MODEL,
  modelKwargs: { parallel_tool_calls: false },
});

// Plain model with NO tool-calling kwargs — for one-shot / structured-output calls: history
// summarization and the compose-reply subgraph's classify + draft. `parallel_tool_calls` is
// invalid on withStructuredOutput (it sends a response_format, not tools) and OpenAI 400s, so
// those calls must NOT use `model` above.
export const plainModel = new ChatOpenAI({ model: MODEL });
