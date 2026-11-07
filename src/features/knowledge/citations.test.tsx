import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { KnowledgeCitations } from "./KnowledgeCitations";
import type { KnowledgeTrace } from "../../api/dashboard.generated";
it("bounds returned citations and escapes quotes while showing non-ready decisions", () => {
  const citation = {
    source_id: "source",
    source_name: "Guide",
    chunk_id: "chunk",
    heading: "Arrival",
    language: "ur",
    cosine: 0.72,
    quote: "<img src=x onerror=alert(1)>" + "x".repeat(600),
  };
  const { container, rerender } = render(
    <KnowledgeCitations
      trace={{
        status: "ready",
        // Deliberately malformed server payload tests the runtime display bound.
        citations: Array.from({ length: 6 }, (_, index) => ({
          ...citation,
          chunk_id: String(index),
        })) as unknown as NonNullable<KnowledgeTrace["citations"]>,
      }}
    />,
  );
  expect(container.querySelectorAll("blockquote")).toHaveLength(4);
  expect(container.querySelector("blockquote")?.textContent).toHaveLength(500);
  expect(container.querySelector("img")).toBeNull();
  rerender(
    <KnowledgeCitations
      trace={{
        status: "ready",
        citations: [
          { ...citation, cosine: NaN },
          { ...citation, cosine: 0.4 },
        ],
      }}
    />,
  );
  expect(container.querySelectorAll("blockquote")).toHaveLength(0);
  for (const status of [
    "no_sources",
    "processing_pending",
    "below_threshold",
    "service_unavailable",
    "rejected",
    "stale",
  ] as KnowledgeTrace["status"][]) {
    rerender(<KnowledgeCitations trace={{ status }} />);
    expect(screen.getByRole("region").textContent).not.toContain(
      "Reply grounded",
    );
    expect(
      screen.getByRole("region").querySelector("p")?.textContent,
    ).toBeTruthy();
  }
});
it("does not describe an unavailable corpus as ongoing processing in the trace", () => {
  render(<KnowledgeCitations trace={{ status: "processing_pending" }} />);
  expect(screen.getByRole("region")).toHaveTextContent(
    "No processed knowledge is available. Check source status.",
  );
  expect(screen.getByRole("region")).not.toHaveTextContent("still processing");
});
