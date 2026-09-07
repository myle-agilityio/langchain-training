import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useLoadMoreSentinel } from "../useLoadMoreSentinel";

type Trigger = (isIntersecting: boolean) => void;

let triggers: Trigger[];
let disconnects: number;
let observed: Element[];

class FakeIntersectionObserver {
  constructor(private callback: IntersectionObserverCallback) {
    triggers.push((isIntersecting) =>
      this.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      ),
    );
  }

  observe(element: Element) {
    observed.push(element);
  }

  disconnect() {
    disconnects += 1;
  }

  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

beforeEach(() => {
  triggers = [];
  disconnects = 0;
  observed = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const attach = (hasMore: boolean, onLoadMore: () => void) => {
  const { result, rerender, unmount } = renderHook(
    ({ more }: { more: boolean }) => useLoadMoreSentinel(more, onLoadMore),
    { initialProps: { more: hasMore } },
  );
  const node = document.createElement("div");

  return {
    // The callback ref sets state, so the effect only runs once React has flushed.
    attachNode: () => act(() => result.current(node)),
    node,
    rerender,
    unmount,
  };
};

describe("useLoadMoreSentinel", () => {
  it("observes nothing until the sentinel element actually mounts", () => {
    attach(true, vi.fn());

    expect(observed).toHaveLength(0);
  });

  it("starts observing when the node attaches late, after hasMore is already true", () => {
    const { attachNode, node } = attach(true, vi.fn());

    attachNode();

    expect(observed).toEqual([node]);
  });

  it("loads more once the sentinel scrolls into view", () => {
    const onLoadMore = vi.fn();
    const { attachNode } = attach(true, onLoadMore);

    attachNode();
    triggers.at(-1)?.(true);

    expect(onLoadMore).toHaveBeenCalledOnce();
  });

  it("ignores the observer firing for an element leaving view", () => {
    const onLoadMore = vi.fn();
    const { attachNode } = attach(true, onLoadMore);

    attachNode();
    triggers.at(-1)?.(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not observe at all once there is nothing more to load", () => {
    const { attachNode } = attach(false, vi.fn());

    attachNode();

    expect(observed).toHaveLength(0);
  });

  it("disconnects when the list unmounts", () => {
    const { attachNode, unmount } = attach(true, vi.fn());

    attachNode();
    unmount();

    expect(disconnects).toBeGreaterThan(0);
  });
});
