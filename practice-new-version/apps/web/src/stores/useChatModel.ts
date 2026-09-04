import { create } from "zustand";
import {
  CHAT_MODEL_OPTIONS,
  DEFAULT_CHAT_MODEL_ID,
  type ChatModelId,
} from "@repo/constants";

const STORAGE_KEY = "chat_model_id";

const isChatModelId = (value: string | null): value is ChatModelId =>
  value !== null && CHAT_MODEL_OPTIONS.some((option) => option.id === value);

// localStorage throws in some privacy modes; an invalid/missing value just falls back to default.
const readStored = (): ChatModelId => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    return isChatModelId(stored) ? stored : DEFAULT_CHAT_MODEL_ID;
  } catch {
    return DEFAULT_CHAT_MODEL_ID;
  }
};

interface ChatModelState {
  modelId: ChatModelId;
  setModelId: (id: ChatModelId) => void;
}

// The one source of truth for the teacher's picked chat model. Outside React (CopilotKit's
// headers callback) read useChatModel.getState().modelId — never localStorage directly.
export const useChatModel = create<ChatModelState>((set) => ({
  modelId: readStored(),
  setModelId: (modelId) => {
    window.localStorage.setItem(STORAGE_KEY, modelId);
    set({ modelId });
  },
}));
