import { createMiddleware } from "hono/factory";

import { logInfo } from "@/logging";
import type { AppEnv } from "../types";

// One correlation id per request, echoed to the client on failures and carried by every log
// line the request produces.
export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  const requestId = crypto.randomUUID();

  c.set("requestId", requestId);
  c.header("x-request-id", requestId);

  const startedAt = Date.now();

  try {
    await next();
  } finally {
    // finally, so a request that throws still leaves a timing line next to its error entry.
    logInfo("http.request", {
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    });
  }
});
