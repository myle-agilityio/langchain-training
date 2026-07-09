import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { EmailClassification } from "@/types/types";

export interface EmailAnalysisCardProps extends EmailClassification {
  emailId: string;
}

const urgencyVariant: Record<EmailClassification["urgency"], "secondary" | "default"> = {
  low: "secondary",
  medium: "secondary",
  high: "default",
  critical: "default",
};

export function EmailAnalysisCard({ intent, urgency, topic, summary }: EmailAnalysisCardProps) {
  return (
    <Card className="max-w-lg w-full mx-auto mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--muted-foreground)]" />
          <CardTitle className="text-base">Email analysis</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Intent: {intent}</Badge>
          <Badge variant={urgencyVariant[urgency]}>Urgency: {urgency}</Badge>
          <Badge variant="outline">{topic}</Badge>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">{summary}</p>
      </CardContent>
    </Card>
  );
}
