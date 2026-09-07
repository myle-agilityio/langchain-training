import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL_ID,
  type ChatModelId,
} from "@repo/constants";
import { STORAGE_KEY } from "@/constants";

const isChatModelId = (value: unknown): value is ChatModelId =>
  CHAT_MODEL_OPTIONS.some((option) => option.id === value);

interface ChatModelState {
  modelId: ChatModelId;
  setModelId: (id: ChatModelId) => void;
}

// The one source of truth for the teacher's picked chat model. Outside React (CopilotKit's
// headers callback) read useChatModel.getState().modelId — never localStorage directly.
export const useChatModel = create<ChatModelState>()(
  persist(
    (set) => ({
      modelId: DEFAULT_CHAT_MODEL_ID,
      setModelId: (modelId) => set({ modelId }),
    }),
    {
      name: STORAGE_KEY.chatModel,
      // A stored id can outlive its entry in CHAT_MODEL_OPTIONS — fall back rather than send it.
      merge: (persisted, current) => {
        const { modelId } = (persisted ?? {}) as Partial<ChatModelState>;

        return {
          ...current,
          modelId: isChatModelId(modelId) ? modelId : current.modelId,
        };
      },
    },
  ),
);
