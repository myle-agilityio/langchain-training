import { Hono } from "hono";

import { copilotkitApp } from "./copilotkit";
import { emailsApp } from "./emails";
import { knowledgeApp } from "./knowledge";
import { errorHandler, notFoundHandler, requestContext } from "./middleware";
import { threadsApp } from "./threads";
import type { AppEnv } from "./types";

// Mounted onto the langgraphjs dev server via langgraph.json's "http.app" — merges with the
// built-in graph/assistants/threads/runs routes rather than replacing them.
const app = new Hono<AppEnv>();

// Correlation id + one request log line, before anything can throw.
app.use("*", requestContext);

app.route("/", copilotkitApp);
app.route("/api/emails", emailsApp);
app.route("/api/threads", threadsApp);
app.route("/api/knowledge", knowledgeApp);

// The single exit for every failure raised anywhere above.
app.onError(errorHandler);
app.notFound(notFoundHandler);

export { app };
