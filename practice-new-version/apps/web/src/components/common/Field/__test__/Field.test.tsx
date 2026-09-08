import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Field, Input, Select, Textarea } from "..";

describe("Field", () => {
  it("labels the control it wraps, so clicking the label focuses it", async () => {
    render(
      <Field label="Received after">
        <Input />
      </Field>,
    );

    await userEvent.click(screen.getByText("Received after"));

    expect(screen.getByRole("textbox")).toHaveFocus();
  });
});

describe("Input", () => {
  it("reports what the teacher types", async () => {
    const onChange = vi.fn();

    render(<Input onChange={onChange} placeholder="Name or email" />);
    await userEvent.type(screen.getByPlaceholderText("Name or email"), "flo");

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it("passes native attributes through and forwards a ref", () => {
    const ref = createRef<HTMLInputElement>();

    render(<Input ref={ref} type="date" disabled />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current).toBeDisabled();
    expect(ref.current).toHaveAttribute("type", "date");
  });
});

describe("Textarea", () => {
  it("renders a resizeless textarea that reports typing", async () => {
    const onChange = vi.fn();

    render(<Textarea onChange={onChange} rows={6} />);

    const textarea = screen.getByRole("textbox");

    expect(textarea).toHaveClass("resize-none");
    expect(textarea).toHaveAttribute("rows", "6");

    await userEvent.type(textarea, "hi");

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe("Select", () => {
  it("reports the option chosen", async () => {
    const onChange = vi.fn();

    render(
      <Select onChange={onChange} defaultValue="">
        <option value="">Any</option>
        <option value="unread">Unread</option>
      </Select>,
    );

    await userEvent.selectOptions(screen.getByRole("combobox"), "unread");

    expect(onChange).toHaveBeenCalledOnce();
    expect(screen.getByRole("combobox")).toHaveValue("unread");
  });

  it("keeps the option list readable in dark mode", () => {
    render(<Select />);

    expect(screen.getByRole("combobox")).toHaveClass("scheme-light-dark");
  });
});
