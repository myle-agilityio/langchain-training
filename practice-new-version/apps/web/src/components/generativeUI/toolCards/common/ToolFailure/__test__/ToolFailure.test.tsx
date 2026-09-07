import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ERROR_MESSAGE, GENERIC_ERROR_MESSAGE } from "@/constants";
import { ERROR_CODE } from "@/types";
import { ToolFailure } from "..";

describe("ToolFailure", () => {
  it("renders the wording the code maps to", () => {
    render(
      <ToolFailure
        error={{ code: ERROR_CODE.EMAIL_NOT_FOUND, message: "ignored" }}
      />,
    );

    expect(
      screen.getByText(ERROR_MESSAGE[ERROR_CODE.EMAIL_NOT_FOUND]),
    ).toBeInTheDocument();
  });

  it("never shows the message the agent generated", () => {
    render(
      <ToolFailure
        error={{
          code: ERROR_CODE.INTERNAL,
          message: "connection refused at 10.0.0.4:5432",
        }}
      />,
    );

    expect(screen.getByText(GENERIC_ERROR_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText(/10\.0\.0\.4/)).not.toBeInTheDocument();
  });

  it("falls back to the generic line for a code the UI does not know", () => {
    render(<ToolFailure error={{ code: "SOMETHING_NEW", message: "x" }} />);

    expect(screen.getByText(GENERIC_ERROR_MESSAGE)).toBeInTheDocument();
  });
});
