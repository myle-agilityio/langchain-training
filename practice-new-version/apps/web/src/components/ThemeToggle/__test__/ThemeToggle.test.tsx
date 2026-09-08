import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { useTheme } from "@/stores";
import { ThemeToggle } from "..";

const root = () => document.documentElement;
const toggle = () => screen.getByRole("button", { name: "Toggle theme" });

beforeEach(() => {
  root().classList.remove("light", "dark");
  useTheme.setState({ theme: "system" });
});

describe("ThemeToggle", () => {
  it("switches to light when the page is currently dark", async () => {
    root().classList.add("dark");
    render(<ThemeToggle />);

    await userEvent.click(toggle());

    expect(useTheme.getState().theme).toBe("light");
  });

  it("switches to dark when it is not", async () => {
    root().classList.add("light");
    render(<ThemeToggle />);

    await userEvent.click(toggle());

    expect(useTheme.getState().theme).toBe("dark");
  });

  it("toggles off what system resolved to, not the word system", async () => {
    root().classList.add("dark");
    useTheme.setState({ theme: "system" });
    render(<ThemeToggle />);

    await userEvent.click(toggle());

    expect(useTheme.getState().theme).toBe("light");
  });

  it("takes a caller's class", () => {
    render(<ThemeToggle className="ml-auto" />);

    expect(toggle()).toHaveClass("ml-auto");
  });
});
