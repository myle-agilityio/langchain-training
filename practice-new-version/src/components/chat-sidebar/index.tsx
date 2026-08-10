"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useFrontendTool } from "@copilotkit/react-core/v2";
import { Button } from "@/components/ui/button";

interface ChatSidebarProps {
  threadsMenu?: ReactNode;
  children: ReactNode;
}

// Collapsible chat sidebar on the right; EmailInbox is the main/left content now, so this no
// longer needs to compete for width via ExampleLayout's old resizable 50/50 split.
export function ChatSidebar({ threadsMenu, children }: ChatSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Mobile starts collapsed so the inbox is what teachers land on — matches the old default
  // "app" mode. Effect-based (like ThemeProvider) to avoid a hydration mismatch.
  useEffect(() => {
    if (window.matchMedia("(max-width: 1023px)").matches) setCollapsed(true);
  }, []);

  useFrontendTool({
    name: "enableChatMode",
    description: "Open the chat sidebar so the teacher can see the conversation.",
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
          className="fixed top-4 right-4 z-50 bg-[var(--card)] shadow-sm"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}
      <div
        className={[
          "fixed inset-0 z-40 flex h-full flex-col bg-[var(--background)] dark:bg-stone-950",
          "transition-transform duration-200 ease-in-out",
          collapsed ? "translate-x-full" : "translate-x-0",
          "lg:static lg:z-auto lg:translate-x-0 lg:border-l lg:border-[var(--border)]",
          "lg:transition-[width] lg:duration-200 lg:ease-in-out lg:overflow-hidden",
          collapsed ? "lg:w-0 lg:border-l-0" : "lg:w-[420px]",
        ].join(" ")}
      >
        <div className="flex h-full w-full flex-col lg:w-[420px]">
          <div className="shrink-0 flex items-center justify-between gap-2 px-4 pt-4 pb-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-extrabold text-xl truncate">CopilotKit</span>
              <img src="/copilotkit-logo-mark.svg" alt="" className="h-6 shrink-0" />
            </div>
            <div className="flex items-center gap-1 shrink-0">
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
          <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        </div>
      </div>
    </>
  );
}
