import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useOpenAIKey } from "@/stores";
import { KeyForm } from "..";

const NOT_A_KEY = /doesn't look like an OpenAI key/i;

const typeKey = async (value: string) => {
  await userEvent.type(screen.getByPlaceholderText("sk-..."), value);
};

const submit = async () => {
  await userEvent.click(screen.getByRole("button", { name: "Save key" }));
};

beforeEach(() => {
  useOpenAIKey.setState({ apiKey: null });
});

describe("KeyForm", () => {
  it("keeps submit disabled until something is typed", async () => {
    render(<KeyForm submitLabel="Save key" />);

    expect(screen.getByRole("button", { name: "Save key" })).toBeDisabled();

    await typeKey("sk-abc");

    expect(screen.getByRole("button", { name: "Save key" })).toBeEnabled();
  });

  it("rejects a key that is not an OpenAI one, without saving it", async () => {
    const onSaved = vi.fn();

    render(<KeyForm submitLabel="Save key" onSaved={onSaved} />);
    await typeKey("hunter2");
    await submit();

    expect(await screen.findByText(NOT_A_KEY)).toBeInTheDocument();
    expect(useOpenAIKey.getState().apiKey).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("clears the complaint as soon as the teacher edits the field", async () => {
    render(<KeyForm submitLabel="Save key" />);
    await typeKey("hunter2");
    await submit();

    expect(screen.getByText(NOT_A_KEY)).toBeInTheDocument();

    await typeKey("x");

    expect(screen.queryByText(NOT_A_KEY)).not.toBeInTheDocument();
  });

  it("saves a valid key, trimmed, and tells the caller", async () => {
    const onSaved = vi.fn();

    render(<KeyForm submitLabel="Save key" onSaved={onSaved} />);
    await typeKey("  sk-teacher-key  ");
    await submit();

    expect(useOpenAIKey.getState().apiKey).toBe("sk-teacher-key");
    expect(onSaved).toHaveBeenCalledOnce();
  });

  it("empties the field after a successful save", async () => {
    render(<KeyForm submitLabel="Save key" />);
    await typeKey("sk-teacher-key");
    await submit();

    expect(screen.getByPlaceholderText("sk-...")).toHaveValue("");
  });

  it("uses the label the caller asked for", () => {
    render(<KeyForm submitLabel="Save and start chatting" />);

    expect(
      screen.getByRole("button", { name: "Save and start chatting" }),
    ).toBeInTheDocument();
  });
});
