/* Generated from contracts/voice.v1.json. Do not edit. Browser allowlist excludes WorkerGrant. */

export type ExpiresAt = string;
export type Generation = number;
export type Participant = string;
export type Room = string;
export type SessionId = string;
export type Token = string;
export type Url = string;
export type AgentId = string;
export type RequestKey = string;
export type CallDeadline = string;
export type Generation1 = number;
export type Revision = number;
export type SessionId1 = string;
export type Status = "provisioning" | "active" | "disconnected" | "ended" | "failed";
export type Generation2 = number;
export type PlayedSamples = number;
export type SegmentId = string;
export type Sequence = number;
export type SessionId2 = string;
export type Version = 1;
export type Generation3 = number;
export type Kind = "mute" | "unmute" | "end";
export type Sequence1 = number;
export type SessionId3 = string;
export type Version1 = 1;
export type Code = string | null;
export type Generation4 = number;
export type Kind1 = "state";
export type Sequence2 = number;
export type SessionId4 = string;
export type State = "listening" | "thinking" | "speaking" | "error";
export type Version2 = 1;
export type Generation5 = number;
export type Kind2 = "caption";
export type Lang = "en" | "ur";
export type Sequence3 = number;
export type SessionId5 = string;
export type Text = string;
export type Version3 = 1;
export type Critical = boolean;
export type Generation6 = number;
export type Kind3 = "segment";
export type SampleRate = number;
export type SegmentId1 = string;
export type Sequence4 = number;
export type SessionId6 = string;
export type TotalSamples = number;
export type Version4 = 1;
export type Generation7 = number;
export type Kind4 = "segment_end";
export type SegmentId2 = string;
export type Sequence5 = number;
export type SessionId7 = string;
export type Version5 = 1;
export type Generation8 = number;
export type Kind5 = "invalidate";
export type Sequence6 = number;
export type SessionId8 = string;
export type Version6 = 1;

export interface BrowserVoice {
  MediaGrant?: MediaGrant;
  VoiceCreate?: VoiceCreate;
  VoiceSnapshot?: VoiceSnapshot;
  PlaybackAck?: PlaybackAck;
  CallControl?: CallControl;
  VoiceStateMessage?: VoiceStateMessage;
  CaptionMessage?: CaptionMessage;
  SegmentMessage?: SegmentMessage;
  SegmentEndMessage?: SegmentEndMessage;
  InvalidateMessage?: InvalidateMessage;
}
export interface MediaGrant {
  expires_at: ExpiresAt;
  generation: Generation;
  participant: Participant;
  room: Room;
  session_id: SessionId;
  token: Token;
  url: Url;
}
export interface VoiceCreate {
  agent_id: AgentId;
  request_key: RequestKey;
}
export interface VoiceSnapshot {
  call_deadline: CallDeadline;
  generation: Generation1;
  media?: MediaGrant | null;
  revision: Revision;
  session_id: SessionId1;
  status: Status;
}
export interface PlaybackAck {
  generation: Generation2;
  played_samples: PlayedSamples;
  segment_id: SegmentId;
  sequence: Sequence;
  session_id: SessionId2;
  version: Version;
}
export interface CallControl {
  generation: Generation3;
  kind: Kind;
  sequence: Sequence1;
  session_id: SessionId3;
  version: Version1;
}
export interface VoiceStateMessage {
  code?: Code;
  generation: Generation4;
  kind: Kind1;
  sequence: Sequence2;
  session_id: SessionId4;
  state: State;
  version: Version2;
}
export interface CaptionMessage {
  generation: Generation5;
  kind: Kind2;
  lang: Lang;
  sequence: Sequence3;
  session_id: SessionId5;
  text: Text;
  version: Version3;
}
export interface SegmentMessage {
  critical: Critical;
  generation: Generation6;
  kind: Kind3;
  sample_rate: SampleRate;
  segment_id: SegmentId1;
  sequence: Sequence4;
  session_id: SessionId6;
  total_samples: TotalSamples;
  version: Version4;
}
export interface SegmentEndMessage {
  generation: Generation7;
  kind: Kind4;
  segment_id: SegmentId2;
  sequence: Sequence5;
  session_id: SessionId7;
  version: Version5;
}
export interface InvalidateMessage {
  generation: Generation8;
  kind: Kind5;
  sequence: Sequence6;
  session_id: SessionId8;
  version: Version6;
}
