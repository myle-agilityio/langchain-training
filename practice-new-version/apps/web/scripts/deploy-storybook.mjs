// Deploys the static Storybook to its own Vercel project. Kept as a script because each run has
// to re-link (the build wipes .vercel) and drop the token file the linker leaves behind.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT = "practice-storybook";
const ALIAS = "practice-storybook.vercel.app";
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(webDir, "storybook-static");

const run = (args, options = {}) =>
  execFileSync("vercel", args, {
    cwd: outDir,
    shell: true,
    encoding: "utf8",
    ...options,
  });

execFileSync("pnpm", ["--filter", "web", "build-storybook"], {
  cwd: webDir,
  shell: true,
  stdio: "inherit",
});

run(["link", "--yes", "--project", PROJECT], { stdio: "inherit" });

// The linker drops an OIDC token here, and everything in this folder gets uploaded.
rmSync(path.join(outDir, ".env.local"), { force: true });

// The project domain follows the latest production deployment on its own.
run(["deploy", "--prod", "--yes"], { stdio: "inherit" });

console.log(`\nStorybook is live at https://${ALIAS}`);
