import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { optimisticContext, rollback } from "@/lib";

const key = ["emails"] as const;

let queryClient: QueryClient;

beforeEach(() => {
  queryClient = new QueryClient();
});

describe("optimisticContext", () => {
  it("cancels in-flight fetches so a late response cannot overwrite the guess", async () => {
    const cancel = vi.spyOn(queryClient, "cancelQueries");

    await optimisticContext<string[]>(queryClient, key, () => ["b"]);

    expect(cancel).toHaveBeenCalledWith({ queryKey: key });
  });

  it("snapshots what was there and writes the update", async () => {
    queryClient.setQueryData(key, ["a"]);

    const context = await optimisticContext<string[]>(
      queryClient,
      key,
      (old) => [...(old ?? []), "b"],
    );

    expect(context.previous).toEqual(["a"]);
    expect(queryClient.getQueryData(key)).toEqual(["a", "b"]);
  });

  it("snapshots undefined when the cache was empty", async () => {
    const context = await optimisticContext<string[]>(queryClient, key, () => [
      "b",
    ]);

    expect(context.previous).toBeUndefined();
  });
});

describe("rollback", () => {
  it("puts back exactly what was snapshotted", () => {
    queryClient.setQueryData(key, ["guess"]);

    rollback(queryClient, key, { previous: ["a"] });

    expect(queryClient.getQueryData(key)).toEqual(["a"]);
  });

  // Asserted as "no write happens": setQueryData already ignores an undefined value, so the
  // guard's effect is invisible through the cache itself.
  it("writes nothing at all when there was nothing to restore", () => {
    queryClient.setQueryData(key, ["guess"]);

    const write = vi.spyOn(queryClient, "setQueryData");

    rollback(queryClient, key, { previous: undefined });
    rollback(queryClient, key, undefined);

    expect(write).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(key)).toEqual(["guess"]);
  });
});
