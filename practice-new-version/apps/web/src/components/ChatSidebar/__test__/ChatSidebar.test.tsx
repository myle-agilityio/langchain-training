import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ChatSidebar } from "..";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useFrontendTool: vi.fn(),
}));

const draw = (collapsed = false) => {
  const onCollapsedChange = vi.fn();

  render(
    <ChatSidebar
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      threadsMenu={<button type="button">History</button>}
    >
      <div data-testid="chat" />
    </ChatSidebar>,
  );

  return { onCollapsedChange };
};

const runTool = (name: string) => {
  const definition = vi
    .mocked(useFrontendTool)
    .mock.calls.map((call) => call[0])
    .findLast((candidate) => candidate.name === name);

  return (definition?.handler as () => Promise<unknown>)();
};

const handle = () => screen.getByRole("separator");

beforeEach(() => {
  vi.clearAllMocks();
  document.body.className = "";
});

describe("ChatSidebar", () => {
  it("renders the chat, its toolbar and the menu it was handed", () => {
    draw();

    expect(screen.getByTestId("chat")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Choose chat model" }),
    ).toBeInTheDocument();
  });

  it("collapses on the panel button", async () => {
    const { onCollapsedChange } = draw();

    await userEvent.click(
      screen.getByRole("button", { name: "Collapse chat" }),
    );

    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });

  it("hides the resize handle once collapsed", () => {
    draw(true);

    expect(screen.queryByRole("separator")).not.toBeInTheDocument();
  });

  it("describes the resize handle to assistive tech", () => {
    draw();

    expect(handle()).toHaveAttribute("aria-valuenow", "420");
    expect(handle()).toHaveAttribute("aria-valuemin", "320");
    expect(handle()).toHaveAttribute("aria-valuemax", "640");
  });

  it("widens on ArrowLeft and narrows on ArrowRight", async () => {
    draw();
    handle().focus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(handle()).toHaveAttribute("aria-valuenow", "444");

    await userEvent.keyboard("{ArrowRight}");
    expect(handle()).toHaveAttribute("aria-valuenow", "420");
  });

  it("never narrows past the minimum, however long the key is held", async () => {
    draw();
    handle().focus();

    for (let i = 0; i < 12; i += 1) {
      await userEvent.keyboard("{ArrowRight}");
    }

    expect(handle()).toHaveAttribute("aria-valuenow", "320");
  });

  it("resets to the default width on a double click", async () => {
    draw();
    handle().focus();

    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.dblClick(handle());

    expect(handle()).toHaveAttribute("aria-valuenow", "420");
  });

  it("lets the agent open and collapse the panel itself", async () => {
    const { onCollapsedChange } = draw();

    await runTool("enableChatMode");
    expect(onCollapsedChange).toHaveBeenCalledWith(false);

    await runTool("enableAppMode");
    expect(onCollapsedChange).toHaveBeenCalledWith(true);
  });
});
