// Builds the deployable test report: runs both suites with coverage, then assembles one static
// site (landing page + each app's coverage HTML) under apps/web/test-report.
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const webDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoDir = path.resolve(webDir, "../..");
const outDir = path.join(webDir, "test-report");

const APPS = [
  { name: "agent", label: "Agent", dir: path.join(repoDir, "apps/agent") },
  { name: "web", label: "Web", dir: webDir },
];

// --reporter twice: the JSON one for the pass/fail counts below, the default one for the console.
const runSuite = (app) => {
  const resultsFile = path.join(app.dir, "coverage", "results.json");

  execFileSync(
    "npx",
    [
      "vitest",
      "run",
      "--coverage",
      "--reporter=default",
      "--reporter=json",
      `--outputFile=${resultsFile}`,
    ],
    { cwd: app.dir, shell: true, stdio: "inherit" },
  );

  return resultsFile;
};

const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

const pct = (value) => `${value.toFixed(1)}%`;

const summarize = (app, resultsFile) => {
  const results = readJson(resultsFile);
  const coverage = readJson(
    path.join(app.dir, "coverage", "coverage-summary.json"),
  ).total;

  // Read before the copy below, then dropped — the raw results have no place in the deployed site.
  rmSync(resultsFile, { force: true });

  return {
    ...app,
    tests: results.numTotalTests,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    files: results.testResults.length,
    statements: coverage.statements.pct,
    branches: coverage.branches.pct,
    functions: coverage.functions.pct,
    lines: coverage.lines.pct,
  };
};

const card = (app) => `
      <a class="card" href="./${app.name}/index.html">
        <div class="card-head">
          <h2>${app.label}</h2>
          <span class="badge ${app.failed ? "bad" : "good"}">
            ${app.failed ? `${app.failed} failing` : "all passing"}
          </span>
        </div>
        <p class="count"><strong>${app.passed}</strong> tests in ${app.files} files</p>
        <dl>
          <div><dt>Statements</dt><dd>${pct(app.statements)}</dd></div>
          <div><dt>Branches</dt><dd>${pct(app.branches)}</dd></div>
          <div><dt>Functions</dt><dd>${pct(app.functions)}</dd></div>
          <div><dt>Lines</dt><dd>${pct(app.lines)}</dd></div>
        </dl>
        <span class="more">Open coverage report &rarr;</span>
      </a>`;

const page = (apps, generatedAt) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Test report — AI Email Assistant</title>
<style>
  :root {
    color-scheme: light dark;
    --bg: #f6f6f7; --panel: #fff; --fg: #18181b; --muted: #71717a;
    --border: #e4e4e7; --good: #16794a; --bad: #b4232c; --accent: #6d5ce7;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #101013; --panel: #18181c; --fg: #f4f4f5; --muted: #a1a1aa;
      --border: #2a2a31; --good: #4ade80; --bad: #f87171; --accent: #a99bff;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 48px 24px; background: var(--bg); color: var(--fg);
    font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 780px; margin: 0 auto; }
  h1 { margin: 0 0 6px; font-size: 26px; letter-spacing: -0.02em; }
  .sub { margin: 0 0 32px; color: var(--muted); font-size: 14px; }
  .cards { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  .card {
    display: block; padding: 20px 22px; background: var(--panel); color: inherit;
    border: 1px solid var(--border); border-radius: 14px; text-decoration: none;
    transition: border-color .15s ease, transform .15s ease;
  }
  .card:hover { border-color: var(--accent); transform: translateY(-2px); }
  .card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  h2 { margin: 0; font-size: 17px; }
  .badge { font-size: 12px; font-weight: 600; padding: 2px 9px; border-radius: 999px; }
  .badge.good { color: var(--good); background: color-mix(in srgb, var(--good) 14%, transparent); }
  .badge.bad { color: var(--bad); background: color-mix(in srgb, var(--bad) 14%, transparent); }
  .count { margin: 10px 0 16px; color: var(--muted); font-size: 14px; }
  .count strong { color: var(--fg); font-size: 20px; }
  dl { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 18px; margin: 0 0 16px; }
  dl div { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px dashed var(--border); padding-bottom: 5px; }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; font-variant-numeric: tabular-nums; font-weight: 600; font-size: 13px; }
  .more { font-size: 13px; font-weight: 600; color: var(--accent); }
  .note { margin-top: 32px; padding: 16px 18px; border: 1px solid var(--border);
          border-radius: 12px; background: var(--panel); color: var(--muted); font-size: 13px; }
  .note strong { color: var(--fg); }
  footer { margin-top: 28px; color: var(--muted); font-size: 12px; }
</style>
</head>
<body>
<main>
  <h1>Test report</h1>
  <p class="sub">AI Email Assistant — unit suites and coverage for both packages.</p>
  <div class="cards">${apps.map(card).join("")}
  </div>
  <p class="note">
    <strong>Coverage gaps are expected in the agent.</strong> Anything that calls a model —
    nodes, tools and routes reaching the chat model, structured output or embeddings — is
    covered by the eval suite (<code>pnpm eval:agent</code>), not by unit tests, so those files
    read as uncovered here by design.
  </p>
  <footer>Generated ${generatedAt}</footer>
</main>
</body>
</html>
`;

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const summaries = APPS.map((app) => summarize(app, runSuite(app)));

for (const app of summaries) {
  cpSync(path.join(app.dir, "coverage"), path.join(outDir, app.name), {
    recursive: true,
  });
}

writeFileSync(
  path.join(outDir, "index.html"),
  page(summaries, new Date().toISOString().replace("T", " ").slice(0, 16)),
);

const total = summaries.reduce((sum, app) => sum + app.passed, 0);

console.log(`\nTest report built in ${outDir} — ${total} passing tests.`);
