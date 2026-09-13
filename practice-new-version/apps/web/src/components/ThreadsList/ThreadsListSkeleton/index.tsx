export const ThreadsListSkeleton = () => {
  return (
    <div aria-hidden>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="px-2 py-2 animate-pulse"
          style={{ opacity: 1 - i * 0.1 }}
        >
          <div className="h-3.5 w-32 rounded bg-secondary" />
          <div className="h-2.5 w-16 rounded bg-secondary mt-2" />
        </div>
      ))}
    </div>
  );
};
