import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useComposeApproval, useOpenAIKey, useToast } from "@/stores";
import { EmailChat } from "..";

const chatProps = vi.hoisted(() => ({ current: {} as Record<string, never> }));
const stopAgent = vi.hoisted(() => vi.fn());

vi.mock("@copilotkit/react-core/v2", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@copilotkit/react-core/v2")>()),
  useAgent: () => ({ agent: {} }),
  useCopilotKit: () => ({ copilotkit: { stopAgent } }),
  isAbortError: (error: unknown) =>
    error instanceof Error && error.name === "AbortError",
  CopilotChat: (props: Record<string, never>) => {
    chatProps.current = props;

    return <div data-testid="copilot-chat" />;
  },
}));

type ChatProps = {
  onError: (event: unknown) => void;
  onStop: () => void;
  input: {
    textArea?: { disabled: boolean; placeholder: string };
    sendButton?: { disabled: true };
    addMenuButton?: { disabled: true };
  };
};

const chat = () => chatProps.current as unknown as ChatProps;

const abortError = () => {
  const error = new Error("aborted");

  error.name = "AbortError";

  return error;
};

const toasts = () => useToast.getState().toasts;

beforeEach(() => {
  vi.clearAllMocks();
  useToast.setState({ toasts: [] });
  useOpenAIKey.setState({ apiKey: "sk-teacher" });
  useComposeApproval.setState({ awaitingApproval: false });
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("EmailChat — the key gate", () => {
  it("asks for a key instead of rendering the chat", () => {
    useOpenAIKey.setState({ apiKey: null });
    render(<EmailChat />);

    expect(screen.queryByTestId("copilot-chat")).not.toBeInTheDocument();
  });

  it("renders the chat once a key is set", () => {
    render(<EmailChat />);

    expect(screen.getByTestId("copilot-chat")).toBeInTheDocument();
  });
});

describe("EmailChat — the approval lock", () => {
  it("leaves the composer alone while no card is waiting", () => {
    render(<EmailChat />);

    expect(chat().input.textArea).toBeUndefined();
    expect(chat().input.sendButton).toBeUndefined();
    expect(chat().input.addMenuButton).toBeUndefined();
  });

  it("locks the composer and says why while a draft awaits a decision", () => {
    useComposeApproval.setState({ awaitingApproval: true });
    render(<EmailChat />);

    expect(chat().input.textArea).toEqual({
      disabled: true,
      placeholder: "Approve or reject the draft to continue…",
    });
    expect(chat().input.sendButton).toEqual({ disabled: true });
    expect(chat().input.addMenuButton).toEqual({ disabled: true });
  });
});

describe("EmailChat — failures", () => {
  it("toasts a dropped stream, which otherwise just stops silently", () => {
    render(<EmailChat />);

    chat().onError({ error: new Error("stream closed"), code: "UNKNOWN" });

    expect(toasts()).toHaveLength(1);
  });

  it("ignores the DOM onError the prop also carries", () => {
    render(<EmailChat />);

    chat().onError({ type: "error" });

    expect(toasts()).toHaveLength(0);
  });

  it("says nothing when the run was aborted", () => {
    render(<EmailChat />);

    chat().onError({ error: abortError(), code: "UNKNOWN" });

    expect(toasts()).toHaveLength(0);
  });
});

describe("EmailChat — stopping", () => {
  it("stops the agent and swallows the error its own stop provokes", () => {
    render(<EmailChat />);

    chat().onStop();

    expect(stopAgent).toHaveBeenCalledOnce();

    chat().onError({ error: new Error("run failed"), code: "UNKNOWN" });

    expect(toasts()).toHaveLength(0);
  });

  it("goes back to reporting failures a second later", () => {
    vi.useFakeTimers();
    render(<EmailChat />);

    chat().onStop();
    vi.advanceTimersByTime(1000);
    vi.useRealTimers();

    chat().onError({ error: new Error("run failed"), code: "UNKNOWN" });

    expect(toasts()).toHaveLength(1);
  });
});
