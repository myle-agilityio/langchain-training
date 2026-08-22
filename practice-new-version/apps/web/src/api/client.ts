// Every request to the agent's HTTP app goes through here: JSON in, JSON out, and one
// "METHOD /path failed (status)" error for the query client to log.
export const apiFetch = async <T>(
  path: string,
  init: Omit<RequestInit, "body"> & { json?: unknown } = {},
): Promise<T> => {
  const { json, headers, method = "GET", ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    method,
    headers:
      json === undefined
        ? headers
        : { "Content-Type": "application/json", ...headers },
    body: json === undefined ? undefined : JSON.stringify(json),
  });
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status})`);
  return (await res.json()) as T;
};
