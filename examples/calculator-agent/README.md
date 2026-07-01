# Calculator Agent

A simple LangGraph ReAct-style agent that performs arithmetic using tool calls.

## How it works

The agent runs a loop over a `StateGraph` with two nodes:

```
START → llmCall → [shouldContinue] → toolNode → llmCall → ... → END
```

1. **llmCall** — sends the conversation (with a system prompt) to the LLM bound with tools.
2. **shouldContinue** — if the LLM response contains tool calls, route to `toolNode`; otherwise end.
3. **toolNode** — executes each requested tool and returns `ToolMessage` results back into state.

The state tracks the message history and a running count of LLM calls (`llmCalls`).

## Available tools

| Tool | Description |
|---|---|
| `add` | Add two numbers |
| `multiply` | Multiply two numbers |
| `divide` | Divide two numbers |

## File structure

```
calculator-agent/
├── index.ts    # Graph definition and entry point
├── nodes.ts    # llmCall and toolNode graph nodes
├── tools.ts    # add, multiply, divide tool definitions
├── state.ts    # StateSchema (messages + llmCalls counter)
└── model.ts    # Model initialization with tools bound
```

## Output
```
[human]: Add 3 and 4.
[ai]: 
[tool]: 7
[ai]: The sum of 3 and 4 is 7.
```
