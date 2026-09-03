import { BookOpen } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
} from "@/components";
import { useKnowledgeSearch } from "@/hooks";

interface RelatedArticlesProps {
  query: string;
}

// Surfaces KB articles relevant to the open email — GET /api/knowledge, no LLM turn spent.
export const RelatedArticles = ({ query }: RelatedArticlesProps) => {
  const { articles, isLoading, isError } = useKnowledgeSearch(query);

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <BookOpen className="h-4 w-4 text-muted-foreground" />
        <CardTitle className="text-sm">Related knowledge</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <Spinner size="sm" />
        ) : isError ? (
          <p className="text-sm text-muted-foreground">
            Couldn't load related knowledge-base articles.
          </p>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No related knowledge-base articles found.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {articles.map((article, index) => (
              <li key={index}>
                <p className="text-sm font-medium text-foreground">
                  {article.title}
                </p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {article.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
