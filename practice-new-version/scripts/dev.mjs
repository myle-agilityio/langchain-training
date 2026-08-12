#!/usr/bin/env node
// Runs the UI and agent dev servers together. Not using turbo here: on this
// Windows setup turbo's process spawning hangs the agent's nested
// tsx-watch/worker child tree indefinitely (silent — banner prints, no bind,
// no error), reproduced with turbo alone and independent of npm/npx/pnpm
// layering. Plain child_process avoids that nesting.
import { spawn, spawnSync } from "node:child_process";

spawnSync(process.execPath, ["scripts/copilotkit-dev-infra.mjs"], { stdio: "inherit" });

const tasks = {
  ui: "vite",
  agent: "npm run dev --prefix agent",
};

const env = process.argv.includes("--debug")
  ? { ...process.env, LOG_LEVEL: "debug" }
  : process.env;

let shuttingDown = false;
const children = Object.entries(tasks).map(([name, command]) => {
  const child = spawn(command, { shell: true, stdio: "inherit", env });
  child.on("exit", (code) => {
    if (shuttingDown) return;
    console.log(`[${name}] exited (${code}) — stopping the other server`);
    shutdown(code ?? 1);
  });
  return child;
});

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
