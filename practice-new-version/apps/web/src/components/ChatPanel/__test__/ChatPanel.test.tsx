import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ChatPanel } from "..";

vi.mock("@/components/EmailChat", () => ({ EmailChat: () => <div /> }));

// Stands in for the real, CopilotKit-backed ThreadsSidebar so this file can test ChatPanel's own
// open/collapse wiring without needing a chat runtime — capture the props it's given instead.
const sidebarProps = vi.hoisted(() => ({
  current: {} as { open: boolean; onCollapse: () => void },
}));

vi.mock("@/components/ThreadsSidebar", () => ({
  ThreadsSidebar: (props: { open: boolean; onCollapse: () => void }) => {
    sidebarProps.current = props;

    return <div data-testid="threads-sidebar" />;
  },
}));

type Trigger = (width: number) => void;

let triggers: Trigger[];

class FakeResizeObserver {
  constructor(private callback: ResizeObserverCallback) {
    triggers.push((width) =>
      this.callback(
        [{ contentRect: { width } } as ResizeObserverEntry],
        this as unknown as ResizeObserver,
      ),
    );
  }

  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  triggers = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// The callback fires setState outside of a React-controlled event, so the effect needs act()
// to force the flush before the next assertion reads it.
const resize = (width: number) => act(() => triggers.at(-1)?.(width));

const expandButton = () =>
  screen.queryByRole("button", { name: "Expand conversation history" });

describe("ChatPanel", () => {
  it("starts with the sidebar open and no expand button", () => {
    render(<ChatPanel />);

    expect(sidebarProps.current.open).toBe(true);
    expect(expandButton()).not.toBeInTheDocument();
  });

  it("auto-collapses the sidebar once the pane narrows below 1100", () => {
    render(<ChatPanel />);

    resize(900);

    expect(sidebarProps.current.open).toBe(false);
    expect(expandButton()).toBeInTheDocument();
  });

  it("auto-reopens once the pane widens back to 1100 or more", () => {
    render(<ChatPanel />);

    resize(900);
    resize(1200);

    expect(sidebarProps.current.open).toBe(true);
    expect(expandButton()).not.toBeInTheDocument();
  });

  it("does not fight a manual toggle while the pane stays on the same side", async () => {
    render(<ChatPanel />);

    resize(900);
    await userEvent.click(expandButton()!);
    resize(950);

    expect(sidebarProps.current.open).toBe(true);
  });

  it("re-collapses once the pane actually crosses back below 1100", () => {
    render(<ChatPanel />);

    resize(900);
    resize(1200);
    resize(900);

    expect(sidebarProps.current.open).toBe(false);
  });

  it("disconnects the observer on unmount", () => {
    const disconnect = vi.spyOn(FakeResizeObserver.prototype, "disconnect");
    const { unmount } = render(<ChatPanel />);

    unmount();

    expect(disconnect).toHaveBeenCalledOnce();
  });
});
