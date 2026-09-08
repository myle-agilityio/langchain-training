import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ComposeForm } from "..";

const draw = () => {
  const onSend = vi.fn();
  const onCancel = vi.fn();

  render(
    <ComposeForm
      initialSubject="Re: Missed test Monday"
      onSend={onSend}
      onCancel={onCancel}
    />,
  );

  return { onSend, onCancel };
};

const send = () => screen.getByRole("button", { name: "Send" });
const body = () => screen.getByPlaceholderText("Write your reply…");

describe("ComposeForm", () => {
  it("starts from the Re: subject the caller supplied, with an empty body", () => {
    draw();

    expect(
      screen.getByDisplayValue("Re: Missed test Monday"),
    ).toBeInTheDocument();
    expect(body()).toHaveValue("");
  });

  it("refuses to send until both fields have something in them", async () => {
    draw();

    expect(send()).toBeDisabled();

    await userEvent.type(body(), "Wednesday works.");

    expect(send()).toBeEnabled();
  });

  it("treats whitespace as empty", async () => {
    draw();

    await userEvent.type(body(), "    ");

    expect(send()).toBeDisabled();
  });

  it("sends both fields trimmed", async () => {
    const { onSend } = draw();

    await userEvent.clear(screen.getByPlaceholderText("Subject"));
    await userEvent.type(
      screen.getByPlaceholderText("Subject"),
      "  Re: quiz  ",
    );
    await userEvent.type(body(), "  Wednesday works.  ");
    await userEvent.click(send());

    expect(onSend).toHaveBeenCalledWith("Re: quiz", "Wednesday works.");
  });

  it("backs out without sending", async () => {
    const { onSend, onCancel } = draw();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onSend).not.toHaveBeenCalled();
  });
});
