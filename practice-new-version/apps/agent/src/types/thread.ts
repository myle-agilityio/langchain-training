// Mirrors src/types/thread.ts in the frontend — duplicated because agent/ and the frontend are separate packages with no shared workspace.
export interface ChatThread {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}
