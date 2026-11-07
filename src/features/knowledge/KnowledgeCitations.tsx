import type { KnowledgeTrace } from "../../api/dashboard.generated";
import { queryReason } from "./presentation";
export function KnowledgeCitations({
  trace,
}: {
  trace: KnowledgeTrace | null;
}) {
  if (!trace) return null;
  const citations = (trace.citations ?? [])
    .filter(
      (citation) =>
        Number.isFinite(citation.cosine) &&
        citation.cosine >= 0.55 &&
        citation.cosine <= 1.000001,
    )
    .slice(0, 4);
  return (
    <section
      className="knowledge-search"
      aria-label="Knowledge used in this reply"
    >
      <h3>Knowledge used in this reply</h3>
      <p>
        {trace.status === "ready"
          ? "Reply grounded in the returned sources."
          : queryReason[trace.status]}
      </p>
      {citations.map((citation) => (
        <article
          className="knowledge-match"
          key={`${citation.source_id}:${citation.chunk_id}`}
        >
          <strong dir="auto">{citation.source_name.slice(0, 200)}</strong>
          {citation.heading && (
            <p dir="auto">{citation.heading.slice(0, 200)}</p>
          )}
          <blockquote
            className="knowledge-excerpt"
            dir="auto"
            lang={citation.language === "ur" ? "ur" : "en"}
          >
            {citation.quote.slice(0, 500)}
          </blockquote>
        </article>
      ))}
    </section>
  );
}
