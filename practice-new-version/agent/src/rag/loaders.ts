import { readdir } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 800, chunkOverlap: 100 });

function titleFromFilename(file: string): string {
  return basename(file, extname(file))
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function loadFile(filePath: string): Promise<Document[]> {
  switch (extname(filePath).toLowerCase()) {
    case ".pdf": {
      const { PDFLoader } = await import("@langchain/community/document_loaders/fs/pdf");
      return new PDFLoader(filePath).load();
    }
    case ".csv": {
      const { CSVLoader } = await import("@langchain/community/document_loaders/fs/csv");
      return new CSVLoader(filePath).load();
    }
    case ".docx":
    case ".doc": {
      const { DocxLoader } = await import("@langchain/community/document_loaders/fs/docx");
      const type = extname(filePath).toLowerCase() === ".doc" ? "doc" : "docx";
      return new DocxLoader(filePath, { type }).load();
    }
    default:
      throw new Error(`Unsupported KB file type: ${filePath}`);
  }
}

// Loads every file in `dir` (PDF/DOCX/DOC/CSV), titles each from its filename, and chunks for
// embedding — mirrors the seed articles' {title, content} shape so searchKnowledge needs no changes.
export async function loadDirectoryAsChunks(dir: string): Promise<Document[]> {
  const files = await readdir(dir);
  const docs: Document[] = [];
  for (const file of files) {
    const loaded = await loadFile(join(dir, file));
    console.log('loaded', loaded)
    const title = titleFromFilename(file);
    for (const d of loaded) d.metadata = { ...d.metadata, title, source: file };
    docs.push(...loaded);
  }
  return splitter.splitDocuments(docs);
}
