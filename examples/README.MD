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

   Add your API keys:

   ```env
   OPENAI_API_KEY=sk-...
   ```

## Running examples

All commands must be run from the `src/` directory.

### Basic agent

```bash
pnpm tsx basic/basic-agent.ts
```

## Project structure

```
src/
├── basic/
│   └── basic-agent.ts   # Minimal agent with a weather tool
├── .env                 # API keys (not committed)
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
