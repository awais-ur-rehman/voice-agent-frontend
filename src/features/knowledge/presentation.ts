export const queryReason: Record<string, string> = {
  ready: "Matching knowledge",
  no_sources: "No processed knowledge sources are available.",
  processing_pending: "Knowledge is still processing.",
  below_threshold: "No sufficiently relevant knowledge was found.",
  service_unavailable: "Knowledge search is unavailable. Try again later.",
  disabled: "Knowledge search is disabled.",
  rejected: "The answer could not be validated against its sources.",
  stale: "The sources changed before the answer was validated.",
};
