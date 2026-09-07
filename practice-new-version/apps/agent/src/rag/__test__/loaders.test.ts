import { readdir } from "node:fs/promises";
import { Document } from "@langchain/core/documents";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { loadDirectoryAsChunks } from "../loaders";

const mocks = vi.hoisted(() => ({
  pdfLoad: vi.fn(),
  csvLoad: vi.fn(),
  docxLoad: vi.fn(),
  docxArgs: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({ readdir: vi.fn() }));

vi.mock("@langchain/community/document_loaders/fs/pdf", () => ({
  PDFLoader: class {
    load() {
      return mocks.pdfLoad();
    }
  },
}));

vi.mock("@langchain/community/document_loaders/fs/csv", () => ({
  CSVLoader: class {
    load() {
      return mocks.csvLoad();
    }
  },
}));

vi.mock("@langchain/community/document_loaders/fs/docx", () => ({
  DocxLoader: class {
    constructor(path: string, options: { type: string }) {
      mocks.docxArgs(path, options);
    }

    load() {
      return mocks.docxLoad();
    }
  },
}));

const doc = (pageContent: string): Document =>
  new Document({ pageContent, metadata: { loc: { pageNumber: 1 } } });

describe("loadDirectoryAsChunks", () => {
  beforeEach(() => {
    vi.mocked(readdir).mockReset();
    mocks.pdfLoad.mockReset();
    mocks.csvLoad.mockReset();
    mocks.docxLoad.mockReset();
    mocks.docxArgs.mockReset();
  });

  it("titles a CSV from its filename and leaves its content alone", async () => {
    vi.mocked(readdir).mockResolvedValue(["late-work_policy.csv"] as never);
    mocks.csvLoad.mockResolvedValue([doc("row one\nrow two")]);

    const chunks = await loadDirectoryAsChunks("/kb");

    expect(chunks).toHaveLength(1);
    expect(chunks[0].pageContent).toBe("row one\nrow two");
    expect(chunks[0].metadata).toMatchObject({
      title: "Late Work Policy",
      source: "late-work_policy.csv",
    });
  });

  it("promotes a PDF's first line to the title and drops it from the content", async () => {
    vi.mocked(readdir).mockResolvedValue(["handbook.pdf"] as never);
    mocks.pdfLoad.mockResolvedValue([
      doc("Grading Policy 2026\n\nLate work loses 10% per day."),
    ]);

    const chunks = await loadDirectoryAsChunks("/kb");

    expect(chunks[0].metadata.title).toBe("Grading Policy 2026");
    expect(chunks[0].pageContent).toBe("Late work loses 10% per day.");
  });

  it("falls back to the filename when the heading line is blank", async () => {
    vi.mocked(readdir).mockResolvedValue(["makeup_tests.docx"] as never);
    mocks.docxLoad.mockResolvedValue([doc("   \nBody text here.")]);

    const chunks = await loadDirectoryAsChunks("/kb");

    // Content keeps its blank first line — the splitter is what trims it off the chunk.
    expect(chunks[0].metadata.title).toBe("Makeup Tests");
    expect(chunks[0].pageContent).toBe("Body text here.");
  });

  it("tells DocxLoader which format it is handling", async () => {
    vi.mocked(readdir).mockResolvedValue(["a.docx", "b.doc"] as never);
    mocks.docxLoad.mockResolvedValue([doc("Heading\nbody")]);

    await loadDirectoryAsChunks("/kb");

    expect(mocks.docxArgs).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("a.docx"),
      { type: "docx" },
    );
    expect(mocks.docxArgs).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("b.doc"),
      { type: "doc" },
    );
  });

  it("only strips a heading from the first page of a multi-page file", async () => {
    vi.mocked(readdir).mockResolvedValue(["handbook.pdf"] as never);
    mocks.pdfLoad.mockResolvedValue([
      doc("Grading Policy\npage one body"),
      doc("Second Heading\npage two body"),
    ]);

    const chunks = await loadDirectoryAsChunks("/kb");

    expect(chunks.map((c) => c.pageContent)).toEqual([
      "page one body",
      "Second Heading\npage two body",
    ]);
    expect(chunks.every((c) => c.metadata.title === "Grading Policy")).toBe(
      true,
    );
  });

  it("stamps title and source on every chunk of a split document", async () => {
    vi.mocked(readdir).mockResolvedValue(["long-guide.csv"] as never);
    mocks.csvLoad.mockResolvedValue([doc("sentence. ".repeat(300))]);

    const chunks = await loadDirectoryAsChunks("/kb");

    expect(chunks.length).toBeGreaterThan(1);
    expect(
      chunks.every(
        (c) =>
          c.metadata.title === "Long Guide" &&
          c.metadata.source === "long-guide.csv",
      ),
    ).toBe(true);
  });

  it("accumulates every file in the directory", async () => {
    vi.mocked(readdir).mockResolvedValue(["a.csv", "b.pdf"] as never);
    mocks.csvLoad.mockResolvedValue([doc("csv body")]);
    mocks.pdfLoad.mockResolvedValue([doc("Pdf Heading\npdf body")]);

    const chunks = await loadDirectoryAsChunks("/kb");

    expect(chunks.map((c) => c.metadata.source)).toEqual(["a.csv", "b.pdf"]);
  });

  it("rejects a file type it has no loader for", async () => {
    vi.mocked(readdir).mockResolvedValue(["notes.txt"] as never);

    await expect(loadDirectoryAsChunks("/kb")).rejects.toThrow(
      /Unsupported KB file type/,
    );
  });

  it("returns nothing for an empty directory", async () => {
    vi.mocked(readdir).mockResolvedValue([] as never);

    await expect(loadDirectoryAsChunks("/kb")).resolves.toEqual([]);
  });
});
