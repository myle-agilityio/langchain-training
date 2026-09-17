import { useMemo } from "react";
import { CopilotKit } from "@copilotkit/react-core/v2";
import { useChatModel, useOpenAIKey, useUserId } from "@/stores";
import {
  CHAT_MODEL_HEADER,
  OPENAI_API_KEY_HEADER,
  USER_ID_HEADER,
} from "@repo/constants";
import {
  // A2UI catalog: definitions + renderers in @/components/declarativeGenerativeUI/
  demonstrationCatalog,
  Toaster,
} from "@/components";
import { KeyGateOverlay } from "@/components/openAIKey";
import { useSyncTheme } from "@/hooks";
import { Inbox } from "@/pages";

export const Root = () => {
  useSyncTheme();
  // Subscribed, not read on demand: CopilotKit re-evaluates `headers` only when its own provider
  // re-renders, so without this a changed key/model kept using the old one until a reload.
  const apiKey = useOpenAIKey((s) => s.apiKey);
  const modelId = useChatModel((s) => s.modelId);
  const userId = useUserId((s) => s.userId);
  const headers = useMemo(
    (): Record<string, string> => ({
      ...(apiKey ? { [OPENAI_API_KEY_HEADER]: apiKey } : {}),
      [CHAT_MODEL_HEADER]: modelId,
      // Lets the graph scope per-visitor memory (see agent's config/model.ts) the same way
      // /api/threads already does.
      [USER_ID_HEADER]: userId,
    }),
    [apiKey, modelId, userId],
  );

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      // Forwarded to the graph as copilotkit_forwarded_headers — see agent/src/config/model.ts.
      headers={headers}
      // Inert — positioning is forced via CSS override in globals.css instead;
      // left in place to state intent in case CopilotKit fixes the bug.
      inspectorDefaultAnchor={{ horizontal: "left", vertical: "bottom" }}
      a2ui={{ catalog: demonstrationCatalog }}
      openGenerativeUI={{}}
      useSingleEndpoint={false}
    >
      <Inbox />
      {/* Blocks the whole app, until a key is saved. */}
      {!apiKey && <KeyGateOverlay />}
      {/* One mount for every toast the query client raises. */}
      <Toaster />
    </CopilotKit>
  );
};
