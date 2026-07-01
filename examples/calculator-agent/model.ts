import { tools } from "./tools.ts";
import { initChatModel } from "langchain";

const model = await initChatModel(process.env.MODEL, {
  temperature: 0,
});

const modelWithTools = model.bindTools(tools);

export { modelWithTools };
