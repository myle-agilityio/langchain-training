# Interrupt Example

A minimal LangGraph example showing how to pause a graph mid-run with `interrupt()` and resume it later with a human-provided value.

## How it works

```
START → review → END
```

1. **review** — calls `interrupt({...})` with a payload describing what needs human input. This immediately halts execution and returns control to the caller; the node does not continue until the graph is resumed.
2. The first `graph.invoke(...)` call returns with `__interrupt__` set to the payload passed to `interrupt()`.
3. Resuming with `new Command({ resume: <value> })` (same `thread_id`) replays the graph from the checkpoint and feeds `<value>` back as `interrupt()`'s return value, so `review` continues with `updated` set to it.

## Pausing and resuming

The graph is compiled with a `MemorySaver` checkpointer, keyed by `thread_id` in `config`. Both `invoke` calls in [index.ts](index.ts) must share the same `thread_id` for the resume to find the paused checkpoint.

## File structure

```
interrupt/
└── index.ts    # State, graph definition, and interrupt/resume calls
```

## Output

```
[ { value: { instruction: 'Review and edit this content', content: 'Initial draft' } } ]
Improved draft after review
```
