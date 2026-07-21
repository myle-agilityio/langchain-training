import { AIMessage, SystemMessage } from "@langchain/core/messages";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import { copilotkitMiddleware } from "@copilotkit/sdk-js/langgraph";

/**
 * CopilotKit ships its LangGraph integration as a *`createAgent` middleware*
 * (`copilotkitMiddleware`), but Phase 2 moves us to an explicit `StateGraph`, which has no
 * middleware runner. Rather than reimplement what that middleware does — inject
 * `useCopilotReadable` context, merge frontend tools from `state.copilotkit.actions` into the
 * model call, split frontend tool calls back out so the browser (not the graph) executes them —
 * this module calls the middleware's own hooks by hand from plain graph nodes. Behaviour stays
 * exactly CopilotKit's; only who invokes the hooks changes.
 *
 * Everything here is loosely typed on purpose: the hook signatures are generic over
 * `createAgent`'s inferred state/context types, which a hand-built graph can't reproduce.
 * The casts are confined to this file so the graph in agent.ts stays readable.
 */

// Middleware hooks are declared as `fn | { hook, canJumpTo }`. CopilotKit passes bare
// functions today; normalize anyway so switching to the object form wouldn't silently no-op.
type Hook<T> = T | { hook: T } | undefined;
function hookFn<T>(hook: Hook<T>): T | undefined {
  if (typeof hook === "function") return hook as T;
  return (hook as { hook: T } | undefined)?.hook;
}

/**
 * `createAgent` builds a langchain `Runtime` from the node's config before calling any hook.
 * A raw StateGraph node gets those same fields on its `LangGraphRunnableConfig`, so rebuild
 * the object the same way here.
 */
function toRuntime(config: LangGraphRunnableConfig) {
  return Object.freeze({
    context: config.context,
    store: config.store,
    configurable: config.configurable,
    writer: config.writer,
    interrupt: config.interrupt,
    signal: config.signal,
  }) as never;
}

/** The graph's real state is a superset of what these hooks read. */
type AnyState = Record<string, any>;

/**
 * `beforeAgent` — folds `useCopilotReadable` app context into the message list as a system
 * message, upserting it so repeated turns don't stack duplicate copies.
 */
export async function prepareContext(
  state: AnyState,
  config: LangGraphRunnableConfig,
) {
  const beforeAgent = hookFn(copilotkitMiddleware.beforeAgent);
  return (await beforeAgent?.(state as never, toRuntime(config))) ?? {};
}

/**
 * The model node. Frontend tools aren't in the static `tools` array — `wrapModelCall` merges
 * them in from `state.copilotkit.actions` per turn, which is the whole reason the model call
 * goes through the middleware instead of calling `model.invoke` directly.
 */
export function createCallModel({
  model,
  tools,
  systemPrompt,
  prepareMessages,
}: {
  model: BaseChatModel;
  tools: unknown[];
  // A function when the prompt depends on graph state — that's how short-term memory reaches
  // the model: the summary and working-context blocks are rebuilt on every model call.
  systemPrompt: string | ((state: AnyState) => string);
  /**
   * Shapes the message list the model sees, without touching `state.messages` (LangGraph's
   * `pre_model_hook` pattern). Kept separate from the stored history because CopilotKit
   * renders the chat from state — trimming there would erase the user's scrollback.
   */
  prepareMessages?: (state: AnyState) => unknown[];
}) {
  return async function callModel(state: AnyState, config: LangGraphRunnableConfig) {
    const runtime = toRuntime(config);
    const prompt =
      typeof systemPrompt === "function" ? systemPrompt(state) : systemPrompt;
    const messages = prepareMessages ? prepareMessages(state) : state.messages;

    const invokeModel = async (request: AnyState): Promise<AIMessage> => {
      // `wrapModelCall` rewrites `systemPrompt` into a SystemMessage when the middleware is
      // configured to expose graph state to the LLM, so accept either shape.
      const prompt =
        typeof request.systemPrompt === "string"
          ? request.systemPrompt
          : String(request.systemPrompt?.content ?? "");
      const bound = request.tools?.length
        ? model.bindTools!(request.tools, request.modelSettings)
        : model;
      // `config` is threaded through explicitly so LangGraph's `messages` stream mode picks up
      // the model's token callbacks — that's what streams assistant text into the chat UI.
      return (await bound.invoke(
        [new SystemMessage(prompt), ...request.messages],
        config,
      )) as AIMessage;
    };

    const aiMessage = (await copilotkitMiddleware.wrapModelCall!(
      {
        model,
        tools,
        messages,
        systemPrompt: prompt,
        systemMessage: new SystemMessage(prompt),
        state,
        runtime,
      } as never,
      invokeModel as never,
    )) as AIMessage;

    // `afterModel` looks at the *last* message to find frontend tool calls, so hand it state as
    // it will look once this node's update lands. When it returns an update, that update already
    // carries the rewritten message list — pass it through instead of appending again.
    const afterModel = hookFn(copilotkitMiddleware.afterModel);
    const update = await afterModel?.(
      { ...state, messages: [...state.messages, aiMessage] } as never,
      runtime,
    );
    return update ?? { messages: [aiMessage] };
  };
}

/**
 * `afterAgent` — puts the intercepted frontend tool calls back onto the AI message before the
 * run ends, so CopilotKit's frontend sees them and executes them client-side.
 */
export async function restoreFrontendToolCalls(
  state: AnyState,
  config: LangGraphRunnableConfig,
) {
  const afterAgent = hookFn(copilotkitMiddleware.afterAgent);
  return (await afterAgent?.(state as never, toRuntime(config))) ?? {};
}
