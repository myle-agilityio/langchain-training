import { useCallback, useEffect, useState } from "react";

// One tripwire div dropped at the end of a scrollable list — fetchNextPage fires once it enters
// view. A callback ref (not useRef) on purpose: the thread menu's sentinel lives inside a Radix
// DropdownMenuContent, which doesn't mount its children until the popover opens, so `hasMore`
// can already be true — and the effect already run once with a null node — before the div ever
// attaches. A callback ref re-fires whenever the node itself changes, including that late mount.
export const useLoadMoreSentinel = (
  hasMore: boolean,
  onLoadMore: () => void,
) => {
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const sentinelRef = useCallback(
    (el: HTMLDivElement | null) => setNode(el),
    [],
  );

  useEffect(() => {
    if (!node || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [node, hasMore, onLoadMore]);

  return sentinelRef;
};
