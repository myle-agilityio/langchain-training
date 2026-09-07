import { Component, type ErrorInfo, type ReactNode } from "react";

interface RuntimeBoundaryState {
  error: Error | null;
}

// Stories of the CopilotKit-backed components need the agent on :8123. Without it they throw
// on mount, and a red overlay says less than this does.
export class RuntimeBoundary extends Component<
  { children: ReactNode },
  RuntimeBoundaryState
> {
  state: RuntimeBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): RuntimeBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Story needs the CopilotKit runtime:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-sm rounded-xl border border-border bg-card p-5 text-sm text-card-foreground">
          <p className="font-semibold">This story needs the agent running.</p>
          <p className="mt-2 text-muted-foreground">
            Start it with <code className="font-mono">pnpm dev:agent</code> and
            reload — it talks to the CopilotKit runtime on :8123.
          </p>
          <p className="mt-2 font-mono text-xs text-tone-red">
            {this.state.error.message}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
