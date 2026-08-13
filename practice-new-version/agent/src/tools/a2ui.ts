import { z } from "zod";
import { tool, type ToolRuntime } from "@langchain/core/tools";
import { SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import {
  createSurface,
  render,
  updateComponents,
  updateDataModel,
} from "@/utils/a2ui";

// Must match createCatalog's catalogId in src/app/declarative-generative-ui/renderers.tsx —
// the frontend only knows how to render surfaces tagged with this id.
const CUSTOM_CATALOG_ID = "copilotkit://app-dashboard-catalog";

const renderA2uiSchema = z.object({
  surfaceId: z.string(),
  components: z.array(z.record(z.any())),
  data: z.record(z.any()).optional(),
});

// Wire shape (v0.9, flat): each entry is { id, component: "<Name>", ...props as sibling keys
// (not nested) }. One entry must have id "root". "child"/"children" reference other entries'
// ids (string, or string[]) — never itself, and the graph must be acyclic.
//
// This is the ONLY place the secondary LLM below learns what it can render — keep it in sync
// with demonstrationCatalogDefinitions (src/app/declarative-generative-ui/definitions.ts).
const renderA2ui = tool(async () => "rendered", {
  name: "render_a2ui",
  description: `Render a dynamic A2UI v0.9 surface. components is a flat array; exactly one \
entry must have id "root". Every entry needs a unique "id" and a "component" naming one of the \
types below, with that type's props as sibling keys on the same object (not nested under \
"props"). "child"/"children" reference other entries by id — never the entry's own id.

Available components (this catalog only — do not invent others):
- Title — text (string), level? ("h1"|"h2"|"h3", default "h2")
- Row — children (string[] of ids), gap? (number, default 16), align?, justify? ("start"|"center"|"end"|"spaceBetween")
- Column — children (string[] of ids), gap? (number, default 12), align?
- DashboardCard — title (string), subtitle? (string), child? (id of one content component, e.g. a chart or Metric)
- Metric — label (string), value (string), trend? ("up"|"down"|"neutral"), trendValue? (string)
- PieChart — data (array of { label: string, value: number, color?: string }), innerRadius? (number, default 40)
- BarChart — data (array of { label: string, value: number }), color? (string)
- Badge — text (string), variant? ("success"|"warning"|"error"|"info"|"neutral")
- DataTable — columns (array of { key: string, label: string }), rows (array of objects keyed by column key)
- Button — child (id of a Title for the label), variant? ("primary"|"secondary"|"ghost"), action? ({ event: { name: string, context?: object } } or null)

For a metrics/breakdown dashboard: put real numbers directly in each component's props (this \
catalog has no path-bound data model, so "data" is normally unnecessary) — one DashboardCard \
per section, Metric for a single figure, PieChart/BarChart for a per-field breakdown, laid out \
with Row/Column under the root.`,
  schema: renderA2uiSchema,
});

const DynamicStateSchema = z.object({
  messages: z.array(z.any()).default(() => []),
  copilotkit: z
    .object({
      context: z
        .array(z.object({ value: z.string().optional() }).passthrough())
        .optional(),
    })
    .passthrough()
    .optional(),
});

export const generate_a2ui = tool(
  async (
    _input: Record<string, never>,
    runtime: ToolRuntime<typeof DynamicStateSchema>,
  ) => {
    const messages = (runtime.state.messages ?? []).slice(0, -1);
    const contextEntries = runtime.state.copilotkit?.context ?? [];
    const contextText = contextEntries
      .map((e) => (e && typeof e === "object" ? (e.value ?? "") : ""))
      .filter(Boolean)
      .join("\n\n");

    const model = new ChatOpenAI({ model: "gpt-4.1" });
    const modelWithTool = model.bindTools!([renderA2ui], {
      tool_choice: "render_a2ui",
    });

    const response = await modelWithTool.invoke([
      new SystemMessage({ content: contextText }),
      ...(messages as never[]),
    ]);

    const toolCalls = (
      response as { tool_calls?: Array<{ args: Record<string, unknown> }> }
    ).tool_calls;
    if (!toolCalls || toolCalls.length === 0) {
      return JSON.stringify({ error: "LLM did not call render_a2ui" });
    }

    const args = toolCalls[0].args as {
      surfaceId?: string;
      components?: unknown[];
      data?: Record<string, unknown>;
    };

    const surfaceId = args.surfaceId ?? "dynamic-surface";
    const components = args.components ?? [];
    const data = args.data ?? {};

    // Always this app's catalog — never trust the secondary LLM to pick a catalogId, since a
    // wrong one silently fails to render (frontend only recognizes this exact id).
    const ops = [
      createSurface(surfaceId, CUSTOM_CATALOG_ID),
      updateComponents(surfaceId, components),
    ];
    if (Object.keys(data).length > 0) {
      ops.push(updateDataModel(surfaceId, data));
    }
    return render(ops);
  },
  {
    name: "generate_a2ui",
    description:
      "Render a visual dashboard in the chat — metric tiles and pie/bar charts — for a request " +
      "to see, show, or visualize the inbox (e.g. a breakdown by topic and urgency). This tool " +
      "does not fetch or aggregate inbox data itself: it only turns numbers already in this " +
      "conversation into UI. For a breakdown/count dashboard, call count_emails FIRST, as an " +
      "earlier step — once per field being broken down (e.g. one call with groupBy: \"topic\", " +
      "a separate call with groupBy: \"urgency\") — so the real per-category counts are already " +
      "in the conversation before this runs. Do not use get_emails for this: reading raw email " +
      "text makes the dashboard invent its own categories and numbers instead of using the " +
      "real classification counts. This also can't see a sibling tool call's result from the " +
      "same turn, so the count(s) must land in an earlier step, not alongside this call.",
    schema: z.object({}),
  },
);
