// Mirrors agent/src/tools/emails/seed-data.ts. Frontend and agent are separate
// TS projects (no shared import boundary — see src/types/email.ts), so this is
// duplicated deliberately. Used as the inbox's initial render data so the list
// shows immediately like a normal app, instead of waiting on the agent/thread
// to connect and sync its own copy of this same default state.
import type { Email } from "@/types/email";

export const seedEmails: Email[] = [
  {
    "id": "d64a6f07-2802-4252-ba30-fa76dcbbe970",
    "from": {
      "name": "Lilla Douglas-Fisher",
      "email": "lilla_douglas-fisher@hotmail.com"
    },
    "subject": "Duplicate charge for Team plan renewal (INV-24326)",
    "body": "Hi, I just noticed I was billed twice for our Vela Team plan renewal, both tied to invoice ref INV-24326. Two identical charges hit my card today, 15 July, and I only have one workspace on this account.\n\nWe use Vela daily for shared docs and task boards, so I want to make sure the subscription is active correctly, but I need the duplicate charge reversed as soon as possible.\n\nCan you check what happened and confirm when the extra payment will be refunded?",
    "receivedAt": "2026-07-15T08:23:43.575Z",
    "status": "unread"
  },
  {
    "id": "0e19a8e6-34db-4fbd-948b-d7d7d9401ae9",
    "from": {
      "name": "Rasheed Murphy",
      "email": "rasheed_murphy58@gmail.com"
    },
    "subject": "Shared doc lost a chunk of notes after syncing — also need to ask about billing",
    "body": "Hi, I'm seeing missing content in a shared Vela doc and need help figuring out what happened. On May 9, in our workspace \"Northstar Ops,\" a doc called \"Q2 rollout notes\" lost about three sections after another teammate opened it. We use real-time docs on the Team plan, and I can't tell if this was a sync issue or if we hit some storage limit.\n\nNothing was intentionally deleted, and the task board links inside that doc are gone too. Can you check whether there's a recovery/version history option for that date? Also, since this affected our work for most of May, I'd like a refund/credit for this month if possible.\n\nThanks,\nRasheed Murphy",
    "receivedAt": "2026-07-14T04:09:31.412Z",
    "status": "unread"
  },
  {
    "id": "7c2a2843-0c87-4f69-8624-01a315fde44b",
    "from": {
      "name": "Jillian Fahey",
      "email": "jillian_fahey89@yahoo.com"
    },
    "subject": "Shortcut to switch between workspaces?",
    "body": "Hi Vela team — quick feature request. I'm in three workspaces all day (Client Ops, Product Wiki, and our Freelancers space) and I'm constantly mousing back to the sidebar to switch between them. Is there already a keyboard shortcut to jump between workspaces, or if not, could you add one?\n\nI use slash commands and the editor shortcuts a lot, so this feels like the one thing slowing me down. I'm on the Pro plan and mostly using the Mac app.\n\nSomething like Ctrl/Cmd+K for workspace switching would be amazing.",
    "receivedAt": "2026-07-14T02:28:48.081Z",
    "status": "unread"
  },
  {
    "id": "452dba9e-ba21-4ab2-b32b-2435cfe93137",
    "from": {
      "name": "Amanda Kemmer",
      "email": "amanda_kemmer76@hotmail.com"
    },
    "subject": "Could you add our VAT number to previous Vela invoices?",
    "body": "Hi, could you update our past Vela invoices to include our VAT number for accounting?\n\nWe're on the Team plan, and our finance team noticed the invoices from March through June 2026 don't show the VAT number. The company name is already correct, but they need the VAT ID added to those invoices before they close out the quarter.\n\nVAT number: DE329184771\n\nIf you're able to reissue those invoices, that would be great. Let me know if you need the workspace name or invoice numbers from me.",
    "receivedAt": "2026-07-14T00:37:28.338Z",
    "status": "unread"
  },
  {
    "id": "92929780-badc-4c8b-afa6-95bac6a38f68",
    "from": {
      "name": "Marie Torphy",
      "email": "marie.torphy@hotmail.com"
    },
    "subject": "A couple things in Vela + can someone from management reach out?",
    "body": "Hi, I'm Marie Torphy from our Blue Harbor workspace on the Team plan. I've been using Vela pretty heavily this week and one small thing is driving me a little nuts: in real-time docs, the comment sidebar keeps collapsing after I switch over to the task board and back. Not a huge bug, just annoying.\n\nAlso, do you support SSO with Okta on the Team plan, or is that only on Business/Enterprise? I couldn't tell from the pricing page updated on May 6.\n\nAnd lastly, I'd really like to speak with a manager about our account before renewal on June 1. Who's the right person for that?",
    "receivedAt": "2026-07-12T06:17:41.504Z",
    "status": "unread"
  },
  {
    "id": "b6837b0b-7109-4bea-9afd-af23872525c6",
    "from": {
      "name": "Sydni McDermott",
      "email": "sydni.mcdermott58@gmail.com"
    },
    "subject": "Unsaved edits disappearing after sleep/wake between Mac and iPhone",
    "body": "Hi, I'm running into a really bad issue with Vela. Since Monday (Mar 4), edits I make in the iPhone app keep disappearing if my MacBook wakes from sleep while the same doc is open in our workspace. I'll type notes in a shared doc, switch back later, and chunks are gone with no recovery prompt.\n\nThis has happened 4 times this week in our Product Ops workspace, mostly in meeting notes and task descriptions. I'm on the Pro plan, iPhone 14 iOS 17.3, MacBook Air on Sonoma 14.3. Is there a way to recover the missing text, and is this a known sync bug?",
    "receivedAt": "2026-07-12T04:13:54.550Z",
    "status": "unread"
  },
  {
    "id": "6ae1034a-58bd-4f4d-906b-de62898c6bfc",
    "from": {
      "name": "Enola Stracke",
      "email": "enola_stracke@hotmail.com"
    },
    "subject": "Real-time docs showing old version after simultaneous edits",
    "body": "Hi, we ran into a pretty bad sync issue in Vela this morning. In our shared workspace on the Team plan, two teammates were editing the same project notes doc at the same time around 9:15 AM ET, and my screen kept showing an older version even though I could see their cursors moving.\n\nAfter refreshing, some of my changes were missing and a few of theirs appeared out of order. This was in the doc \"Q3 Launch Notes\" on July 15. Can you check whether there's a sync problem or version conflict happening on your side? We use real-time docs heavily, so I need to know how to avoid this.",
    "receivedAt": "2026-07-12T01:15:02.628Z",
    "status": "read",
    "classification": {
      "category": "bug",
      "urgency": "high"
    }
  },
  {
    "id": "135620fa-7a6a-43f0-88f6-abc621bda291",
    "from": {
      "name": "Justine Hagenes",
      "email": "justine.hagenes6@gmail.com"
    },
    "subject": "Still charged full Team plan after downgrading to Starter on April 12",
    "body": "Hi, I changed our Vela workspace from Team to Starter on April 12, but the invoice that hit today still charged me the full Team amount for the whole billing cycle.\n\nWorkspace: Northline Studio\nInvoice date: April 18\n\nI downgraded because we're not using task boards or the extra real-time doc seats anymore, so I expected the billing to reflect that change or at least be prorated.\n\nCan you check what happened and let me know if there's a credit or refund due? I just want to make sure we're on the right plan going forward.",
    "receivedAt": "2026-07-11T21:56:19.496Z",
    "status": "unread"
  },
  {
    "id": "19b9ab77-de50-4e0f-9128-d616c142e068",
    "from": {
      "name": "Destinee Johnston",
      "email": "destinee_johnston18@gmail.com"
    },
    "subject": "Can Vela docs be exported as Markdown?",
    "body": "Hi, I'm using Vela with our shared workspace on the Team plan and wanted to check if there's a way to export a doc as Markdown. I found PDF/export options, but I'm not seeing anything for .md.\n\nWe're moving a few meeting notes and specs into another repo and Markdown would make that a lot easier. If it's supported, can you point me to where that lives in the doc menu? If not, is it on the roadmap at all?\n\nThanks.",
    "receivedAt": "2026-07-10T19:28:14.809Z",
    "status": "read",
    "classification": {
      "category": "question",
      "urgency": "low"
    }
  },
  {
    "id": "ee4571bb-91f3-4c1b-a54b-336d57f9885b",
    "from": {
      "name": "Leanna Rutherford",
      "email": "leanna_rutherford@hotmail.com"
    },
    "subject": "Any plans for offline mode in the Mac app?",
    "body": "Hi Vela team — I use Vela on macOS for meeting notes and project docs in our shared workspace, and I've been wondering if offline mode is on the roadmap. I’m on the Pro plan and travel a fair bit, so there are stretches on trains/flights where I can open the app but can’t really do much if my connection drops. Even just being able to view recent docs and draft edits locally, then sync later, would help a lot. I noticed this again on a trip last Friday, June 7. Is this something you're planning for the Mac app?",
    "receivedAt": "2026-07-09T11:52:44.063Z",
    "status": "unread"
  },
  {
    "id": "615c1686-bd8d-43a3-b87f-5d13a87c546f",
    "from": {
      "name": "Raegan Morar",
      "email": "raegan_morar@yahoo.com"
    },
    "subject": "How do I move a workspace to our other team plan?",
    "body": "Hi, I'm trying to move our workspace “Q3 Product Notes” over to a different team plan in Vela and I'm not seeing an option for it.\n\nRight now it’s under our Starter team, but we want it billed under the Marketing Team on the Business plan instead. The workspace has our docs, task boards, and comments already in it, so I'd rather not recreate anything if there's a proper transfer process.\n\nIs this something an admin can do from settings, or does support need to move it? If there are any limits around permissions or ownership, please let me know.",
    "receivedAt": "2026-07-09T02:57:22.208Z",
    "status": "unread"
  },
  {
    "id": "03a30056-2bd3-40ad-a25b-3570d7c60b9e",
    "from": {
      "name": "Florian Klein",
      "email": "florian.klein82@hotmail.com"
    },
    "subject": "How can I bulk-invite 40 teammates to our workspace?",
    "body": "Hi Vela team,\n\nI'm the new admin for our workspace and I'm trying to get everyone set up before our Monday kickoff. We have about 40 teammates to invite, and doing them one by one doesn't seem practical.\n\nIs there a bulk invite option in Vela for shared workspaces, or a way to upload a list of email addresses? We're on the Team plan right now, if that matters.\n\nIf there's a specific place in settings for this, could you point me to it?\n\nThanks,\nFlorian Klein",
    "receivedAt": "2026-07-08T23:48:55.254Z",
    "status": "unread"
  },
  {
    "id": "1b8f2fa0-0753-46b4-9e72-dcbdd6d7b641",
    "from": {
      "name": "Augustine Weimann",
      "email": "augustine.weimann@gmail.com"
    },
    "subject": "Task board is randomly creating duplicate cards when I drag them",
    "body": "Hi, I'm seeing a strange issue in Vela on our Growth plan workspace. On the task board for our Q3 launch project, dragging a card from \"In Progress\" to \"Review\" will sometimes leave the original card behind and create a duplicate in the new column.\n\nIt's not every time, which makes it hard to pin down, but we noticed it several times today (July 15) in Chrome with two people in the board at once. The duplicates keep the same title/checklist, so people are accidentally working from the wrong one.\n\nCan you take a look and let me know if there's a fix or workaround?",
    "receivedAt": "2026-07-08T23:28:35.564Z",
    "status": "unread"
  },
  {
    "id": "c9994773-7182-42e8-987a-20858b221697",
    "from": {
      "name": "Hassan Gislason",
      "email": "hassan_gislason@yahoo.com"
    },
    "subject": "Dark mode display issue on Settings page",
    "body": "Hi, I noticed a small rendering bug in dark mode on the Settings page in Vela. I'm on the Pro plan, and when I open Settings > Workspace members, some of the text looks doubled or slightly offset, like it's being drawn twice. The toggle labels in the left sidebar also get pretty blurry.\n\nI first spotted it this morning (July 15) in Chrome on macOS. Light mode looks normal, so it seems specific to dark mode.\n\nNot blocking anything for me, but figured I should report it in case it helps. Happy to share a screenshot if needed.",
    "receivedAt": "2026-07-08T14:13:53.955Z",
    "status": "unread"
  }
];
