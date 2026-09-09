import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useViewMode } from "@/stores";
import { ViewTabs } from "..";

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useFrontendTool: vi.fn(),
}));

const runTool = (name: string) => {
  const definition = vi
    .mocked(useFrontendTool)
    .mock.calls.map((call) => call[0])
    .findLast((candidate) => candidate.name === name);

  return (definition?.handler as () => Promise<unknown>)();
};

const tab = (name: string) => screen.getByRole("tab", { name });

beforeEach(() => {
  vi.clearAllMocks();
  useViewMode.setState({ mode: "app" });
});

describe("ViewTabs", () => {
  it("marks the current tab selected", () => {
    render(<ViewTabs />);

    expect(tab("App")).toHaveAttribute("aria-selected", "true");
    expect(tab("Chat")).toHaveAttribute("aria-selected", "false");
  });

  it("switches the mode when a tab is clicked", async () => {
    render(<ViewTabs />);

    await userEvent.click(tab("Chat"));

    expect(useViewMode.getState().mode).toBe("chat");
    expect(tab("Chat")).toHaveAttribute("aria-selected", "true");
  });

  it("lets the agent switch tabs itself", async () => {
    render(<ViewTabs />);

    await runTool("enableChatMode");
    expect(useViewMode.getState().mode).toBe("chat");

    await runTool("enableAppMode");
    expect(useViewMode.getState().mode).toBe("app");
  });
});
