import { create } from "zustand";

const STORAGE_KEY = "openai_api_key";

// Read directly (not via store state) by anything needing the key outside React,
// e.g. CopilotKit's `headers` callback and plain fetch() calls.
export const readStoredOpenAiKey = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
};

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
