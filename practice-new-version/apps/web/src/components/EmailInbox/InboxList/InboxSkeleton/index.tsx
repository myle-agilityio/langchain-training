export const InboxSkeleton = () => {
  return (
    <div aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-border animate-pulse"
          style={{ opacity: 1 - i * 0.14 }}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="h-3 w-28 rounded bg-secondary" />
            <div className="h-2.5 w-10 rounded bg-secondary" />
          </div>
          <div className="h-3 w-52 rounded bg-secondary mt-2" />
          <div className="h-2.5 w-full rounded bg-secondary mt-2" />
        </div>
      ))}
    </div>
  );
};
