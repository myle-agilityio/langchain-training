import { beforeEach, describe, expect, it } from "vitest";

import { toast, useToast } from "@/stores";

const messages = () => useToast.getState().toasts.map((t) => t.message);

beforeEach(() => {
  useToast.setState({ toasts: [] });
});

describe("useToast", () => {
  it("keeps one entry per distinct message", () => {
    toast.error("Rate limited by OpenAI.");
    toast.error("Rate limited by OpenAI.");
    toast.error("Rate limited by OpenAI.");

    expect(messages()).toEqual(["Rate limited by OpenAI."]);
  });

  it("caps the stack, dropping the oldest so a burst cannot bury the app", () => {
    toast.error("one");
    toast.error("two");
    toast.error("three");
    toast.error("four");

    expect(messages()).toEqual(["two", "three", "four"]);
  });

  it("tags the tone the caller asked for and gives each toast an id", () => {
    toast.error("bad");
    toast.info("fyi");

    const [first, second] = useToast.getState().toasts;

    expect(first.tone).toBe("error");
    expect(second.tone).toBe("info");
    expect(first.id).not.toBe(second.id);
  });

  it("dismisses only the toast asked for", () => {
    toast.error("one");
    toast.error("two");

    useToast.getState().dismiss(useToast.getState().toasts[0].id);

    expect(messages()).toEqual(["two"]);
  });
});
