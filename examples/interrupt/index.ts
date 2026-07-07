import {
  Command,
  MemorySaver,
  START,
  END,
  StateGraph,
  StateSchema,
  interrupt,
} from "@langchain/langgraph";
import * as z from "zod";

const State = new StateSchema({
  generatedText: z.string(),
});

const builder = new StateGraph(State)
  .addNode("review", async (state) => {
    // Ask a reviewer to edit the generated content
    const updated = interrupt({
      instruction: "Review and edit this content",
      content: state.generatedText,
    });
    return { generatedText: updated };
  })
  .addEdge(START, "review")
  .addEdge("review", END);

const checkpointer = new MemorySaver();
const graph = builder.compile({ checkpointer });

const config = { configurable: { thread_id: "review-42" } };
const initial = await graph.invoke({ generatedText: "Initial draft" }, config);
console.log((initial as any).__interrupt__);
// [{ value: { instruction: ..., content: ... } }]

// Resume with the edited text from the reviewer
const finalState = await graph.invoke(
  new Command({ resume: "Improved draft after review" }),
  config,
);
console.log(finalState.generatedText); // -> "Improved draft after review"
