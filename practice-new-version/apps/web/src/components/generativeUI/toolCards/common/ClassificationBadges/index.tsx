import { Badge } from "@/components/common";
import { cn } from "@/utils";
import {
  COURSE_LABEL,
  TOPIC_LABEL,
  TOPIC_TONE,
  URGENCY_TONE,
  URGENCY_VARIANT,
  WORK_TYPE_LABEL,
} from "@/constants";
import type { Classification } from "@/types";

export const ClassificationBadges = ({
  classification,
}: {
  classification: Classification;
}) => {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Badge
        variant="tone"
        className={cn("text-[10px]", TOPIC_TONE[classification.topic])}
      >
        {TOPIC_LABEL[classification.topic]}
      </Badge>
      {classification.course !== "none" && (
        <Badge variant="outline" className="text-[10px]">
          {COURSE_LABEL[classification.course]}
        </Badge>
      )}
      {classification.workType !== "none" && (
        <Badge variant="outline" className="text-[10px]">
          {WORK_TYPE_LABEL[classification.workType]}
        </Badge>
      )}
      <Badge
        variant={URGENCY_VARIANT[classification.urgency]}
        className={cn("text-[10px]", URGENCY_TONE[classification.urgency])}
      >
        {classification.urgency}
      </Badge>
    </div>
  );
};
