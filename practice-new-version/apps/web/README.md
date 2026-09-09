# `web` — Vite inbox UI

The frontend half of the AI Email Assistant: a single-page Vite + React app that renders the
two tabs: **Chat**, where the CopilotKit chat fills the window, and **App**, where the teacher's
inbox sits beside it. A `react-router-dom` router is wired in with one route — it exists to keep
state (the selected email) in the URL, not for multi-page nav.

## Running it

```bash
pnpm dev:ui             # from the repo root — Vite on :3000
pnpm storybook          # Storybook on :6006 — every component in isolation
pnpm --filter web typecheck
pnpm build              # vite build → apps/web/dist
pnpm build-storybook    # storybook build → apps/web/storybook-static
```

This app reads no env vars of its own — no `.env`, no `import.meta.env`. In dev, Vite's proxy
(`vite.config.ts`'s `server.proxy`) sends `/api/*` to `http://localhost:8123`.

## Deploying

### Main app

Static build on Vercel (`vercel.json`: `outputDirectory: apps/web/dist`), deployed via git.

- Set `AGENT_URL` as an environment variable on the Vercel project itself (dashboard or
  `vercel env add`) — Vercel doesn't read a checked-in `.env`.
- `vercel.json`'s `routes` rewrite `/api/*` to that `${AGENT_URL}`.

### Storybook

Ships separately, by hand: `pnpm deploy:storybook` (`scripts/deploy-storybook.mjs`) builds and
pushes `storybook-static` to its own Vercel project. No git connection, no env vars.

- Live at <https://practice-storybook.vercel.app> — the only public URL; the deployment URL the
  script prints sits behind Vercel Authentication.
- Note: the script re-links on every run, because the build wipes `.vercel` and deletes the
  token file the linker leaves behind.

## Structure

```
index.html               # Entry document
src/
├── main.tsx             # createRoot → <App />, globals.css, CopilotKit v2 styles
├── app/
│   ├── App.tsx          # QueryClientProvider → RouterProvider(router)
│   ├── Root.tsx         # The route's element: CopilotKit → chat config → page
│   └── globals.css      # Tailwind v4 entry, theme tokens, CopilotKit overrides
├── router/
│   └── index.tsx        # createBrowserRouter — single "/" route rendering Root
├── pages/                # index.ts barrel; one folder per page, each with an index.tsx
│   └── Inbox/            # The (only, single-page) screen: AppHeader + the Chat/App tab panes
│       ├── index.tsx
│       └── AgentSync/    # Page-private: wires useSyncInbox/Threads/ComposeApproval
│           └── index.tsx
├── components/          # index.ts barrel; one folder per component, each with an index.tsx
│   ├── EmailInbox/      # Inbox shell + InboxList, FilterDialog, EmailDetail/ComposeForm
│   ├── EmailChat/       # The CopilotKit chat surface
│   ├── ChatPanel/       # The chat pane: threads sidebar + toolbar (model, key) + EmailChat
│   ├── AppHeader/       # Top bar above both tabs: AppLogo, theme toggle, ViewTabs
│   ├── AppLogo/         # Paper-plane mark + "AI Email Inbox" wordmark
│   ├── ViewTabs/        # The Chat/App tab switch (also the enable*Mode frontend tools)
│   ├── ThreadsList/     # The conversation list itself — shared by the two below
│   ├── ThreadsSidebar/  # Always-open list, chat tab only (≥ md)
│   ├── ThreadsMenu/     # The same list behind a clock button, for the app tab
│   ├── openAIKey/       # BYOK — key form, chat gate card, change-key button
│   ├── ModelPicker/     # Chat-model dropdown (GPT-4o mini/4o/4.1 mini/4.1)
│   ├── ToolRendering/   # Tool-call reasoning renderer
│   ├── common/          # Primitives: Badge, Button, Card, Dialog, DropdownMenu, Field, Spinner, Toast
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
├── stores/              # zustand — client-only state (theme, view mode, OpenAI key, chat model, compose approval)
├── lib/
│   ├── queryClient.ts   # One QueryClient, one error log point
│   ├── errors.ts        # ApiError — normalizes axios failures for the toast/log path
│   └── logger.ts        # Browser JSON logger, same shape as the agent's
├── utils/               # Pure helpers, re-exported from index.ts
│   ├── cn.ts            # clsx + tailwind-merge
│   ├── emailFilters.ts  # Filter predicates for the inbox list
│   ├── formatDate.ts
│   └── parseResult.ts   # Safe JSON.parse of a tool result
├── constants/           # One file per facet (tone, topic, urgency, status, course, workType, errors)
├── stories/             # Storybook-only support: fixtures, providers, decorators
└── types/               # email, errors, tools
.storybook/              # Storybook config: main.ts, preview.tsx, preview.css
scripts/                 # deploy-storybook.mjs
public/                  # Static assets (kebab-case, by rule)
```

## Storybook

`pnpm storybook` opens the workshop on :6006. Every component has a `*.stories.tsx` beside its
`index.tsx` (`common/Button/Button.stories.tsx`), grouped by title: `Common/`, `Inbox/`, `Chat/`,
`Tool cards/`, `Generative UI/`, `Declarative UI/`, `OpenAI key/`, `Chrome/`.

Stories run against the app's real providers, no mock layer: `src/stories/StoryProviders.tsx`
gives each story a fresh QueryClient with the inbox pre-seeded from `src/stories/fixtures.ts`
(so `useEmailLookup` and the tool cards resolve ids offline) plus a `MemoryRouter`.
`withQueryData(seed)` from `src/stories/decorators.tsx` seeds any other query — that's how the
knowledge-base pane renders without a request. The zustand stores are the real ones, so a story
can just `useOpenAIKey.setState(...)` in `beforeEach`. Light/dark comes from the toolbar's theme
switch, which puts `.dark` on `<html>` exactly like `useSyncTheme` does.

Eight components call CopilotKit hooks and need the agent running (`pnpm dev:agent`) to do more
than render their chrome — `EmailInbox`, `EmailChat`, `ChatPanel`, `AppHeader`, `ViewTabs`,
`ThreadsList`, `ThreadsSidebar`, `ThreadsMenu`. They carry
the `withCopilotRuntime` decorator, and `src/stories/RuntimeBoundary.tsx` catches the mount
error to say so instead of showing a crash overlay. The A2UI renderers in
`declarativeGenerativeUI/renderers.tsx` have no stories: they're driven by the A2UI runtime, not
props — only `ActionButton`, which is a plain component, has one.

## Stack

| Package                                                | Version  | Role                                       |
| ------------------------------------------------------ | -------- | ------------------------------------------ |
| Vite                                                   | ^7       | Dev server + build                         |
| React / React DOM                                      | ^19.2.4  | UI                                         |
| TypeScript                                             | ^5       | `tsc --noEmit` via `pnpm typecheck`        |
| Tailwind CSS + `@tailwindcss/vite`                     | ^4       | Styling (CSS-first config in globals.css)  |
| `@copilotkit/react-core` (v2)                          | 1.62.3   | Chat, agent state, interrupts              |
| `@copilotkit/a2ui-renderer`                            | 1.62.3   | Declarative generative UI catalog          |
| `@tanstack/react-query`                                | ^5.101.4 | All server state                           |
| `react-router-dom`                                     | ^7.18.3  | Single route — keeps selected email in URL |
| `zustand`                                              | ^5.0.15  | Client-only state                          |
| `axios`                                                | ^1.19.0  | The single API client                      |
| Radix UI (`dialog`, `dropdown-menu`)                   | ^1.1–2.1 | Accessible primitives                      |
| `lucide-react`                                         | ^0.577.0 | Icons                                      |
| `recharts`                                             | ^3.7.0   | Charts in generative UI                    |
| `date-fns`                                             | ^4.4.0   | Relative timestamps                        |
| `class-variance-authority` / `clsx` / `tailwind-merge` | —        | Variant + class composition                |
| `zod`                                                  | ^3.23.8  | Shared schemas with the agent's tool args  |
| `storybook` + `@storybook/react-vite`                  | ^10.6.0  | Component workshop (`pnpm storybook`)      |
