import { create } from "zustand";

const STORAGE_KEY = "openai_api_key";

// localStorage throws in some privacy modes; a missing key just means "not entered yet".
const readStored = (): string | null => {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

interface OpenAiKeyState {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

// The one source of truth for the visitor's key. Outside React (CopilotKit's headers callback,
// plain fetch) read useOpenAiKey.getState().apiKey — never localStorage directly.
export const useOpenAiKey = create<OpenAiKeyState>((set) => ({
  apiKey: readStored(),
  setApiKey: (apiKey) => {
    window.localStorage.setItem(STORAGE_KEY, apiKey);
    set({ apiKey });
  },
  clearApiKey: () => {
    window.localStorage.removeItem(STORAGE_KEY);
    set({ apiKey: null });
  },
}));
