FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME/bin:$PATH"
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate

# Build context is the repo root (see render.yaml) so this stage can see the
# workspace's pnpm-lock.yaml, not just the agent/ package.
FROM base AS build
WORKDIR /usr/src/app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm deploy --filter=agent --prod --legacy /prod/agent

FROM base
WORKDIR /app
COPY --from=build /prod/agent .
ENV NODE_ENV=production
CMD ["pnpm", "start"]
