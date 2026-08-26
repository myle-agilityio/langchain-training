import { useEmailLookup } from "@/hooks";

export const EmailLine = ({
  id,
  fallback,
}: {
  id: string;
  fallback?: string;
}) => {
  const lookup = useEmailLookup();
  const email = lookup.get(id);

  if (!email) {
    return (
      <span className="text-xs text-muted-foreground">
        {fallback ?? id.slice(0, 8)}
      </span>
    );
  }

  return (
    <span className="min-w-0 truncate text-xs">
      <span className="font-semibold text-foreground">{email.from.name}</span>
      <span className="text-muted-foreground"> · {email.subject}</span>
    </span>
  );
};
