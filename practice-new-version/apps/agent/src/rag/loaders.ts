import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 800,
  chunkOverlap: 100,
});

const titleFromFilename = (file: string): string => {
  return basename(file, extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// PDF/DOCX extraction keeps the document's own heading as the first line of pageContent —
// pull it out as the title so it isn't duplicated inside the embedded content.
const extractHeading = (content: string): { title: string; rest: string } => {
  const newlineIndex = content.indexOf("\n");

  if (newlineIndex === -1) {
    return { title: content.trim(), rest: "" };
  }

  return {
    title: content.slice(0, newlineIndex).trim(),
    rest: content.slice(newlineIndex + 1).replace(/^\n+/, ""),
  };
};

const loadFile = async (filePath: string): Promise<Document[]> => {
  switch (extname(filePath).toLowerCase()) {
    case ".pdf": {
      const { PDFLoader } =
        await import("@langchain/community/document_loaders/fs/pdf");

      return new PDFLoader(filePath).load();
    }

    case ".csv": {
      const { CSVLoader } =
        await import("@langchain/community/document_loaders/fs/csv");

      return new CSVLoader(filePath).load();
    }

    case ".docx":
    case ".doc": {
      const { DocxLoader } =
        await import("@langchain/community/document_loaders/fs/docx");
      const type = extname(filePath).toLowerCase() === ".doc" ? "doc" : "docx";

      return new DocxLoader(filePath, { type }).load();
    }

    default:
      throw new Error(`Unsupported KB file type: ${filePath}`);
  }
};

// Loads every file in `dir` (PDF/DOCX/DOC/CSV), titles each from its heading (falling back to the
// filename), and chunks for embedding — mirrors the seed articles' {title, content} shape.
export const loadDirectoryAsChunks = async (
  dir: string,
): Promise<Document[]> => {
  const files = await readdir(dir);
  const docs: Document[] = [];

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    const loaded = await loadFile(join(dir, file));
    const hasHeading = ext === ".pdf" || ext === ".docx" || ext === ".doc";
    let title = titleFromFilename(file);

    if (hasHeading && loaded[0]) {
      const heading = extractHeading(loaded[0].pageContent);

      if (heading.title) {
        title = heading.title;
        loaded[0].pageContent = heading.rest;
      }
    }

    for (const d of loaded) {
      d.metadata = { ...d.metadata, title, source: file };
    }

    docs.push(...loaded);
  }

  return splitter.splitDocuments(docs);
};
