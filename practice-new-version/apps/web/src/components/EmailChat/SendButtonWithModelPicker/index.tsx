import { CopilotChatInput } from "@copilotkit/react-core/v2";
import type { ComponentProps } from "react";
import { ModelPicker } from "@/components/ModelPicker";

type SendButtonProps = ComponentProps<typeof CopilotChatInput.SendButton>;

export const SendButtonWithModelPicker = (props: SendButtonProps) => (
  <div className="flex items-center gap-1">
    <ModelPicker />
    <CopilotChatInput.SendButton {...props} />
  </div>
);
