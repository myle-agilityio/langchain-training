import { create } from "zustand";
import { STORAGE_KEY } from "@/constants";

// localStorage throws in some privacy modes; falling back to a fresh id just means it won't
// persist across reloads there.
const readOrCreate = (): string => {
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY.userId);

    if (existing) {
      return existing;
    }

    const id = crypto.randomUUID();

    window.localStorage.setItem(STORAGE_KEY.userId, id);

    return id;
  } catch {
    return crypto.randomUUID();
  }
};

interface UserIdState {
  userId: string;
}

// One id per browser, generated once and persisted — every /api/threads request is scoped to it
// (see USER_ID_HEADER) so each visitor only ever sees their own thread list.
export const useUserId = create<UserIdState>(() => ({
  userId: readOrCreate(),
}));
