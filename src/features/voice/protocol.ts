import Ajv2020 from "ajv/dist/2020";
import addFormats from "ajv-formats";
import schema from "../../../contracts/voice.v1.json";
import type {
  VoiceStateMessage,
  CaptionMessage,
  SegmentMessage,
  SegmentEndMessage,
  InvalidateMessage,
} from "../../api/voice.generated";
export type Scope = { session_id: string; generation: number };
export type WorkerMessage =
  | VoiceStateMessage
  | CaptionMessage
  | SegmentMessage
  | SegmentEndMessage
  | InvalidateMessage;
const ajv = new Ajv2020({ strict: true });
addFormats(ajv);
const validate = ajv.compile<WorkerMessage>({
  $schema: schema.$schema,
  $defs: schema.$defs,
  anyOf: [
    "VoiceStateMessage",
    "CaptionMessage",
    "SegmentMessage",
    "SegmentEndMessage",
    "InvalidateMessage",
  ].map((name) => ({ $ref: `#/$defs/${name}` })),
});
export function readWorkerMessage(
  bytes: Uint8Array,
  identity: string | undefined,
  scope: Scope,
  lastSequence: number,
): WorkerMessage | null {
  if (identity !== "worker" || bytes.byteLength > 8192) return null;
  try {
    const message: unknown = JSON.parse(
      new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    );
    if (
      !validate(message) ||
      message.session_id !== scope.session_id ||
      message.generation !== scope.generation ||
      message.sequence <= lastSequence
    )
      return null;
    return message;
  } catch {
    return null;
  }
}
/** CurrentTime is a conservative media-clock lower bound, never a wall-clock estimate. */
export class PlaybackLedger {
  private pending: {
    id: string;
    samples: number;
    duration: number;
    start: number;
    ended: boolean;
  } | null = null;
  begin(id: string, samples: number, rate: number, currentTime: number | null) {
    this.pending =
      currentTime !== null && Number.isFinite(currentTime)
        ? {
            id,
            samples,
            duration: samples / rate,
            start: currentTime,
            ended: false,
          }
        : null;
  }
  end(id: string) {
    if (this.pending?.id === id) this.pending.ended = true;
  }
  clear() {
    this.pending = null;
  }
  progress(
    currentTime: number,
    audible: boolean,
  ): { segment_id: string; played_samples: number }[] {
    const p = this.pending;
    if (!p || !audible || !p.ended || currentTime - p.start < p.duration)
      return [];
    this.pending = null;
    return [{ segment_id: p.id, played_samples: p.samples }];
  }
}
