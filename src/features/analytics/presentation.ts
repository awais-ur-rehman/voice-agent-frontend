import type {
  HourCount,
  Ratio,
  Reason,
  CallView,
} from "../../api/dashboard.generated";
const labels: Record<string, string> = {
  raw_retention: "Outside the 90-day measurement window",
  sample_limit: "More than 100,000 samples",
  user: "Caller",
  assistant: "Assistant",
  en: "English",
  ur: "Urdu",
  mixed: "Mixed",
  native: "Voice client",
  caller_end: "Caller ended",
  staff_end: "Staff ended",
  timeout: "Timed out",
  disconnect: "Disconnected",
  info_only: "Information only",
  book: "Booking",
  cancel: "Cancellation",
  reschedule: "Reschedule",
  "turn.user": "Caller turn",
  "turn.assistant": "Assistant reply",
  "tool.called": "Tool started",
  "tool.result": "Tool result",
  command_total: "Command total",
  llm_completion: "LLM completion",
  llm_first_token: "LLM first token",
  stt_completion: "STT completion",
  tts_first_byte: "TTS first byte",
  end_of_speech_to_audio: "Speech end to audio",
  tts_buffered_generation: "TTS buffered generation",
  audio_queue: "Audio queue",
  end_of_speech_to_audio_queue: "Speech end to audio queue",
  low_stt_confidence: "Low STT confidence",
};
export const label = (value: string) =>
  labels[value] ??
  value
    .replaceAll("_", " ")
    .replaceAll(".", " · ")
    .replace(/^./, (c) => c.toUpperCase());
export function offsetLabel(offset: number) {
  return `UTC${offset < 0 ? "−" : "+"}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
}
export function money(value: string | null) {
  if (value === null) return "Unknown";
  const n = Number(value);
  if (n === 0) return "USD 0";
  if (n < 0.000001) return "< USD 0.000001";
  return `USD ${n.toLocaleString("en-US", { maximumFractionDigits: 6 })}`;
}
export function ratio(r: Ratio, percent = true) {
  return `${r.value === null ? "Unknown" : percent ? `${(r.value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%` : r.value.toLocaleString("en-US", { maximumFractionDigits: 2 })} · ${r.numerator} / ${r.denominator}`;
}
export const ms = (value: number | null) =>
  value === null
    ? "Unknown"
    : value > 0 && value < 0.1
      ? "< 0.1 ms"
      : `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ms`;
export const utc = (value: string | null) =>
  value
    ? `${new Date(value).toISOString().replace("T", " ").replace(".000Z", " UTC")}`
    : "Not available";
export function hourLabel(
  row: Pick<HourCount, "bucket_start" | "utc_offset_minutes" | "timezone">,
) {
  const offset = row.utc_offset_minutes;
  const local = new Date(Date.parse(row.bucket_start) + offset * 60000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
  return `${local} · ${row.timezone} · ${offsetLabel(offset)}`;
}
export function rangeError(
  start: string,
  end: string,
  today = new Date().toISOString().slice(0, 10),
) {
  const a = Date.parse(start),
    b = Date.parse(end),
    now = Date.parse(today);
  if (!Number.isFinite(a) || !Number.isFinite(b))
    return "Choose valid start and end dates.";
  if (a > b) return "End date must be on or after start date.";
  if ((b - a) / 86400000 >= 31) return "Choose at most 31 inclusive dates.";
  if (a < now - 365 * 86400000) return "Choose dates within the last 365 days.";
  if (b > now) return "End date cannot be in the future.";
  return "";
}
export const privacyCopy: Record<Reason, string> = {
  off: "Capture was off when this session started. No transcript was retained.",
  pending: "Recording consent was pending. No transcript is available.",
  declined: "The caller declined recording. No transcript is available.",
  live_disabled:
    "Capture is currently disabled. Transcript access is unavailable.",
  deleted:
    "This transcript was deleted. It cannot be restored by enabling capture.",
  expired:
    "This transcript expired under retention policy. Extending retention does not restore it.",
  no_captured: "No transcript text was captured for this session.",
  captured: "A transcript was captured. Ask a clinic manager to review it.",
  available: "Redacted transcript available.",
};
export function alertEvidence(
  a: import("../../api/dashboard.generated").AlertView,
) {
  const count = (n: number, one: string, many = `${one}s`) =>
    `${n} ${n === 1 ? one : many}`;
  const window =
    (Date.parse(a.window_end) - Date.parse(a.window_start)) / 60000;
  switch (a.kind) {
    case "backlog": {
      const seconds = a.observed_value;
      const age =
        seconds === null
          ? "Unknown"
          : seconds < 0.1 && seconds > 0
            ? "< 0.1s"
            : seconds < 60
              ? `${seconds.toLocaleString("en-US", { maximumFractionDigits: 1 })}s`
              : `${Math.floor(seconds / 60)}m ${(seconds % 60).toLocaleString("en-US", { maximumFractionDigits: 1 })}s`;
      return `Oldest queued: ${age} · ${count(a.numerator, "queued job")}`;
    }
    case "latency":
      return `${ms(a.observed_value)} p95 · ${label(a.language)} · ${count(a.denominator, "sample")}`;
    case "tool_failure":
      return `${ratio({ value: a.observed_value, numerator: a.numerator, denominator: a.denominator })} failed tool results`;
    case "provider_failure":
      return `${a.numerator} failed / ${a.denominator} provider invocations · ${window} min window`;
    case "ended_error":
      return `${count(a.numerator, "error")} / ${a.denominator} ended sessions · ${window} min window`;
  }
}

export function sessionDuration(
  call: Pick<CallView, "started_at" | "ended_at" | "status" | "pending_expiry">,
) {
  if (call.ended_at === null) {
    if (call.pending_expiry) return "End pending";
    return call.status === "active" || call.status === "disconnected"
      ? "Ongoing"
      : "Unavailable";
  }
  const elapsed = Date.parse(call.ended_at) - Date.parse(call.started_at);
  if (!Number.isFinite(elapsed) || elapsed < 0) return "Unavailable";
  if (elapsed === 0) return "0s";
  const hours = Math.floor(elapsed / 3600000),
    minutes = Math.floor((elapsed % 3600000) / 60000),
    seconds = (elapsed % 60000) / 1000;
  return [
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
    seconds > 0
      ? seconds < 0.1
        ? "< 0.1s"
        : `${seconds.toLocaleString("en-US", { maximumFractionDigits: 3 })}s`
      : null,
  ]
    .filter(Boolean)
    .join(" ");
}
