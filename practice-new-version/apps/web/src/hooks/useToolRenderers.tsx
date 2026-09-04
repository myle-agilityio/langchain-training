import { z } from "zod";
import { useRenderTool } from "@copilotkit/react-core/v2";

import { TOOL } from "@repo/constants";
import {
  ClassifyEmailsCard,
  CountEmailsCard,
  GetEmailsCard,
  SearchKnowledgeBaseCard,
  UpdateContactProfileCard,
  UpdateEmailStatusCard,
} from "@/components/generativeUI/toolCards";

// Mirrors the agent's EmailFilterSchema — only shapes props.parameters for the renderer.
const filterSchema = z.object({
  id: z.string().optional(),
  status: z
    .enum(["unread", "read", "replied", "flagged_for_followup"])
    .optional(),
  topic: z
    .enum([
      "question",
      "submission",
      "review_request",
      "grade_dispute",
      "absence",
      "scheduling",
      "admin",
      "complex",
    ])
    .optional(),
  course: z.enum(["math_11", "math_12", "none"]).optional(),
  workType: z
    .enum([
      "practice",
      "exercise",
      "homework",
      "quiz",
      "test",
      "project",
      "none",
    ])
    .optional(),
  urgency: z.enum(["low", "medium", "high"]).optional(),
  unclassified: z.boolean().optional(),
  sender: z.string().optional(),
  search: z.string().optional(),
  receivedAfter: z.string().optional(),
  receivedBefore: z.string().optional(),
});

const manageableStatusSchema = z.enum([
  "unread",
  "read",
  "flagged_for_followup",
]);

// Per-tool cards for the agent's inbox tools; a name-scoped renderer wins over the
// wildcard in useGenerativeUIExamples, so unlisted tools fall back to ToolReasoning.
export const useToolRenderers = () => {
  useRenderTool(
    {
      name: TOOL.GET_EMAILS,
      parameters: z.object({ filter: filterSchema.optional() }),
      render: (props) => <GetEmailsCard {...props} />,
    },
    [],
  );

  useRenderTool(
    {
      name: TOOL.COUNT_EMAILS,
      parameters: z.object({
        filter: filterSchema.optional(),
        groupBy: z
          .enum(["status", "topic", "course", "workType", "urgency"])
          .optional(),
      }),
      render: (props) => <CountEmailsCard {...props} />,
    },
    [],
  );

  useRenderTool(
    {
      name: TOOL.CLASSIFY_EMAILS,
      parameters: z.object({ ids: z.array(z.string()) }),
      render: (props) => <ClassifyEmailsCard {...props} />,
    },
    [],
  );

  useRenderTool(
    {
      name: TOOL.UPDATE_EMAIL_STATUS,
      parameters: z.object({
        patches: z.array(
          z.object({ id: z.string(), status: manageableStatusSchema }),
        ),
      }),
      render: (props) => <UpdateEmailStatusCard {...props} />,
    },
    [],
  );

  useRenderTool(
    {
      name: TOOL.SEARCH_KNOWLEDGE_BASE,
      parameters: z.object({ query: z.string() }),
      render: (props) => <SearchKnowledgeBaseCard {...props} />,
    },
    [],
  );

  useRenderTool(
    {
      name: TOOL.UPDATE_CONTACT_PROFILE,
      parameters: z.object({
        sender: z.string(),
        tone: z.string().optional(),
        facts: z.array(z.string()).optional(),
      }),
      render: (props) => <UpdateContactProfileCard {...props} />,
    },
    [],
  );
};
