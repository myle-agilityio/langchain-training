"use client";

import type { ReactNode } from "react";
import { useCallback, useRef, useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { ResizeHandle } from "./resize-handle";
import { useFrontendTool } from "@copilotkit/react-core/v2";

interface ExampleLayoutProps {
  chatContent: ReactNode;
  appContent: ReactNode;
}

const DEFAULT_CHAT_WIDTH = 50;
// Both panels stay usable at the extremes: the chat can't get too narrow to read a draft in,
// and the inbox list needs room for a subject line plus its status badge.
const MIN_CHAT_WIDTH = 25;
const MAX_CHAT_WIDTH = 75;

const clampWidth = (pct: number) =>
  Math.min(MAX_CHAT_WIDTH, Math.max(MIN_CHAT_WIDTH, pct));

export function ExampleLayout({ chatContent, appContent }: ExampleLayoutProps) {
  // Default to "app" (inbox + chat sidebar side by side) rather than chat-only —
  // this is an email client first, so users should land on their inbox instead
  // of a blank chat screen. See docs/ROADMAP.md's "layout pass" task.
  const [mode, setMode] = useState<"chat" | "app">("app");

  // Chat panel width as a percentage of the layout, so the split survives window resizes.
  const [chatWidth, setChatWidth] = useState(DEFAULT_CHAT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const resizeTo = useCallback((clientX: number) => {
    const container = containerRef.current;
    if (!container) return;
    const { left, width } = container.getBoundingClientRect();
    setChatWidth(clampWidth(((clientX - left) / width) * 100));
  }, []);

  useFrontendTool({
    name: "enableAppMode",
    description:
      "Enable app mode, make sure its open when interacting with todos.",
    handler: async () => {
      setMode("app");
    },
  });

  useFrontendTool({
    name: "enableChatMode",
    description: "Enable chat mode",
    handler: async () => {
      setMode("chat");
    },
  });

  return (
    <div
      ref={containerRef}
      className={`h-full flex flex-row pb-6 ${
        // While dragging, the pointer sweeps across both panels — without this it would
        // select their text and flicker the I-beam cursor.
        isResizing ? "select-none cursor-col-resize" : ""
      }`}
    >
      <ModeToggle mode={mode} onModeChange={setMode} />

      {/* Chat Content */}
      <div
        style={mode === "app" ? { width: `${chatWidth}%` } : undefined}
        className={`max-h-full flex flex-col dark:bg-stone-950 ${
          mode === "app"
            ? "shrink-0 px-6 max-lg:hidden" // Width comes from the resizable split; hidden on mobile in app mode
            : "flex-1 max-lg:px-4"
        }`}
      >
        {/* Clear the threads drawer's floating launcher/collapsed cluster, which
            is fixed at the top-left corner. Below 1024px (mobile off-canvas) that
            is always present → max-lg:pl-24. On desktop it only appears when the
            drawer is COLLAPSED — detected via --cpk-drawer-reserved-width, which
            the drawer sets to 0px on collapse (else its 320px default): the pl
            calc resolves to 1.5rem (pl-6) when expanded and ~6rem when collapsed,
            so the logo never sits under the cluster. max-lg:pt-2.5 + pb-0
            vertically center the logo with that launcher and the top-right
            Chat/App toggle (both pinned at top-2). */}
        <div className="shrink-0 pt-[23px] pl-[max(1.5rem,calc(7rem_-_var(--cpk-drawer-reserved-width,320px)))] pb-2 max-lg:pl-24 max-lg:pb-4 flex gap-1.5 items-center align-center">
          <span className="font-extrabold text-2xl">CopilotKit</span>
          <img
            src="/copilotkit-logo-mark.svg"
            alt="CopilotKit"
            className="h-7"
          />
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{chatContent}</div>
      </div>

      {mode === "app" && (
        <ResizeHandle
          valueNow={chatWidth}
          onResize={resizeTo}
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
          onReset={() => setChatWidth(DEFAULT_CHAT_WIDTH)}
          onNudge={(direction) =>
            setChatWidth((current) => clampWidth(current + direction * 2))
          }
        />
      )}

      {/* State Panel */}
      <div
        className={`h-full overflow-hidden ${
          mode === "app"
            ? // Takes whatever the chat panel leaves, so dragging the divider is a single
              // width change. The dividing line itself now lives in ResizeHandle, which is
              // why there's no border-l here anymore.
              "flex-1 min-w-0"
            : "w-0 border-l-0"
        }`}
      >
        {/*
          Fill the state panel's own width. The previous `lg:w-[66.666vw]` was
          viewport-relative, so with a reserved drawer column it overflowed this
          container (clipped by overflow-hidden) and pushed centered content
          right of the visible box's center.
        */}
        <div className="w-full h-full">{appContent}</div>
      </div>
    </div>
  );
}
