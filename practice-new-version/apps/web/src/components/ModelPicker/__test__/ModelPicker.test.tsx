import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { CHAT_MODEL_OPTIONS, DEFAULT_CHAT_MODEL_ID } from "@repo/constants";
import { useChatModel } from "@/stores";
import { ModelPicker } from "..";

const trigger = () => screen.getByRole("button", { name: "Choose chat model" });

// The trigger now shows the current model's label too, so once the menu is open the same
// text can appear twice (trigger + the matching item) — scope item lookups to the menu.
const open = async () => {
  render(<ModelPicker />);
  await userEvent.click(trigger());

  return within(await screen.findByRole("menu"));
};

beforeEach(() => {
  useChatModel.setState({ modelId: DEFAULT_CHAT_MODEL_ID });
});

describe("ModelPicker", () => {
  it("shows the current model on the trigger", () => {
    useChatModel.setState({ modelId: CHAT_MODEL_OPTIONS[2].id });
    render(<ModelPicker />);

    expect(trigger()).toHaveTextContent(CHAT_MODEL_OPTIONS[2].label);
  });

  it("offers every model the agent will accept", async () => {
    const menu = await open();

    for (const option of CHAT_MODEL_OPTIONS) {
      expect(await menu.findByText(option.label)).toBeInTheDocument();
    }
  });

  it("stores the model the teacher picked", async () => {
    const menu = await open();

    await userEvent.click(await menu.findByText(CHAT_MODEL_OPTIONS[2].label));

    expect(useChatModel.getState().modelId).toBe(CHAT_MODEL_OPTIONS[2].id);
  });

  it("ticks only the current pick", async () => {
    useChatModel.setState({ modelId: CHAT_MODEL_OPTIONS[1].id });
    const menu = await open();

    const ticked = (label: string) =>
      menu
        .getByText(label)
        .querySelector("svg")
        ?.classList.contains("opacity-100");

    expect(ticked(CHAT_MODEL_OPTIONS[1].label)).toBe(true);
    expect(ticked(CHAT_MODEL_OPTIONS[0].label)).toBe(false);
  });
});
