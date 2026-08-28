import { createMiddleware } from "hono/factory";

import { USER_ID_HEADER } from "@/constants";
import { AppError, ERROR_CODE } from "@/errors";
import type { AppEnv } from "../types";

// Every thread is scoped to the browser that created it — see apps/web's useUserId store.
export const requireUserId = createMiddleware<AppEnv>(async (c, next) => {
  const userId = c.req.header(USER_ID_HEADER);

  if (!userId) {
    throw new AppError(ERROR_CODE.VALIDATION_FAILED, {
      detail: `missing ${USER_ID_HEADER} header`,
    });
  }

  c.set("userId", userId);
  await next();
});
