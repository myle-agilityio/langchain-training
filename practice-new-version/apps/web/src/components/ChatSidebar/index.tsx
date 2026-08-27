import type { CSSProperties, ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { Button, ChangeKeyButton, ModelPicker } from "@/components";

interface ChatSidebarProps {
  threadsMenu?: ReactNode;
  children: ReactNode;
}

const DEFAULT_WIDTH = 420;
const MIN_WIDTH = 320;
const MAX_WIDTH = 640;

// Collapsible, resizable chat sidebar on the right; EmailInbox is now the main/left content,
// so this just needs its own drag handle on its left edge, not a 50/50 split.
export const ChatSidebar = ({ threadsMenu, children }: ChatSidebarProps) => {
  // Mobile starts collapsed so the inbox is what teachers land on — matches the old default "app" mode.
  const [collapsed, setCollapsed] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches,
  );
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // The sidebar's right edge sits flush against the viewport edge, so width is just how far the
  // drag point is from that edge. Also keeps at least 320px for the inbox.
  const clampWidth = useCallback(
    (px: number) =>
      Math.min(MAX_WIDTH, window.innerWidth - 320, Math.max(MIN_WIDTH, px)),
    [],
  );
  const resizeTo = useCallback(
    (clientX: number) => setWidth(clampWidth(window.innerWidth - clientX)),
    [clampWidth],
  );

  // While dragging, prevent text selection under the pointer for the whole page, not just the
  // handle — the pointer sweeps across the chat panel too.
  useEffect(() => {
    if (!isResizing) {
      return;
    }

    document.body.classList.add("select-none", "cursor-col-resize");

    return () =>
      document.body.classList.remove("select-none", "cursor-col-resize");
  }, [isResizing]);

  useFrontendTool({
    name: "enableChatMode",
    description:
      "Open the chat sidebar so the teacher can see the conversation.",
    handler: async () => setCollapsed(false),
  });

  useFrontendTool({
    name: "enableAppMode",
    description: "Collapse the chat sidebar to give the inbox the full window.",
    handler: async () => setCollapsed(true),
  });

  return (
    <>
      {collapsed && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setCollapsed(false)}
          aria-label="Open chat"
          className="fixed top-4 right-7 z-50 bg-card shadow-sm"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
      <div
        className={[
          "fixed inset-0 z-40 flex h-full flex-col bg-background",
          isResizing ? "" : "transition-transform duration-200 ease-in-out",
          collapsed ? "translate-x-full" : "translate-x-0",
          "lg:relative lg:z-auto lg:translate-x-0 lg:rounded-xl lg:border lg:border-border lg:bg-card",
          isResizing
            ? ""
            : "lg:transition-[width] lg:duration-200 lg:ease-in-out",
          "lg:overflow-hidden",
          collapsed ? "lg:w-0 lg:border-0" : "lg:w-(--chat-sidebar-width)",
        ].join(" ")}
        style={{ "--chat-sidebar-width": `${width}px` } as CSSProperties}
      >
        {!collapsed && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize chat sidebar"
            aria-valuenow={Math.round(width)}
            aria-valuemin={MIN_WIDTH}
            aria-valuemax={MAX_WIDTH}
            tabIndex={0}
            title="Drag to resize — double-click to reset"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              setIsResizing(true);
            }}
            onPointerMove={(e) => {
              if (e.buttons !== 0) {
                resizeTo(e.clientX);
              }
            }}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              setIsResizing(false);
            }}
            onDoubleClick={() => setWidth(DEFAULT_WIDTH)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") {
                return;
              }

              e.preventDefault();
              setWidth((w) =>
                clampWidth(w + (e.key === "ArrowLeft" ? 24 : -24)),
              );
            }}
            className="hidden lg:block absolute left-0 inset-y-0 z-10 w-1.5 -translate-x-1/2 cursor-col-resize touch-none group focus:outline-none"
          >
            <span className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover:bg-muted-foreground group-focus:bg-muted-foreground" />
          </div>
        )}
        <div className="flex h-full w-full flex-col lg:w-(--chat-sidebar-width)">
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-extrabold text-xl truncate">
                CopilotKit
              </span>
              <img
                src="/copilotkit-logo-mark.svg"
                alt=""
                className="h-6 shrink-0"
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <ModelPicker />
              <ChangeKeyButton />
              {threadsMenu}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setCollapsed(true)}
                aria-label="Collapse chat"
              >
                <PanelRightClose className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto pb-3">{children}</div>
        </div>
      </div>
    </>
  );
};
