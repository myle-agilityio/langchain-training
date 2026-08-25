import axios from "axios";

import { ApiError } from "@/lib/errors";
import { ERROR_CODE } from "@/types";

// Every request to the agent's HTTP app goes through this instance: JSON in, JSON out, and one
// ApiError for the query client to log and toast.
export const apiClient = axios.create({
  headers: { "Content-Type": "application/json" },
});

interface ErrorBody {
  error?: { code?: string; message?: string; requestId?: string };
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      throw error;
    }

    const method = error.config?.method?.toUpperCase() ?? "GET";
    const path = error.config?.url ?? "";
    const status = error.response?.status;
    const body = error.response?.data as ErrorBody | undefined;
    // No response at all means we never reached the agent — a different thing to tell the user.
    const code =
      body?.error?.code ?? (status ? ERROR_CODE.INTERNAL : ERROR_CODE.NETWORK);

    throw new ApiError(
      code,
      `${method} ${path} failed (${status ?? error.code ?? "network error"})`,
      status,
      body?.error?.requestId,
    );
  },
);
