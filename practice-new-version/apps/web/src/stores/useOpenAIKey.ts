import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEY } from "@/constants";

interface OpenAIKeyState {
  apiKey: string | null;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

// The one source of truth for the visitor's key. Outside React (CopilotKit's headers callback,
// plain fetch) read useOpenAIKey.getState().apiKey — never localStorage directly.
export const useOpenAIKey = create<OpenAIKeyState>()(
  persist(
    (set) => ({
      apiKey: null,
      setApiKey: (apiKey) => set({ apiKey }),
      clearApiKey: () => set({ apiKey: null }),
    }),
    { name: STORAGE_KEY.openAIKey },
  ),
);
