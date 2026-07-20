import { NextResponse } from "next/server";
import { Client } from "@langchain/langgraph-sdk";
import type { Email } from "@/types/email";
import { seedEmails } from "@/data/seed-emails";

// The inbox lives in the agent's cross-thread Store (agent/src/tools/emails/store.ts),
// not per-thread agent.state, so it's common to the whole app instead of forking a copy
// per chat thread. This route talks to that same store directly over the LangGraph
// deployment's REST API, independent of whichever thread happens to be active.
const NAMESPACE = ["emails"];

function getClient() {
  return new Client({
    apiUrl:
      process.env.AGENT_URL ||
      process.env.LANGGRAPH_DEPLOYMENT_URL ||
      "http://localhost:8123",
  });
}

function sortByReceivedAtDesc(emails: Email[]): Email[] {
  return [...emails].sort(
    (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
  );
}

export async function GET() {
  const client = getClient();
  const { items } = await client.store.searchItems(NAMESPACE, { limit: 1000 });

  if (items.length === 0) {
    // First read ever: seed the shared store so later reads (frontend or agent) aren't empty.
    await Promise.all(
      seedEmails.map((email) =>
        client.store.putItem(NAMESPACE, email.id, email as unknown as Record<string, unknown>),
      ),
    );
    return NextResponse.json({ emails: sortByReceivedAtDesc(seedEmails) });
  }

  const emails = items.map((item) => item.value as Email);
  return NextResponse.json({ emails: sortByReceivedAtDesc(emails) });
}

export async function PATCH(request: Request) {
  const { id, patch } = (await request.json()) as {
    id: string;
    patch: Partial<Email>;
  };

  const client = getClient();
  const existing = await client.store.getItem(NAMESPACE, id);
  if (!existing) {
    return NextResponse.json({ error: `No email with id ${id}` }, { status: 404 });
  }

  const updated: Email = { ...(existing.value as Email), ...patch };
  await client.store.putItem(NAMESPACE, id, updated as unknown as Record<string, unknown>);
  return NextResponse.json({ email: updated });
}
