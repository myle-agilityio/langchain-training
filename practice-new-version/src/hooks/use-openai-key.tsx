import { createContext, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "openai_api_key";

// Read directly (not through this hook's state) by anything that needs the key outside React,
// e.g. the CopilotKit `headers` callback and plain fetch() calls — see layout.tsx and
// use-self-managed-threads.tsx.
export function readStoredOpenAiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

interface OpenAiKeyValue {
  // undefined = haven't checked localStorage yet (first paint/SSR); null = checked, no key.
  apiKey: string | null | undefined;
  setApiKey: (key: string) => void;
  clearApiKey: () => void;
}

const OpenAiKeyContext = createContext<OpenAiKeyValue>({
  apiKey: undefined,
  setApiKey: () => {},
  clearApiKey: () => {},
});

export function OpenAiKeyProvider({ children }: { children: React.ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setApiKeyState(readStoredOpenAiKey());
  }, []);

  const setApiKey = (key: string) => {
    window.localStorage.setItem(STORAGE_KEY, key);
    setApiKeyState(key);
  };

  const clearApiKey = () => {
    window.localStorage.removeItem(STORAGE_KEY);
    setApiKeyState(null);
  };

  return (
    <OpenAiKeyContext.Provider value={{ apiKey, setApiKey, clearApiKey }}>
      {children}
    </OpenAiKeyContext.Provider>
  );
}

export const useOpenAiKey = () => useContext(OpenAiKeyContext);
