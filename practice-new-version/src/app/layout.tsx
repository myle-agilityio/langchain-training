"use client";

import "./globals.css";
import "@copilotkit/react-core/v2/styles.css";

import { CopilotKit } from "@copilotkit/react-core/v2";
import { ThemeProvider } from "@/hooks/use-theme";
import { OpenAiKeyProvider, readStoredOpenAiKey } from "@/hooks/use-openai-key";
import { OpenAiKeyGate } from "@/components/openai-key-gate";
// A2UI catalog: definitions + renderers in ./declarative-generative-ui/
import { demonstrationCatalog } from "./declarative-generative-ui/renderers";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>CopilotKit</title>
        <link
          rel="icon"
          type="image/svg+xml"
          href="/copilotkit-logo-mark.svg"
        />
        {/*
          Set the theme class BEFORE first paint to avoid a white→dark flash.
          ThemeProvider applies the theme in a useEffect (post-hydration), so
          without this the page paints unthemed (light) first, then flips. This
          blocking inline script matches ThemeProvider's "system" default so
          there's no flash and no class mismatch when the provider re-applies.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.add(d?'dark':'light');}catch(e){}})();",
          }}
        />
      </head>
      {/*
        suppressHydrationWarning: browser extensions (e.g. Grammarly) inject
        attributes like data-gr-ext-installed onto <body> before React hydrates,
        which would otherwise surface as a hydration mismatch on first load.
        This only relaxes the check for <body>'s own attributes (one level deep);
        everything rendered inside <body> is still fully hydration-checked.
      */}
      <body className={`antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <OpenAiKeyProvider>
            <CopilotKit
              runtimeUrl="/api/copilotkit"
              // Read fresh per request rather than from React state, so saving a key in
              // OpenAiKeyGate takes effect on the very next request with no remount — see
              // agent/src/config/model.ts's getApiKeyFromConfig for where this lands
              // server-side (config.configurable.copilotkit_forwarded_headers).
              headers={() => {
                const key = readStoredOpenAiKey();
                const headers: Record<string, string> = {};
                if (key) headers["x-openai-api-key"] = key;
                return headers;
              }}
              inspectorDefaultAnchor={{ horizontal: "right", vertical: "top" }}
              a2ui={{ catalog: demonstrationCatalog }}
              openGenerativeUI={{}}
              useSingleEndpoint={false}
            >
              <OpenAiKeyGate>{children}</OpenAiKeyGate>
            </CopilotKit>
          </OpenAiKeyProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
