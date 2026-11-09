const errorBodyDeadlineMs = 750;

export function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function abortError() {
  return new DOMException("The request was cancelled.", "AbortError");
}

export async function readErrorBody(
  response: Response,
  limit: number,
  signal?: AbortSignal,
): Promise<Record<string, unknown> | undefined> {
  if (!response.body || response.body.locked) {
    if (signal?.aborted) throw abortError();
    return;
  }

  const reader = response.body.getReader();
  const bytes = new Uint8Array(limit);
  const deadline = performance.now() + errorBodyDeadlineMs;
  let consumed = 0;
  let complete = false;

  async function read() {
    while (performance.now() < deadline && !signal?.aborted) {
      const chunk = await reader.read();
      if (performance.now() >= deadline || signal?.aborted) return;
      if (chunk.done) {
        complete = true;
        const body: unknown = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(
            bytes.subarray(0, consumed),
          ),
        );
        return isRecord(body) ? body : undefined;
      }
      if (chunk.value.byteLength > limit - consumed) return;
      bytes.set(chunk.value, consumed);
      consumed += chunk.value.byteLength;
    }
  }

  let stop!: () => void;
  const stopped = new Promise<undefined>((resolve) => {
    stop = () => resolve(undefined);
  });
  const timeout = setTimeout(stop, errorBodyDeadlineMs);
  signal?.addEventListener("abort", stop, { once: true });
  try {
    const body = await Promise.race([read(), stopped]).catch(() => undefined);
    if (signal?.aborted) throw abortError();
    if (performance.now() < deadline) return body;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", stop);
    // A stalled underlying cancellation must not hold up error handling.
    if (!complete) void reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

const failures: Record<string, readonly [number | readonly number[], string]> =
  {
    rate_limited: [429, "Too many requests."],
    admission_unavailable: [503, "The service is temporarily unavailable."],
    service_draining: [503, "The service is pausing new sessions."],
    request_too_large: [413, "The request is too large."],
    invalid_content_length: [400, "The request could not be sent."],
    query_too_large: [414, "The search is too long."],
    headers_too_large: [431, "The request could not be sent."],
    internal_error: [500, "The request could not be completed."],
    unauthorized: [401, "Sign-in expired or credentials were rejected."],
    forbidden: [403, "This staff account cannot access that resource."],
    registration_disabled: [
      403,
      "Clinic registration is currently unavailable.",
    ],
    not_found: [404, "The requested item is no longer available."],
    conflict: [409, "The request conflicts with a saved record."],
    revision_conflict: [
      409,
      "The saved record changed. Reload it before trying again.",
    ],
    idempotency_conflict: [
      409,
      "This request conflicts with an earlier submission. Review it before trying again.",
    ],
    slot_unavailable: [
      409,
      "That appointment time is no longer available. Choose another time.",
    ],
    outside_policy: [
      409,
      "The request is outside the clinic’s scheduling policy.",
    ],
    patient_merged: [
      409,
      "The patient record was merged. Open the retained record.",
    ],
    merge_conflict: [
      409,
      "The patient records changed. Reload them before reviewing the merge.",
    ],
    not_booked: [409, "This appointment is no longer booked."],
    validation_error: [422, "Check the values and try again."],
    validation_failed: [422, "Check the values and try again."],
    timezone_confirmation_required: [
      422,
      "Review and confirm the timezone change.",
    ],
    test_expired: [410, "The isolated test has expired. Start a new test."],
    test_already_active: [
      409,
      "An isolated test is already active for this agent.",
    ],
    test_capacity: [409, "Isolated test capacity is full."],
    voice_busy: [409, "Voice is busy. Try again shortly."],
    voice_unavailable: [[409, 503], "Voice is currently unavailable."],
    voice_urdu_unavailable: [503, "Urdu voice is currently unavailable."],
    upload_too_large: [413, "The upload is too large."],
    upload_checksum: [
      422,
      "The upload could not be verified. Select the file again.",
    ],
    upload_timeout: [408, "The upload timed out. Try again."],
  };

const statusMessages: Record<number, string> = {
  401: "Sign-in expired or credentials were rejected.",
  403: "This staff account cannot access that resource.",
  404: "The requested item is no longer available.",
  409: "The request conflicts with a saved record. Review your changes.",
  413: "The request is too large.",
  422: "Check the values and try again.",
  429: "Too many requests.",
  503: "The service is temporarily unavailable.",
};

export function retryAfter(response: Response) {
  if (response.status !== 429 && response.status !== 503) return;
  const raw = response.headers.get("Retry-After");
  if (!raw || !/^[1-9][0-9]{0,3}$/.test(raw)) return;
  const seconds = Number(raw);
  if (seconds <= 3600) return seconds;
}

export function safeFailure(
  status: number,
  rawCode: unknown,
  seconds?: number,
) {
  const entry =
    typeof rawCode === "string" && Object.hasOwn(failures, rawCode)
      ? failures[rawCode]
      : undefined;
  const allowedStatus = entry?.[0];
  const knownCode =
    typeof allowedStatus === "number"
      ? allowedStatus === status
      : allowedStatus?.includes(status);
  const code =
    knownCode && typeof rawCode === "string" ? rawCode : "request_failed";
  const message =
    (knownCode && entry?.[1]) ||
    statusMessages[status] ||
    "The request could not be completed. Try again.";
  const retryNotice =
    seconds === undefined
      ? ""
      : ` Wait ${seconds} ${seconds === 1 ? "second" : "seconds"} before trying again.`;
  return { code, message: message + retryNotice };
}

export async function fetchResponse(url: string, init: RequestInit) {
  if (init.signal?.aborted) throw abortError();
  try {
    return await fetch(url, init);
  } catch {
    if (init.signal?.aborted) throw abortError();
    throw Error("Could not connect to the service. Try again.");
  }
}

export async function readResponseJson<T>(
  response: Response,
  signal?: AbortSignal,
): Promise<T> {
  try {
    const body = (await response.json()) as T;
    if (signal?.aborted) throw abortError();
    return body;
  } catch {
    if (signal?.aborted) throw abortError();
    throw Error("The service returned an unreadable response. Try again.");
  }
}
