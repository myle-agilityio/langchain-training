import { createMiddleware } from "hono/factory";
import type { z } from "zod";

import { AppError, ERROR_CODE, toAppError } from "@/errors/index";
import type { AppEnv } from "../types";

type Source = "json" | "query";

// Parses the request against a schema and stores the result, so routes never touch req.json()
// or hand-write a 400. A parse failure becomes a VALIDATION_FAILED the error handler formats.
export const validate = <S extends z.ZodTypeAny>(source: Source, schema: S) =>
  createMiddleware<AppEnv>(async (c, next) => {
    let raw: unknown;
    if (source === "json") {
      try {
        raw = await c.req.json();
      } catch {
        throw new AppError(ERROR_CODE.VALIDATION_FAILED, {
          detail: "body was not valid JSON",
        });
      }
    } else {
      raw = c.req.query();
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw toAppError(parsed.error);
    c.set("valid", parsed.data);
    await next();
  });
