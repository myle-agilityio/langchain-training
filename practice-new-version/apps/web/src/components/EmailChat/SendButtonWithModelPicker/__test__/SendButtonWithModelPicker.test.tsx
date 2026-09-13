import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SendButtonWithModelPicker } from "..";

describe("SendButtonWithModelPicker", () => {
  it("shows the model picker next to the send button", () => {
    render(<SendButtonWithModelPicker onClick={() => {}} />);

    expect(
      screen.getByRole("button", { name: "Choose chat model" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("copilot-send-button")).toBeInTheDocument();
  });

  it("forwards the click through to the send button", async () => {
    const onClick = vi.fn();

    render(<SendButtonWithModelPicker onClick={onClick} />);

    await userEvent.click(screen.getByTestId("copilot-send-button"));

    expect(onClick).toHaveBeenCalledOnce();
  });

  it("disables only the send button, not the model picker", () => {
    render(<SendButtonWithModelPicker onClick={() => {}} disabled />);

    expect(screen.getByTestId("copilot-send-button")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Choose chat model" }),
    ).not.toBeDisabled();
  });
});
