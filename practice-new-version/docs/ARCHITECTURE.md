# Architecture

Diagrams of the AI Email Assistant: overall system, the main agent graph, and the
`compose_email` subgraph. All rendered top-to-bottom (vertical).

## System overview

```mermaid
graph TD
    User["Teacher (browser)"]

    subgraph Frontend["Next.js — :3000"]
        UI["src/components/EmailInbox/*"]
        Hook["useSharedInbox.ts (TanStack Query)"]
        EmailsAPI["/api/emails"]
        CopilotRoute["/api/copilotkit/[[...slug]]"]
    end

    subgraph AgentServer["LangGraph agent — :8123 (langgraphjs dev)"]
        Graph["graph (apps/agent/src/graphs/index.ts)"]
    end

    subgraph Postgres["Postgres — DATABASE_URL"]
        EmailsTbl[("emails / contact_profiles")]
        KB[("kb_documents (pgvector)")]
        Checkpoints[("checkpoints*")]
        Store[("store* (cross-thread memory)")]
    end

    User --> UI
    UI --> Hook
    Hook --> EmailsAPI
    EmailsAPI --> EmailsTbl
    UI -- "CopilotKit chat" --> CopilotRoute
    CopilotRoute -- "runs" --> Graph

    Graph --> EmailsTbl
    Graph --> KB
    Graph --> Checkpoints
    Graph --> Store
```

## Main agent graph (`apps/agent/src/graphs/index.ts`)

A ReAct loop gated by a `moderator` node; `compose_email` is a subgraph node (detailed below).
`moderator` hard-blocks unsafe/abusive chat input before it reaches `call_model` — distinct from
`call_model`'s own `SCOPE_GUIDE` (declines out-of-scope-but-safe requests) and `check_compliance`
below (checks outgoing drafts, not chat input).

```mermaid
graph TD
    START(["START"]) --> moderator

    moderator{{"moderator"}}
    moderator -- "flagged" --> END_blocked(["END"])
    moderator -- "not flagged" --> call_model

    call_model["call_model"]
    call_model -- "reply_to_email call" --> compose_email
    call_model -- "other tool call" --> tools
    call_model -- "no tool call" --> END_done(["END"])

    tools["tools (ToolNode)"]
    tools --> call_model

    compose_email[["compose_email (subgraph)"]]
    compose_email --> call_model
```

## `compose_email` subgraph (`apps/agent/src/graphs/composeEmailSubgraph.ts`)

Fixed prompt-chaining pipeline run for every reply.

```mermaid
graph TD
    START(["START"]) --> triage

    triage{{"triage"}}
    triage -- "needs research" --> research
    triage -- "no research needed" --> write_draft
    triage -- "email not found" --> END_missing(["END"])

    research["research"] --> write_draft
    write_draft["write_draft"] --> check_compliance
    check_compliance["check_compliance"] --> request_approval
    request_approval["request_approval"] --> END_interrupt(["END\n(interrupt for approval)"])
```

## Tools available to `call_model`

`modelTools` (`apps/agent/src/tools/index.ts`); all but `reply_to_email` run through the `tools`
node — `reply_to_email` is routing-only and never executes. Frontend tools (below) are bound
in alongside these, so the model picks from one combined list.

```mermaid
graph TD
    call_model["call_model"]

    call_model --> get_emails
    call_model --> count_emails
    call_model --> classify_emails
    call_model --> update_email_status
    call_model --> search_knowledge_base
    call_model --> generate_a2ui
    call_model --> reply_to_email

    get_emails["get_emails"]
    count_emails["count_emails"]
    classify_emails["classify_emails"]
    update_email_status["update_email_status"]
    search_knowledge_base["search_knowledge_base"]
    generate_a2ui["generate_a2ui"]
    reply_to_email["reply_to_email\n(routes to compose_email, not executed)"]
```

## Frontend tools

UI components register tools with `useFrontendTool` (`@copilotkit/react-core/v2`). CopilotKit
sends them up as `copilotkit.actions` on agent state; `callModel` (`apps/agent/src/nodes/index.ts`)
converts each into OpenAI tool format and binds it alongside `modelTools` for that invocation
only — they are not in `executableTools`, so `routeAfterModel` never sends their calls to the
`tools` node. A call to one ends the graph turn; CopilotKit's frontend runtime matches it back
to the registered handler and runs it in the browser (e.g. filtering the inbox list, opening an
email, toggling the theme), then resumes the thread with the result.

```mermaid
graph TD
    subgraph Frontend["Next.js — :3000"]
        FilterInbox["filterInbox\n(emailInbox/index.tsx)"]
        ShowEmail["showEmail\n(emailInbox/index.tsx)"]
        ToggleTheme["toggleTheme\n(useGenerativeUi.tsx)"]
        EnableAppMode["enableAppMode\n(chatSidebar/index.tsx)"]
        EnableChatMode["enableChatMode\n(chatSidebar/index.tsx)"]
    end

    FilterInbox -- "useFrontendTool" --> CopilotRoute["/api/copilotkit/[[...slug]]"]
    ShowEmail -- "useFrontendTool" --> CopilotRoute
    ToggleTheme -- "useFrontendTool" --> CopilotRoute
    EnableAppMode -- "useFrontendTool" --> CopilotRoute
    EnableChatMode -- "useFrontendTool" --> CopilotRoute

    CopilotRoute -- "copilotkit.actions on state" --> call_model["call_model"]
    call_model -- "tool call for a frontend tool" --> END(["END\n(turn ends)"])
    END -- "runtime matches call to handler,\nruns it in the browser, resumes thread" --> CopilotRoute
```
