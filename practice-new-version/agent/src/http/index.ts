import { Hono } from "hono";
import { copilotkitApp } from "./copilotkit";
import { emailsApp } from "./emails";
import { threadsApp } from "./threads";

// Mounted onto the langgraphjs dev server via langgraph.json's "http.app" — merges with the
// built-in graph/assistants/threads/runs routes rather than replacing them.
const app = new Hono();

app.route("/", copilotkitApp);
app.route("/api/emails", emailsApp);
app.route("/api/threads", threadsApp);

export { app };
