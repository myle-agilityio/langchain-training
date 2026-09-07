// localStorage keys — each one is a persisted store's `name`, so renaming a value here drops
// whatever that store had saved in every visitor's browser.
export const STORAGE_KEY = {
  openAIKey: "openai_api_key",
  theme: "theme",
  chatModel: "chat_model_id",
  userId: "user_id",
} as const;
