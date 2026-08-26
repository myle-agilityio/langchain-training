# `web` — Vite inbox UI

The frontend half of the AI Email Assistant: a single-page Vite + React app (no router) that
renders the teacher's inbox next to a CopilotKit chat sidebar.

## Running it

```bash
pnpm dev:ui             # from the repo root — Vite on :3000
pnpm --filter web typecheck
pnpm build              # vite build → apps/web/dist
```

## Environment

| Variable                          | Required | Read by                             | Purpose                                                                                                                        |
| --------------------------------- | -------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `COPILOTKIT_LICENSE_TOKEN`        | No       | `vite.config.ts`, at build/dev time | Server-side token, also set in `apps/agent/.env`. Its presence derives the Threads flag below — set the token, never the flag. |
| `AGENT_URL`                       | No       | `vercel.json`, at deploy time       | Rewrite target for `/api/*` in production; set on the deploy platform. Ignored in dev, where the Vite proxy handles it.        |
| `VITE_COPILOTKIT_THREADS_ENABLED` | Derived  | —                                   | Injected by `vite.config.ts` as `"true"`/`"false"`.                                 |

## Structure

```
index.html               # Entry document
src/
├── main.tsx             # createRoot → <App />, globals.css, CopilotKit v2 styles
├── app/
│   ├── App.tsx          # Providers: QueryClientProvider → CopilotKit → chat config → layout
│   └── globals.css      # Tailwind v4 entry, theme tokens, CopilotKit overrides
├── components/          # index.ts barrel; one folder per component, each with an index.tsx
│   ├── EmailInbox/      # Inbox shell + InboxList, FilterDialog, EmailDetail/ComposeForm
│   ├── EmailChat/       # The CopilotKit chat surface
│   ├── ChatSidebar/     # Collapsible right-hand sidebar hosting the chat
│   ├── ThreadsMenu/     # Conversation history dropdown
│   ├── openAIKey/       # BYOK — key form, chat gate card, change-key button
│   ├── ToolRendering/   # Tool-call reasoning renderer
│   ├── common/          # Primitives: Badge, Button, Card, Dialog, DropdownMenu, Field, Spinner
│   ├── generativeUI/    # EmailReplyCard (approve/reject) + one card per tool
│   └── declarativeGenerativeUI/  # A2UI catalog: definitions.ts, renderers.tsx, theme.ts
├── api/                 # The only place that talks HTTP
│   ├── client.ts        # axios instance — JSON in/out, uniform "METHOD /path failed (status)"
│   ├── emails.ts        # GET/PATCH /api/emails
│   └── threads.ts       # GET/POST/PATCH/DELETE /api/threads
├── hooks/
│   ├── useSharedInbox.ts        # Inbox query + patch mutations
│   ├── useSelfManagedThreads.ts # Threads query + rename/delete/save
│   ├── useEmailAgent.tsx        # Wires the selected email into the agent's context
│   ├── useComposingEmail.ts     # The email the compose pipeline is drafting for
│   ├── useGenerativeUI.tsx      # Frontend tools + interrupt rendering
│   ├── useToolRenderers.tsx     # Maps tool calls to their cards
│   ├── useEmailLookup.ts        # id -> Email map for the tool cards
│   ├── useExampleSuggestions.tsx
│   └── useSync*.ts              # Invalidate queries / mirror state on run lifecycle
├── stores/              # zustand — client-only state (theme, OpenAI key, compose approval)
├── lib/queryClient.ts   # Configured library instances — one QueryClient, one error log point
├── utils/               # Pure helpers, re-exported from index.ts
│   ├── cn.ts            # clsx + tailwind-merge
│   ├── emailFilters.ts  # Filter predicates for the inbox list
│   ├── formatDate.ts
│   └── parseResult.ts   # Safe JSON.parse of a tool result
├── constants/           # One file per facet (tone, topic, urgency, status, course, workType, errors)
└── types/               # email, errors, tools; ChatThread re-exported from @repo/shared
public/                  # Static assets (kebab-case, by rule)
```

## Stack

| Package                                                | Version  | Role                                      |
| ------------------------------------------------------ | -------- | ----------------------------------------- |
| Vite                                                   | ^7       | Dev server + build                        |
| React / React DOM                                      | ^19.2.4  | UI                                        |
| TypeScript                                             | ^5       | `tsc --noEmit` via `pnpm typecheck`       |
| Tailwind CSS + `@tailwindcss/vite`                     | ^4       | Styling (CSS-first config in globals.css) |
| `@copilotkit/react-core` (v2)                          | 1.62.3   | Chat, agent state, interrupts             |
| `@copilotkit/a2ui-renderer`                            | 1.62.3   | Declarative generative UI catalog         |
| `@tanstack/react-query`                                | ^5.101.4 | All server state                          |
| `zustand`                                              | ^5.0.15  | Client-only state                         |
| `axios`                                                | ^1.19.0  | The single API client                     |
| Radix UI (`dialog`, `dropdown-menu`)                   | ^1.1–2.1 | Accessible primitives                     |
| `lucide-react`                                         | ^0.577.0 | Icons                                     |
| `recharts`                                             | ^3.7.0   | Charts in generative UI                   |
| `date-fns`                                             | ^4.4.0   | Relative timestamps                       |
| `class-variance-authority` / `clsx` / `tailwind-merge` | —        | Variant + class composition               |
| `zod`                                                  | ^3.23.8  | Shared schemas with the agent's tool args |
