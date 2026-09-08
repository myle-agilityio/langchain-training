import { act, render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useToast, type Toast } from "@/stores";
import { ToastRow } from "..";

const toast = (overrides: Partial<Toast> = {}): Toast => ({
  id: "t1",
  tone: "error",
  message: "Rate limited by OpenAI.",
  ...overrides,
});

beforeEach(() => {
  useToast.setState({ toasts: [toast()] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ToastRow", () => {
  it("announces the message to assistive tech", () => {
    render(<ToastRow toast={toast()} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Rate limited by OpenAI.",
    );
  });

  it("colours an error differently from an informational note", () => {
    const { container } = render(<ToastRow toast={toast()} />);

    expect(container.querySelector('[role="status"]')).toHaveClass(
      "text-tone-red",
    );

    const info = render(<ToastRow toast={toast({ id: "t2", tone: "info" })} />);

    expect(info.container.querySelector('[role="status"]')).not.toHaveClass(
      "text-tone-red",
    );
  });

  it("dismisses itself from the store when closed by hand", () => {
    render(<ToastRow toast={toast()} />);

    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(useToast.getState().toasts).toHaveLength(0);
  });

  it("dismisses itself after six seconds", () => {
    vi.useFakeTimers();
    render(<ToastRow toast={toast()} />);

    expect(useToast.getState().toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(useToast.getState().toasts).toHaveLength(0);
  });

  it("cancels its timer when unmounted early", () => {
    vi.useFakeTimers();

    const { unmount } = render(<ToastRow toast={toast()} />);

    unmount();

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(useToast.getState().toasts).toHaveLength(1);
  });
});
