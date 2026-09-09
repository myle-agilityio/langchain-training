import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SplitDivider } from "..";

describe("SplitDivider", () => {
  it("reports horizontal movement while the pointer is captured", () => {
    const onDrag = vi.fn();

    render(<SplitDivider onDrag={onDrag} />);
    const handle = screen.getByRole("separator");

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 130, pointerId: 1 });

    expect(onDrag).toHaveBeenCalledWith(30);
  });

  it("stops reporting movement once the pointer is released", () => {
    const onDrag = vi.fn();

    render(<SplitDivider onDrag={onDrag} />);
    const handle = screen.getByRole("separator");

    fireEvent.pointerDown(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 150, pointerId: 1 });

    expect(onDrag).not.toHaveBeenCalled();
  });
});
