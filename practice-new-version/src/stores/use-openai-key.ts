import { create } from "zustand";

const STORAGE_KEY = "openai_api_key";

// Read directly (not through this store's state) by anything that needs the key outside React,
// e.g. the CopilotKit `headers` callback and plain fetch() calls — see App.tsx and
// use-self-managed-threads.ts.
export function readStoredOpenAiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

interface OpenAiKeyState {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

export const useOpenAiKey = create<OpenAiKeyState>((set) => ({
  apiKey: readStoredOpenAiKey(),
  setApiKey: (key) => {
    window.localStorage.setItem(STORAGE_KEY, key);
    set({ apiKey: key });
  },
  clearApiKey: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({ apiKey: null });
  },
}));
