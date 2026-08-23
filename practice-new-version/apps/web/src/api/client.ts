import axios from "axios";

// Every request to the agent's HTTP app goes through this instance: JSON in, JSON out, and one
// "METHOD /path failed (status)" error for the query client to log.
export const apiClient = axios.create({
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) throw error;
    const method = error.config?.method?.toUpperCase() ?? "GET";
    const path = error.config?.url ?? "";
    const status = error.response?.status ?? error.code ?? "network error";
    throw new Error(`${method} ${path} failed (${status})`);
  },
);
