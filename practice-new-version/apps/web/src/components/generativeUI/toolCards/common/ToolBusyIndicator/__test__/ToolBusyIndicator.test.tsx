import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useComposeApproval } from "@/stores";
import { ToolBusyIndicator } from "..";

const indicator = (container: HTMLElement) =>
  container.firstElementChild as HTMLElement;

beforeEach(() => {
  useComposeApproval.setState({ awaitingApproval: false });
});

describe("ToolBusyIndicator", () => {
  it("spins while the agent is actually working", () => {
    const { container } = render(<ToolBusyIndicator />);

    expect(indicator(container)).toHaveClass("animate-spin");
  });

  it("waits quietly instead, once a card needs the teacher", () => {
    useComposeApproval.setState({ awaitingApproval: true });

    const { container } = render(<ToolBusyIndicator />);

    expect(indicator(container)).toHaveClass("pulsing-dot");
    expect(indicator(container)).not.toHaveClass("animate-spin");
  });
});
