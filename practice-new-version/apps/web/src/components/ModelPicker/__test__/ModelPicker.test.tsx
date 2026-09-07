import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL_ID } from "@repo/constants";
import { useChatModel } from "@/stores";
import { ModelPicker } from "..";

const open = async () => {
  render(<ModelPicker />);
  await userEvent.click(
    screen.getByRole("button", { name: "Choose chat model" }),
  );
};

beforeEach(() => {
  useChatModel.setState({ modelId: DEFAULT_CHAT_MODEL_ID });
});

describe("ModelPicker", () => {
  it("offers every model the agent will accept", async () => {
    await open();

    for (const option of CHAT_MODEL_OPTIONS) {
      expect(await screen.findByText(option.label)).toBeInTheDocument();
    }
  });

  it("stores the model the teacher picked", async () => {
    await open();
    await userEvent.click(await screen.findByText(CHAT_MODEL_OPTIONS[2].label));

    expect(useChatModel.getState().modelId).toBe(CHAT_MODEL_OPTIONS[2].id);
  });

  it("ticks only the current pick", async () => {
    useChatModel.setState({ modelId: CHAT_MODEL_OPTIONS[1].id });
    await open();

    const ticked = (label: string) =>
      screen
        .getByText(label)
        .querySelector("svg")
        ?.classList.contains("opacity-100");

    expect(ticked(CHAT_MODEL_OPTIONS[1].label)).toBe(true);
    expect(ticked(CHAT_MODEL_OPTIONS[0].label)).toBe(false);
  });
});
