import type { Context, ErrorHandler, NotFoundHandler } from "hono";

import { AppError, ERROR_CODE } from "@/errors/index";
import { logError } from "@/logging/index";
import type { AppEnv } from "../types";

const body = (c: Context<AppEnv>, error: AppError) => ({
  error: {
    code: error.code,
    // Never the raw message: unexpected errors describe themselves as the generic line.
    message: error.userMessage,
    requestId: c.get("requestId"),
  },
});

// The single exit for every failed request — routes throw, this logs once and answers safely.
export const errorHandler: ErrorHandler<AppEnv> = (error, c) => {
  const appError = logError(error, {
    requestId: c.get("requestId"),
    method: c.req.method,
    path: c.req.path,
  });

  return c.json(body(c, appError), appError.status as 400);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) => {
  const appError = new AppError(ERROR_CODE.NOT_FOUND);

  return c.json(body(c, appError), 404);
};
