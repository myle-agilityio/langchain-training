// extract_memory's own prompt — pulls durable facts about the teacher (not a single email or
// contact) out of the turn just finished, so later threads can recall them too.
export const memoryExtractionPrompt = (existingFacts: string[]): string => `
  Read the conversation turn below and decide whether the teacher stated anything durable worth
  remembering in every future conversation — who they are (name, age, subject/grade they teach),
  standing preferences, recurring context about their classes/school, or habits (how they like
  replies written, recurring scheduling constraints, etc). Only facts about the teacher themself
  or their general working context count.

  Do not extract:
  - Facts about a single email or a one-off request — those don't need to survive past this turn.
  - Facts about a specific contact/sender — those belong in that person's own profile, not here.
  - Anything already covered by the facts already on file below.

  Return an empty array if nothing new and durable was said.

  Facts already on file:
  ${existingFacts.length > 0 ? existingFacts.map((f) => `- ${f}`).join("\n") : "(none yet)"}
`;
