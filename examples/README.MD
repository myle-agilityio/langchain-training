# LangChain Training

A hands-on TypeScript project for learning LangChain and LangGraph concepts.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or later
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

## Setup

1. **Install dependencies**

   ```bash
   cd examples
   pnpm install
   ```

2. **Configure environment variables**

   Create a `.env` file inside the `src/` directory:

   ```bash
   cp .env.example .env   # or create it manually
   ```

   Add your OPENAI API key and MODEL:

   ```env
   OPENAI_API_KEY=sk-...
   MODEL=
   ```

## Running examples

All commands must be run from the `examples/` directory.

### Basic agent

```bash
pnpm tsx basic/basic-agent.ts
```

### Exercise: Read AI news

```bash
pnpm tsx read-ai-news
```

### Exercise: Product warranty

```bash
pnpm tsx product-warranty
```

### Example: Calculator agent

```bash
pnpm tsx calculator-agent
```

### Exercise: Read and Reply email

```bash
pnpm tsx read-and-reply-email
```

## Project structure

```
src/
├── basic/
│   ├── basic-agent.ts      # Minimal agent with a weather tool
│   └── real-world-agent.ts
├── calculator-agent
│   └── index.ts
├── product-warranty
│   └── index.ts
├── read-ai-news/
│   └── index.ts
├── .env                    # API keys (not committed)
├── package.json
└── tsconfig.json
```

## Key dependencies

| Package | Purpose |
|---|---|
| `langchain` | High-level agent and chain APIs |
| `@langchain/openai` | OpenAI model integration |
| `@langchain/anthropic` | Anthropic model integration |
| `@langchain/langgraph` | Stateful multi-step graph agents |
| `zod` | Schema validation for tool inputs |
| `dotenv` | Loads `.env` into `process.env` |
