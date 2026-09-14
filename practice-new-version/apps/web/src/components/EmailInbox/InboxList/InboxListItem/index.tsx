import { Flag, Mail, MailOpen, MoreVertical } from "lucide-react";
import type { Email } from "@/types";
import {
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components";
import {
  COURSE_LABEL,
  FALLBACK_TONE,
  TONE,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_LABEL,
  URGENCY_TONE,
  WORK_TYPE_LABEL,
} from "@/constants";
import { cn, formatReceivedAt, formatReceivedAtFull } from "@/utils";

// Same sender always lands on the same hue — not meaningful the way urgency's tone is, just a
// stable way to tell senders apart at a glance.
const AVATAR_TONES = Object.values(TONE);

const pickAvatarTone = (seed: string): string => {
  let hash = 0;

  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
};

interface InboxListItemProps {
  email: Email;
  onSelect: (email: Email) => void;
  onToggleRead: (email: Email) => void;
}

export const InboxListItem = ({
  email,
  onSelect,
  onToggleRead,
}: InboxListItemProps) => {
  const isUnread = email.status === "unread";
  // Rail hue tracks urgency once classified; before that it falls back to the brand lilac.
  const railTone = email.classification
    ? URGENCY_TONE[email.classification.urgency]
    : FALLBACK_TONE;

  // First letter of the sender's name, uppercased, for the avatar.
  const avatarInitial = email.from.name.charAt(0).toUpperCase();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(email)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(email);
        }
      }}
      className={cn(
        "group flex w-full items-center px-4 py-3 text-left transition-colors cursor-pointer",
        railTone,
        "border-b border-border hover:bg-secondary/50",
      )}
    >
      <div className="mr-2 flex min-w-0 flex-1 items-center overflow-hidden">
        {/* Same sender always gets the same hue (pickAvatarTone), scoped to this
            element so it doesn't fight the row's own --tone (urgency, for the accent
            bar/dot). */}
        <div
          className={cn(
            "mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--tone)/15 text-sm font-semibold text-(color:--tone)",
            pickAvatarTone(email.from.name),
          )}
        >
          {avatarInitial}
        </div>

        <span
          className={cn(
            "mr-8 w-24 shrink-0 truncate text-sm",
            isUnread
              ? "font-bold text-foreground"
              : "font-medium text-muted-foreground",
          )}
        >
          {email.from.name}
        </span>

        {email.classification && (
          <div className="mr-2 flex shrink-0 items-center gap-1">
            <Badge
              variant="tone"
              className={cn(
                "max-w-[110px] @max-[420px]:max-w-[64px] text-[10px]",
                TOPIC_TONE[email.classification.topic],
              )}
            >
              <span className="min-w-0 truncate">
                {TOPIC_LABEL[email.classification.topic]}
              </span>
            </Badge>
            {email.classification.workType !== "none" && (
              // Least essential badge in the row — drop it first as the container
              // narrows, before the topic badge or the urgency label.
              <Badge
                variant="secondary"
                className="hidden max-w-[100px] text-[10px] @min-[640px]:inline-flex"
              >
                <span className="min-w-0 truncate">
                  {WORK_TYPE_LABEL[email.classification.workType]}
                </span>
              </Badge>
            )}
            {email.classification.course !== "none" && (
              <Badge variant="secondary" className="max-w-[100px] text-[10px]">
                <span className="min-w-0 truncate">
                  {COURSE_LABEL[email.classification.course]}
                </span>
              </Badge>
            )}
          </div>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          <span
            className={cn(
              "min-w-0 max-w-[50%] shrink truncate",
              isUnread ? "font-bold text-foreground" : "text-foreground",
            )}
          >
            {email.subject}
          </span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">
            - {email.body}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {email.classification && (
          <span className="flex items-center gap-1 text-[11px] font-medium text-(color:--tone)">
            <Flag className="h-3 w-3" />
            {/* Below this width the row is already tight — keep the flag, drop the
                label rather than let it get truncated too. */}
            <span className="hidden @min-[560px]:inline">
              {URGENCY_LABEL[email.classification.urgency]}
            </span>
          </span>
        )}
        <time
          dateTime={email.receivedAt}
          title={formatReceivedAtFull(email.receivedAt)}
          suppressHydrationWarning
          className={cn(
            "text-[11px] tabular-nums",
            isUnread
              ? "font-semibold text-foreground"
              : "text-muted-foreground",
          )}
        >
          {formatReceivedAt(email.receivedAt)}
        </time>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              title="Email actions"
              aria-label="Email actions"
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary cursor-pointer"
            >
              <MoreVertical className="h-3 w-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              disabled={!isUnread}
              onSelect={() => onToggleRead(email)}
            >
              <MailOpen className="h-3.5 w-3.5" />
              Mark as read
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isUnread || email.status === "replied"}
              onSelect={() => onToggleRead(email)}
            >
              <Mail className="h-3.5 w-3.5" />
              Mark as unread
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
