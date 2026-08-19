import { useMemo, type ComponentType } from "react";
import {
  BookOpen,
  Check,
  Inbox,
  MailCheck,
  Tags,
  TriangleAlert,
  UserRoundCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { useSharedInbox } from "@/hooks/use-shared-inbox";
import {
  COURSE_LABEL,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_TONE,
  URGENCY_VARIANT,
  WORK_TYPE_LABEL,
} from "@/components/email-inbox/inbox-list";
import type {
  Classification,
  EmailStatus,
  EmailTopic,
  Course,
  Urgency,
  WorkType,
} from "@/types/email";

export type ToolStatus = "inProgress" | "executing" | "complete";

export interface ToolCardProps<P> {
  status: ToolStatus;
  parameters: Partial<P>;
  result?: string;
}

// Tools stringify their result, but a run can still be cut short mid-stream.
function parseResult<T>(result: string | undefined): T | null {
  if (!result) return null;
  try {
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
}

const STATUS_LABEL: Record<EmailStatus, string> = {
  unread: "Unread",
  read: "Read",
  replied: "Replied",
  flagged_for_followup: "Follow up",
};

const STATUS_TONE: Record<EmailStatus, string> = {
  unread: "tone-violet",
  read: "tone-blue",
  replied: "tone-green",
  flagged_for_followup: "tone-amber",
};

function Shell({
  icon: Icon,
  title,
  status,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  status: ToolStatus;
  children: React.ReactNode;
}) {
  return (
    <div className="my-1.5 overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Icon className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
        <span className="truncate text-xs font-semibold text-[var(--foreground)]">
          {title}
        </span>
        <span className="ml-auto shrink-0">
          {status === "complete" ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Spinner size="sm" className="h-3 w-3" />
          )}
        </span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}

function Pending({ label }: { label: string }) {
  return (
    <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
  );
}

function Failure({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1 text-[11px] text-[var(--tone-red)]">
      <TriangleAlert className="h-3 w-3 shrink-0" />
      {text}
    </span>
  );
}

export function ClassificationBadges({
  classification,
}: {
  classification: Classification;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant="tone"
        className={cn("text-[10px]", TOPIC_TONE[classification.topic])}
      >
        {TOPIC_LABEL[classification.topic]}
      </Badge>
      {classification.course !== "none" && (
        <Badge variant="outline" className="text-[10px]">
          {COURSE_LABEL[classification.course]}
        </Badge>
      )}
      {classification.workType !== "none" && (
        <Badge variant="outline" className="text-[10px]">
          {WORK_TYPE_LABEL[classification.workType]}
        </Badge>
      )}
      <Badge
        variant={URGENCY_VARIANT[classification.urgency]}
        className={cn("text-[10px]", URGENCY_TONE[classification.urgency])}
      >
        {classification.urgency}
      </Badge>
    </div>
  );
}

// Tool results carry ids, not sender/subject — the inbox the panel already holds resolves them.
function useEmailLookup() {
  const { emails } = useSharedInbox();
  return useMemo(() => new Map(emails.map((e) => [e.id, e])), [emails]);
}

function EmailLine({ id, fallback }: { id: string; fallback?: string }) {
  const lookup = useEmailLookup();
  const email = lookup.get(id);
  if (!email) {
    return (
      <span className="text-xs text-[var(--muted-foreground)]">
        {fallback ?? id.slice(0, 8)}
      </span>
    );
  }
  return (
    <span className="min-w-0 truncate text-xs">
      <span className="font-semibold text-[var(--foreground)]">
        {email.from.name}
      </span>
      <span className="text-[var(--muted-foreground)]"> · {email.subject}</span>
    </span>
  );
}

/* ---------------------------------------------------------------- get_emails */

interface EmailFilterArgs {
  id?: string;
  status?: EmailStatus;
  topic?: EmailTopic;
  course?: Course;
  workType?: WorkType;
  urgency?: Urgency;
  unclassified?: boolean;
  sender?: string;
  search?: string;
  receivedAfter?: string;
  receivedBefore?: string;
}

interface RedactedEmail {
  id: string;
  from: { name: string };
  subject: string;
  status: EmailStatus;
  classification?: Classification;
}

const MAX_ROWS = 4;

function FilterChips({ filter }: { filter: EmailFilterArgs }) {
  const chips = Object.entries(filter).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (chips.length === 0) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {chips.map(([key, value]) => (
        <Badge key={key} variant="secondary" className="text-[10px] font-normal">
          {key}: {String(value)}
        </Badge>
      ))}
    </div>
  );
}

export function GetEmailsCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ filter?: EmailFilterArgs }>) {
  const filter = parameters.filter ?? {};
  const data = parseResult<{ emails: RedactedEmail[]; count: number }>(result);

  return (
    <Shell icon={Inbox} title="Read inbox" status={status}>
      <FilterChips filter={filter} />
      {!data ? (
        <Pending label="Fetching emails…" />
      ) : data.count === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          No emails matched.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {data.count} {data.count === 1 ? "email" : "emails"}
          </p>
          <div className="space-y-2">
            {data.emails.slice(0, MAX_ROWS).map((email) => (
              <div key={email.id} className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="min-w-0 truncate text-xs">
                    <span className="font-semibold text-[var(--foreground)]">
                      {email.from.name}
                    </span>
                    <span className="text-[var(--muted-foreground)]">
                      {" "}
                      · {email.subject}
                    </span>
                  </span>
                </div>
                {email.classification && (
                  <div className="mt-1">
                    <ClassificationBadges classification={email.classification} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {data.emails.length > MAX_ROWS && (
            <p className="text-[11px] text-[var(--muted-foreground)]">
              +{data.emails.length - MAX_ROWS} more
            </p>
          )}
        </div>
      )}
    </Shell>
  );
}

/* -------------------------------------------------------------- count_emails */

type GroupBy = "status" | "topic" | "course" | "workType" | "urgency";

function groupLabel(groupBy: GroupBy | undefined, value: string): string {
  if (value === "unclassified") return "Unclassified";
  switch (groupBy) {
    case "status":
      return STATUS_LABEL[value as EmailStatus] ?? value;
    case "topic":
      return TOPIC_LABEL[value as EmailTopic] ?? value;
    case "course":
      return COURSE_LABEL[value as Course] || "No course";
    case "workType":
      return WORK_TYPE_LABEL[value as WorkType] || "No work type";
    default:
      return value;
  }
}

export function CountEmailsCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ filter?: EmailFilterArgs; groupBy?: GroupBy }>) {
  const data = parseResult<{ total: number; byGroup?: Record<string, number> }>(
    result,
  );
  // Sorted by size, single hue: the bar carries magnitude, the label carries identity.
  const groups = Object.entries(data?.byGroup ?? {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...groups.map(([, n]) => n), 1);

  return (
    <Shell icon={Tags} title="Count emails" status={status}>
      <FilterChips filter={parameters.filter ?? {}} />
      {!data ? (
        <Pending label="Counting…" />
      ) : (
        <div className="space-y-2.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold tabular-nums text-[var(--foreground)]">
              {data.total}
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)]">
              {data.total === 1 ? "email" : "emails"}
            </span>
          </div>
          {groups.length > 0 && (
            <div className="tone-violet space-y-1.5">
              {groups.map(([value, n]) => (
                <div key={value} className="flex items-center gap-2">
                  <span className="w-20 shrink-0 truncate text-[11px] text-[var(--muted-foreground)]">
                    {groupLabel(parameters.groupBy, value)}
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--secondary)]">
                    <div
                      className="h-full rounded-full bg-[var(--tone)]"
                      style={{ width: `${(n / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[11px] font-semibold tabular-nums text-[var(--foreground)]">
                    {n}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Shell>
  );
}

/* ----------------------------------------------------------- classify_emails */

interface ClassifyResult {
  id: string;
  ok: boolean;
  classification?: Classification;
  error?: string;
}

export function ClassifyEmailsCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ ids: string[] }>) {
  const ids = parameters.ids ?? [];
  const data = parseResult<{ results: ClassifyResult[] }>(result);

  return (
    <Shell icon={Tags} title="Classify emails" status={status}>
      {!data ? (
        <Pending
          label={
            ids.length
              ? `Classifying ${ids.length} ${ids.length === 1 ? "email" : "emails"}…`
              : "Classifying…"
          }
        />
      ) : (
        <div className="space-y-2.5">
          {data.results.map((r) => (
            <div key={r.id} className="min-w-0">
              <div className="flex min-w-0">
                <EmailLine id={r.id} />
              </div>
              <div className="mt-1">
                {r.ok && r.classification ? (
                  <ClassificationBadges classification={r.classification} />
                ) : (
                  <Failure text={r.error ?? "failed"} />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* -------------------------------------------------------- update_email_status */

interface StatusResult {
  id: string;
  ok: boolean;
  status?: EmailStatus;
  error?: string;
}

export function UpdateEmailStatusCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ patches: { id: string; status: EmailStatus }[] }>) {
  const patches = parameters.patches ?? [];
  const data = parseResult<{ results: StatusResult[] }>(result);

  return (
    <Shell icon={MailCheck} title="Update status" status={status}>
      {!data ? (
        <Pending
          label={
            patches.length
              ? `Updating ${patches.length} ${patches.length === 1 ? "email" : "emails"}…`
              : "Updating…"
          }
        />
      ) : (
        <div className="space-y-2">
          {data.results.map((r) => (
            <div key={r.id} className="flex min-w-0 items-center gap-2">
              <EmailLine id={r.id} />
              <span className="ml-auto shrink-0">
                {r.ok && r.status ? (
                  <Badge
                    variant="tone"
                    className={cn("text-[10px]", STATUS_TONE[r.status])}
                  >
                    {STATUS_LABEL[r.status]}
                  </Badge>
                ) : (
                  <Failure text={r.error ?? "failed"} />
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------ search_knowledge_base */

export function SearchKnowledgeBaseCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ query: string }>) {
  const data = parseResult<{ title: string; content: string }[]>(result);

  return (
    <Shell icon={BookOpen} title="Knowledge base" status={status}>
      {parameters.query && (
        <p className="mb-2 truncate text-[11px] italic text-[var(--muted-foreground)]">
          “{parameters.query}”
        </p>
      )}
      {!data ? (
        <Pending label="Searching policy notes…" />
      ) : data.length === 0 ? (
        <p className="text-xs text-[var(--muted-foreground)]">
          Nothing relevant found.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((hit, i) => (
            <div key={`${hit.title}-${i}`} className="min-w-0">
              <p className="truncate text-xs font-semibold text-[var(--foreground)]">
                {hit.title}
              </p>
              <p className="line-clamp-2 text-[11px] text-[var(--muted-foreground)]">
                {hit.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

/* ------------------------------------------------------ update_contact_profile */

interface ProfileResult {
  ok: boolean;
  profile?: { name: string; tone: string | null; facts: string[] };
  error?: string;
}

export function UpdateContactProfileCard({
  status,
  parameters,
  result,
}: ToolCardProps<{ sender: string; tone?: string; facts?: string[] }>) {
  const data = parseResult<ProfileResult>(result);

  return (
    <Shell icon={UserRoundCog} title="Remember about contact" status={status}>
      {!data ? (
        <Pending
          label={
            parameters.sender
              ? `Saving notes on ${parameters.sender}…`
              : "Saving…"
          }
        />
      ) : !data.ok || !data.profile ? (
        <Failure text={data.error ?? "Could not save"} />
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-[var(--foreground)]">
            {data.profile.name}
          </p>
          {data.profile.tone && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                Tone
              </span>
              <Badge variant="secondary" className="text-[10px] font-normal">
                {data.profile.tone}
              </Badge>
            </div>
          )}
          {data.profile.facts.length > 0 && (
            <ul className="space-y-1">
              {data.profile.facts.map((fact) => (
                <li
                  key={fact}
                  className="flex gap-1.5 text-[11px] text-[var(--muted-foreground)]"
                >
                  <span className="text-[var(--tone-green)]">•</span>
                  {fact}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Shell>
  );
}
