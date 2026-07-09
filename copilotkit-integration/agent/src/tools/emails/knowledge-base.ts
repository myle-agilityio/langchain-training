export const KNOWLEDGE_BASE: { topic: string; snippet: string }[] = [
  {
    topic: "password",
    snippet:
      "Reset password via Settings > Security > Change Password. The reset link expires after 30 minutes.",
  },
  {
    topic: "login",
    snippet:
      "If login still fails right after a password reset, the old session may be cached -- have the user sign out everywhere via Settings > Security > Sign out everywhere, then retry.",
  },
  {
    topic: "rate limit",
    snippet:
      "Pro plan: 600 requests/minute per API key (not per account). Current usage is returned on every response via the X-RateLimit-Remaining header.",
  },
  {
    topic: "billing",
    snippet:
      "Duplicate-looking charges are usually a pending authorization hold that clears in 3-5 business days. Confirmed duplicate charges can be refunded from the Billing admin panel.",
  },
  {
    topic: "export",
    snippet:
      "Data exports run as an async job. Silent failures are almost always caused by the export exceeding the 5GB single-file limit -- ask the user to chunk the export by date range.",
  },
  {
    topic: "dark mode",
    snippet: "Dark mode for the mobile app is on the roadmap (tracked as FEAT-482); no committed release date yet.",
  },
];
