import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Testing Library only auto-cleans with globals:true — without this, renders pile up in the DOM.
afterEach(cleanup);

// jsdom has no IntersectionObserver, which useLoadMoreSentinel needs to exist to observe with.
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// jsdom has no ResizeObserver, which ChatPanel needs to exist to auto-collapse the sidebar.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}

// jsdom implements neither pointer-capture method; the resize handle calls both on drag.
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {};

  Element.prototype.releasePointerCapture = () => {};

  Element.prototype.hasPointerCapture = () => false;
}
