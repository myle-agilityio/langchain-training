import { useEffect, useRef, useState } from "react";
import { PanelLeftOpen } from "lucide-react";
import { EmailChat } from "@/components/EmailChat";
import { ModelPicker } from "@/components/ModelPicker";
import { ChangeKeyButton } from "@/components/openAIKey";
import { ThreadsSidebar } from "@/components/ThreadsSidebar";
import { Button } from "@/components/common";

const SIDEBAR_AUTO_COLLAPSE_WIDTH = 1400;

export const ChatPanel = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => setIsSidebarOpen((open) => !open);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    // Only fires on an actual open/closed cross-over (not every resize while already on one
    // side), so it never fights a manual toggle made while the pane stays on the same side.
    let wasWide: boolean | null = null;
    const observer = new ResizeObserver(([entry]) => {
      const isWide = entry.contentRect.width >= SIDEBAR_AUTO_COLLAPSE_WIDTH;

      if (isWide !== wasWide) {
        wasWide = isWide;
        setIsSidebarOpen(isWide);
      }
    });

    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full overflow-x-auto overflow-y-hidden"
    >
      <ThreadsSidebar open={isSidebarOpen} onCollapse={toggleSidebar} />
      <div className="flex h-full min-w-72 flex-1 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center gap-1 px-4 pt-3">
          {!isSidebarOpen && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={toggleSidebar}
              aria-label="Expand conversation history"
              title="Expand conversation history"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </Button>
          )}
          {/* ml-auto rather than a justify-between sibling: this stays pinned to the right edge
              whether or not the expand button above is rendered. */}
          <div className="ml-auto flex items-center gap-1">
            <ModelPicker />
            <ChangeKeyButton />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-3">
          <EmailChat />
        </div>
      </div>
    </div>
  );
};
