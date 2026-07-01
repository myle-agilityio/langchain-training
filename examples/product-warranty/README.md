# Product Warranty Support Agent

A multi-step customer support agent that handles device warranty claims using LangChain and LangGraph.

## Workflow

```mermaid
flowchart TD
    A([🗨️ Customer reports an issue])
    A --> B{Is the device\nunder warranty?}

    B -- ✅ Yes --> C{What type\nof issue?}
    B -- ❌ No --> D{What type\nof issue?}

    C -- 🖥️ Software --> E[Provide troubleshooting\nsteps]
    C -- 🔧 Hardware --> F[Provide warranty\nrepair instructions]

    D -- 🖥️ Software --> E
    D -- 🔧 Hardware --> G[Escalate to human\nfor paid repair options]

    E --> H([✅ Issue Resolved])
    F --> H
    G --> H

    style A fill:#d4f1a0,stroke:#7ab32e,color:#000
    style H fill:#d4f1a0,stroke:#7ab32e,color:#000
    style B fill:#dbeafe,stroke:#93c5fd,color:#000
    style C fill:#dbeafe,stroke:#93c5fd,color:#000
    style D fill:#dbeafe,stroke:#93c5fd,color:#000
    style E fill:#fce7f3,stroke:#f9a8d4,color:#000
    style F fill:#fce7f3,stroke:#f9a8d4,color:#000
    style G fill:#ffe4e6,stroke:#fca5a5,color:#000
```

## How It Works

The agent progresses through three steps driven by middleware and tool calls:

| Step | Role | Tools |
|---|---|---|
| `warranty_collector` | Greet customer, ask about warranty | `record_warranty_status` |
| `issue_classifier` | Ask customer to describe the issue | `record_issue_type` |
| `resolution_specialist` | Provide solution or escalate | `provide_solution`, `escalate_to_human` |

Each tool returns a LangGraph `Command` that updates state and advances `currentStep`. The middleware in [middleware.ts](middleware.ts) reads `currentStep` each turn to inject the right system prompt and tools.

## File Structure

```
product-warranty/
├── index.ts        # Runs a 4-turn demo conversation
├── middleware.ts   # Swaps prompt + tools per step
├── state.ts        # LangGraph state (currentStep, warrantyStatus, issueType)
├── schemas.ts      # Zod enums for steps, warranty status, issue type
├── tools.ts        # Tools that record state and drive transitions
└── prompts.ts      # System prompts for each step
```

## Running

```bash
pnpm tsx product-warranty/
```

## Example Output

```
You: hi

Agent: Hello! How can I assist you today?

You: my phone cracked

Agent: I'm sorry to hear about your phone! Let’s see how we can help. Can you please let me know if your device is still under warranty?

You: no

Agent: Warranty status recorded as: out_of_warranty


Agent: Thank you for that information. Now, can you describe the issue with your phone a bit more? Is it only the cracked screen, or are there any other problems you're experiencing?

You: it only cracked screen

Agent: Issue type recorded as: hardware


Agent: Escalating to human support. Reason: Customer has a cracked screen and the device is out of warranty, needing paid repair options.


Agent: I've escalated your case to a human support specialist who will provide you with information on paid repair options for your cracked screen. They will be in touch with you shortly. If you have any more questions or need further assistance in the meantime, feel free to ask!

You: oh sorry, it still under warranty

Agent: Solution provided: To proceed with your warranty repair for the cracked screen, please follow these steps: 1. Contact our warranty support team via phone or email. 2. Provide them with your device's serial number and a brief description of the issue. 3. They may provide you with a shipping label to send your device for repair, or direct you to an authorized service center. 4. Once they receive your device, they will assess the damage and perform the necessary repairs under warranty.


Agent: Escalating to human support. Reason: Customer mistakenly said the device is out of warranty, but it is actually under warranty for a cracked screen.


Agent: No problem! Since your device is under warranty, here are the steps to proceed with the warranty repair for the cracked screen:

1. **Contact Warranty Support**: Reach out to our warranty support team via phone or email.
2. **Provide Information**: Have your device's serial number ready and share a brief description of the issue.
3. **Shipping Label**: They may send you a shipping label to send your device for repair or direct you to an authorized service center.
4. **Assessment and Repair**: Once they receive your device, they will assess the damage and handle the necessary repairs under warranty.

Additionally, I've escalated your case to a human support specialist to assist you further with the warranty claim. They will be in touch shortly. If you have any more questions, feel free to ask!
```
