# Architecture

Diagrams of the AI Email Assistant: overall system, the main agent graph, and the
`compose_email` subgraph. All rendered top-to-bottom (vertical).

## System overview

```mermaid
graph TD
    User["Teacher (browser)"]

    subgraph Frontend["Next.js — :3000"]
        UI["src/components/email-inbox/*"]
        Hook["use-shared-inbox.tsx"]
        EmailsAPI["/api/emails"]
        CopilotRoute["/api/copilotkit/[[...slug]]"]
    end

    subgraph AgentServer["LangGraph agent — :8123 (langgraphjs dev)"]
        Graph["graph (agent/src/graphs/index.ts)"]
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

## Main agent graph (`agent/src/graphs/index.ts`)

A ReAct loop; `compose_email` is a subgraph node (detailed below).

```mermaid
graph TD
    START(["START"]) --> validate_request

    validate_request{{"validate_request"}}
    validate_request -- "out of scope" --> END_scope(["END"])
    validate_request -- "in scope" --> call_model

    call_model["call_model"]
    call_model -- "reply_to_email call" --> compose_email
    call_model -- "other tool call" --> tools
    call_model -- "no tool call" --> END_done(["END"])

    tools["tools (ToolNode)"]
    tools --> call_model

    compose_email[["compose_email (subgraph)"]]
    compose_email --> call_model
```

## `compose_email` subgraph (`agent/src/graphs/composeEmailSubgraph.ts`)

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

`modelTools` (`agent/src/tools/index.ts`); all but `reply_to_email` run through the `tools`
node — `reply_to_email` is routing-only and never executes.

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
