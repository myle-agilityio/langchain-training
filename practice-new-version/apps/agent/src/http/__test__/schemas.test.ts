import { describe, expect, it } from "vitest";

import {
  ListQuerySchema,
  ListThreadsQuerySchema,
  PatchEmailBodySchema,
  RenameThreadBodySchema,
  SaveThreadBodySchema,
  SearchKnowledgeQuerySchema,
  SuggestionsBodySchema,
  ThreadIdQuerySchema,
} from "../schemas";

const parse = <T>(
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  value: unknown,
) => schema.safeParse(value);

describe("ListQuerySchema", () => {
  it("coerces the query string numbers and applies the page defaults", () => {
    expect(parse(ListQuerySchema, {}).data).toEqual({ limit: 20, offset: 0 });
    expect(parse(ListQuerySchema, { limit: "50", offset: "40" }).data).toEqual({
      limit: 50,
      offset: 40,
    });
  });

  it("refuses a page size outside the allowed range", () => {
    expect(parse(ListQuerySchema, { limit: "0" }).success).toBe(false);
    expect(parse(ListQuerySchema, { limit: "101" }).success).toBe(false);
    expect(parse(ListQuerySchema, { offset: "-1" }).success).toBe(false);
  });
});

describe("ListThreadsQuerySchema", () => {
  it("adds an optional search term to the same paging", () => {
    expect(parse(ListThreadsQuerySchema, { search: "grading" }).data).toEqual({
      limit: 20,
      offset: 0,
      search: "grading",
    });
  });

  it("refuses an empty search term rather than searching for nothing", () => {
    expect(parse(ListThreadsQuerySchema, { search: "" }).success).toBe(false);
  });
});

describe("PatchEmailBodySchema", () => {
  it("accepts a single-email patch", () => {
    expect(
      parse(PatchEmailBodySchema, { id: "e1", patch: { status: "read" } })
        .success,
    ).toBe(true);
  });

  it("accepts a bulk status patch", () => {
    expect(
      parse(PatchEmailBodySchema, {
        ids: ["a", "b"],
        patch: { status: "read" },
      }).success,
    ).toBe(true);
  });

  it("closes the door on a status the database has no meaning for", () => {
    expect(
      parse(PatchEmailBodySchema, { id: "e1", patch: { status: "archived" } })
        .success,
    ).toBe(false);
  });

  it("refuses a patch that would change nothing", () => {
    expect(parse(PatchEmailBodySchema, { id: "e1", patch: {} }).success).toBe(
      false,
    );
  });

  it("refuses a bulk patch with no ids", () => {
    expect(
      parse(PatchEmailBodySchema, { ids: [], patch: { status: "read" } })
        .success,
    ).toBe(false);
  });

  it("strips a reply off a bulk patch, so it can never reach the batch update", () => {
    const parsed = parse(PatchEmailBodySchema, {
      ids: ["a"],
      patch: {
        status: "read",
        reply: { subject: "s", body: "b", sentAt: "t" },
      },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ ids: ["a"], patch: { status: "read" } });
  });
});

describe("thread schemas", () => {
  it("needs an id to save, and keeps the optional snapshot fields", () => {
    expect(parse(SaveThreadBodySchema, { id: "" }).success).toBe(false);
    expect(
      parse(SaveThreadBodySchema, {
        id: "t1",
        firstMessage: "hi",
        content: "hi",
        messages: [{ role: "user" }],
      }).success,
    ).toBe(true);
  });

  it("needs both an id and a non-empty title to rename", () => {
    expect(parse(RenameThreadBodySchema, { id: "t1", title: "" }).success).toBe(
      false,
    );
    expect(
      parse(RenameThreadBodySchema, { id: "t1", title: "Renamed" }).success,
    ).toBe(true);
  });

  it("needs an id to delete", () => {
    expect(parse(ThreadIdQuerySchema, {}).success).toBe(false);
    expect(parse(ThreadIdQuerySchema, { id: "t1" }).data).toEqual({ id: "t1" });
  });
});

describe("SearchKnowledgeQuerySchema", () => {
  it("defaults k to the same 3 searchKnowledge uses", () => {
    expect(
      parse(SearchKnowledgeQuerySchema, { query: "late work" }).data,
    ).toEqual({ query: "late work", k: 3 });
  });

  it("bounds k and demands a query", () => {
    expect(parse(SearchKnowledgeQuerySchema, { query: "" }).success).toBe(
      false,
    );
    expect(
      parse(SearchKnowledgeQuerySchema, { query: "x", k: "11" }).success,
    ).toBe(false);
  });
});

describe("SuggestionsBodySchema", () => {
  it("defaults the count and bounds it", () => {
    expect(parse(SuggestionsBodySchema, { transcript: "hi" }).data).toEqual({
      transcript: "hi",
      count: 3,
    });
    expect(
      parse(SuggestionsBodySchema, { transcript: "hi", count: "6" }).success,
    ).toBe(false);
  });
});
