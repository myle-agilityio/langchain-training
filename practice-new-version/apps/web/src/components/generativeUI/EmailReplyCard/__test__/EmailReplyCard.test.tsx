import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiClient } from "@/api";
import { EmailReplyCard, type EmailReplyCardProps } from "..";

let queryClient: QueryClient;

const draw = (props: Partial<EmailReplyCardProps> = {}) => {
  const respond = vi.fn();
  const view = render(
    <QueryClientProvider client={queryClient}>
      <EmailReplyCard
        status="executing"
        respond={respond}
        id="1d4ff3e7-81b9-4d39-ad26-1e93e622d363"
        subject="Re: Missed test Monday"
        body="Wednesday after school works."
        {...props}
      />
    </QueryClientProvider>,
  );

  return { respond, view };
};

const respondedWith = (respond: ReturnType<typeof vi.fn>) =>
  JSON.parse(String(respond.mock.lastCall?.[0]));

beforeEach(() => {
  vi.restoreAllMocks();
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
});

describe("EmailReplyCard — while the draft is still coming", () => {
  it("says it is drafting instead of showing empty fields", () => {
    draw({ status: "inProgress", subject: "", body: "" });

    expect(screen.getByText("Drafting reply…")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("fills the fields once the tool args arrive on the next render", () => {
    const { view } = draw({ status: "inProgress", subject: "", body: "" });

    view.rerender(
      <QueryClientProvider client={queryClient}>
        <EmailReplyCard
          status="executing"
          id="e1"
          subject="Re: Missed test"
          body="Wednesday works."
        />
      </QueryClientProvider>,
    );

    expect(screen.getByDisplayValue("Re: Missed test")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Wednesday works.")).toBeInTheDocument();
  });
});

describe("EmailReplyCard — review", () => {
  it("shows the draft, editable, with a short id badge", () => {
    draw();

    expect(
      screen.getByDisplayValue("Re: Missed test Monday"),
    ).toBeInTheDocument();
    expect(screen.getByText("1d4ff3e7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Approve/ })).toBeEnabled();
  });

  it("flags a draft the compliance check objected to, listing why", () => {
    draw({
      compliance: {
        compliant: false,
        violations: ["Mentions another student by name"],
      },
    });

    expect(
      screen.getByText("Compliance check flagged this draft"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Mentions another student by name"),
    ).toBeInTheDocument();
  });

  it("stays quiet when the check passed", () => {
    draw({ compliance: { compliant: true, violations: [] } });

    expect(
      screen.queryByText("Compliance check flagged this draft"),
    ).not.toBeInTheDocument();
  });

  it("locks the controls until the tool is actually awaiting a decision", () => {
    draw({ status: "complete" });

    expect(screen.getByRole("button", { name: /Approve/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Reject" })).toBeDisabled();
  });
});

describe("EmailReplyCard — approving", () => {
  it("marks the email replied with what is on screen, edits included", async () => {
    const patch = vi
      .spyOn(apiClient, "patch")
      .mockResolvedValue({ data: { email: {} } } as never);

    draw();

    await userEvent.type(
      screen.getByDisplayValue("Wednesday after school works."),
      " See you then.",
    );
    await userEvent.click(screen.getByRole("button", { name: /Approve/ }));

    await waitFor(() => expect(patch).toHaveBeenCalled());

    const body = patch.mock.lastCall?.[1] as {
      patch: { status: string; reply: { body: string } };
    };

    expect(body.patch.status).toBe("replied");
    expect(body.patch.reply.body).toBe(
      "Wednesday after school works. See you then.",
    );
  });

  it("tells the agent it was approved and to stop narrating", async () => {
    vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: { email: {} },
    } as never);

    const { respond } = draw();

    await userEvent.click(screen.getByRole("button", { name: /Approve/ }));

    expect(respondedWith(respond).decision).toBe("approve");
    expect(respondedWith(respond).instruction).toMatch(/Do NOT repeat/);
  });

  it("confirms on screen instead of leaving the form up", async () => {
    vi.spyOn(apiClient, "patch").mockResolvedValue({
      data: { email: {} },
    } as never);

    draw();

    await userEvent.click(screen.getByRole("button", { name: /Approve/ }));

    expect(screen.getByText("Reply sent")).toBeInTheDocument();
    expect(screen.getByText("Re: Missed test Monday")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});

describe("EmailReplyCard — rejecting", () => {
  it("sends nothing and keeps the draft for a later adjustment", async () => {
    const patch = vi.spyOn(apiClient, "patch");
    const { respond } = draw();

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(patch).not.toHaveBeenCalled();
    expect(respondedWith(respond)).toMatchObject({
      decision: "reject",
      subject: "Re: Missed test Monday",
      body: "Wednesday after school works.",
    });
    expect(respondedWith(respond).instruction).toMatch(/Do NOT write another/);
  });

  it("says plainly that nothing was sent", async () => {
    draw();

    await userEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(screen.getByText("Reply rejected")).toBeInTheDocument();
    expect(screen.getByText("Nothing was sent.")).toBeInTheDocument();
  });
});
