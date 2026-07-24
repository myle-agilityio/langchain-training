---
name: agent-prompt-authoring
description: Decide where an instruction for the model belongs — tool description, system prompt, or a decision's respond()/tool-result payload — and keep it in exactly one place. Use before adding or editing any prompt text, tool description, or tool-result message in the agent.
---

# Prompt authoring: one instruction, one home

Tool descriptions, the system prompt, and tool-result / `respond()` payloads are all sent to the
model and cost tokens on **every** call. Duplicated guidance is not redundancy for safety — it
crowds out the instructions that matter and makes the two copies drift apart.

## Where each kind of text goes

| Kind of instruction | Home | Why there |
| --- | --- | --- |
| How to use a tool, its constraints, what it can't do | that tool's `description` | The model sees it bound to the tool, exactly when it's choosing to call it |
| Cross-cutting behaviour, tone, response style, ordering across tools | system prompt | No single tool owns it |
| What to do after a specific decision or result | that decision's tool-result / `respond()` payload | Only relevant once that branch is taken |

The tool schema/description is the canonical home for anything about that tool. When in doubt
between the description and the system prompt, put it in the description.

## Before adding a line

1. Search the tool descriptions and the system prompt for the rule you're about to write.
2. If it's already covered anywhere, stop — don't restate it.
3. If two places would say the same thing, cut one rather than keeping both "for emphasis."

Prefer encoding a rule in the **schema** over stating it in prose: a `z.enum` that omits a status
makes the constraint unreachable, where "don't set status to replied" only makes it discouraged —
the model cannot pick a value the type doesn't have, whereas asking nicely only discourages it.

## Field notes

- Descriptions should say what the *return value* is good for, not just what the tool does —
  e.g. `get_emails` tells the model to read `countsByStatus` rather than counting the array
  itself, which is where it otherwise goes wrong.
- Tool results should name the recovery when something fails ("call get_emails for current ids"),
  so the failure branch doesn't need to live in the system prompt.
