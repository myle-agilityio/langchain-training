import { Hono } from "hono";
import { copilotkitApp } from "./copilotkit.js";
import { emailsApp } from "./emails.js";
import { threadsApp } from "./threads.js";

// Mounted onto the langgraphjs dev server via langgraph.json's "http.app" — merges with the
// built-in graph/assistants/threads/runs routes rather than replacing them.
const app = new Hono();

app.route("/", copilotkitApp);
app.route("/api/emails", emailsApp);
app.route("/api/threads", threadsApp);

export { app };
