import { generate_a2ui } from "./a2ui";
import { classify_emails, classifyEmail } from "./classifyEmails";
import { count_emails } from "./countEmails";
import { get_emails } from "./getEmails";
import { reply_to_email } from "./replyToEmail";
import { search_knowledge_base } from "./searchKnowledgeBase";
import { update_contact_profile } from "./updateContactProfile";
import { update_email_status } from "./updateEmailStatus";

export { classifyEmail };
export { generate_a2ui };

// Tools the model may call; reply_to_email is routing-only.
export const modelTools = [
  get_emails,
  count_emails,
  classify_emails,
  update_email_status,
  search_knowledge_base,
  update_contact_profile,
  generate_a2ui,
  reply_to_email,
];

// Tools the ToolNode actually runs.
export const executableTools = [
  get_emails,
  count_emails,
  classify_emails,
  update_email_status,
  search_knowledge_base,
  update_contact_profile,
  generate_a2ui,
];
