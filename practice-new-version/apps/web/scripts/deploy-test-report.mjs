// Deploys the static test report to its own Vercel project. Same shape as deploy-storybook.mjs:
// each run re-links (the build wipes .vercel) and drops the token file the linker leaves behind.
import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT = "practice-test-report";
const ALIAS = "practice-test-report.vercel.app";
const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(webDir, "test-report");

const run = (args, options = {}) =>
  execFileSync("vercel", args, {
    cwd: outDir,
    shell: true,
    encoding: "utf8",
    ...options,
  });

execFileSync("node", [path.join(webDir, "scripts/build-test-report.mjs")], {
  cwd: webDir,
  shell: true,
  stdio: "inherit",
});

run(["link", "--yes", "--project", PROJECT], { stdio: "inherit" });

// The linker drops an OIDC token here, and everything in this folder gets uploaded.
rmSync(path.join(outDir, ".env.local"), { force: true });

// The project domain follows the latest production deployment on its own.
run(["deploy", "--prod", "--yes"], { stdio: "inherit" });

console.log(`\nTest report is live at https://${ALIAS}`);
