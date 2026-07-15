/**
 * Mock knowledge base for `search_knowledge_base`.
 *
 * This is keyword/substring retrieval, not embedding-based search — a deliberate
 * "RAG-lite" scope call for the practice (see CLAUDE.md / the practice plan).
 * Articles are written to match the scenarios in seed-data.ts, so a search
 * triggered while triaging a seed email should actually find something relevant.
 */

export interface KBArticle {
  id: string;
  title: string;
  tags: string[];
  content: string;
}

export const knowledgeBase: KBArticle[] = [
  {
    id: "kb-duplicate-charges",
    title: "Duplicate or double charges on renewal",
    tags: ["billing", "duplicate", "charge", "renewal", "refund", "invoice"],
    content:
      "Duplicate renewal charges are almost always a payment-retry issue on the card network's side, not a double subscription. Confirm the workspace has exactly one active subscription in the billing panel, then refund the extra charge — refunds post to the original payment method within 5-7 business days. No need to cancel or recreate the subscription.",
  },
  {
    id: "kb-downgrade-proration",
    title: "Plan downgrades and proration",
    tags: ["billing", "downgrade", "proration", "plan", "credit"],
    content:
      "Downgrades take effect at the end of the current billing cycle, not immediately — this is by design so teams don't lose seats mid-cycle. If a customer downgraded and was still billed at the old (higher) rate for the cycle in progress, that's expected; the new rate applies starting next cycle. Offer a pro-rated credit only if the downgrade request predates the renewal date by more than 5 days and was not acknowledged.",
  },
  {
    id: "kb-vat-invoices",
    title: "Adding VAT / tax IDs to invoices",
    tags: ["billing", "vat", "tax", "invoice", "accounting"],
    content:
      "VAT numbers can be added retroactively to any invoice from the last 12 months. Update the tax ID in Workspace Settings > Billing, then request a reissue — reissued invoices keep the original invoice number with a corrected tax line.",
  },
  {
    id: "kb-workspace-plan-transfer",
    title: "Moving a workspace to a different team/plan",
    tags: ["workspace", "transfer", "plan", "team", "admin", "billing"],
    content:
      "Workspace owners can transfer a workspace to a different team's plan from Workspace Settings > General > Transfer Workspace. All docs, task boards, and comment history move with it; only workspace members with existing access retain permissions. This does not require support intervention unless the destination team is on a legacy plan no longer sold.",
  },
  {
    id: "kb-bulk-invite",
    title: "Bulk-inviting teammates",
    tags: ["invite", "bulk", "admin", "onboarding", "csv"],
    content:
      "Admins can bulk-invite teammates via Workspace Settings > Members > Invite > Upload CSV (columns: email, role). There's no hard limit on invite count, but batches over 100 are processed asynchronously and may take a few minutes to fully populate.",
  },
  {
    id: "kb-doc-version-history",
    title: "Recovering lost content in shared docs",
    tags: ["sync", "data loss", "recovery", "version history", "docs", "bug"],
    content:
      "Every doc keeps automatic version snapshots for 30 days, accessible via the clock icon in the doc toolbar. If content appears missing after a sync conflict, check version history first — most \"lost\" content is recoverable there even if it isn't visible in the current version.",
  },
  {
    id: "kb-realtime-conflict",
    title: "Real-time doc sync conflict behavior",
    tags: ["sync", "conflict", "real-time", "docs", "bug", "stale"],
    content:
      "When two people edit the same paragraph simultaneously, the client applies operational-transform merging; it should never silently drop one side's edits. A client showing a stale version after a simultaneous edit — rather than a merged result — indicates the known websocket-reconnect desync (tracked internally), not expected behavior. Recommend a hard refresh and check version history for anything that didn't merge.",
  },
  {
    id: "kb-task-board-duplicates",
    title: "Task board duplicate cards on drag-and-drop",
    tags: ["task board", "duplicate", "drag", "bug"],
    content:
      "Intermittent card duplication during drag-and-drop with multiple simultaneous editors on a board is a known, currently-open issue. Workaround: refresh the board after any drag that looks like it duplicated, and delete the stale copy — the underlying card data isn't corrupted, only the board's rendered state.",
  },
  {
    id: "kb-offline-mode",
    title: "Offline mode availability",
    tags: ["offline", "roadmap", "feature", "mobile", "desktop"],
    content:
      "Offline mode (view + draft locally, sync on reconnect) is on the roadmap but not yet available on any platform. There's no committed ship date to share externally; log the request so product can gauge demand.",
  },
  {
    id: "kb-keyboard-shortcuts",
    title: "Keyboard shortcuts reference",
    tags: ["shortcut", "keyboard", "productivity", "feature"],
    content:
      "Current shortcuts: Cmd/Ctrl+K for the command palette, Cmd/Ctrl+/ for the shortcut cheat sheet, Cmd/Ctrl+Shift+N for a new doc. There is currently no dedicated shortcut for switching between workspaces — the command palette (Cmd/Ctrl+K) is the closest existing path today.",
  },
  {
    id: "kb-sso-support",
    title: "SSO / Okta support by plan",
    tags: ["sso", "okta", "saml", "security", "enterprise", "plan"],
    content:
      "SAML-based SSO (including Okta) is available on Business and Enterprise plans only. Team-plan workspaces can upgrade to enable it; there's no add-on purchase path for SSO on lower tiers.",
  },
  {
    id: "kb-markdown-export",
    title: "Markdown export support",
    tags: ["export", "markdown", "docs", "feature"],
    content:
      "Doc export currently supports PDF and HTML only. Markdown export is a frequently requested feature and is on the roadmap, but not yet shipped on any plan.",
  },
  {
    id: "kb-dark-mode-rendering",
    title: "Dark mode rendering issues on Settings",
    tags: ["dark mode", "settings", "ui", "bug", "rendering"],
    content:
      "A known rendering bug causes doubled/offset text and blurry sidebar labels in dark mode on the Settings page, most visible on Chrome/macOS. A fix is in progress; no workaround needed for the underlying data, it's cosmetic only.",
  },
];

/** Keyword/substring search over the mock KB — no embeddings, see file header. */
export function searchKnowledgeBase(query: string, limit = 3): KBArticle[] {
  const terms = query
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);

  if (terms.length === 0) return [];

  const scored = knowledgeBase.map((article) => {
    const haystack = [
      article.title,
      ...article.tags,
      article.content,
    ]
      .join(" ")
      .toLowerCase();

    const score = terms.reduce(
      (sum, term) => sum + (haystack.includes(term) ? 1 : 0),
      0,
    );
    return { article, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.article);
}
