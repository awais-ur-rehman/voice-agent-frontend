import { beforeEach, expect, it, vi } from "vitest";
import { createLiveMedia, type MediaEvents } from "./media";
const { FakeRoom } = vi.hoisted(() => {
  class FakeRoom {
    static current: FakeRoom;
    state = "connected";
    canPlaybackAudio = true;
    handlers = new Map<string, ((...args: unknown[]) => void)[]>();
    localParticipant = {
      publishData: vi.fn(async () => {}),
      setMicrophoneEnabled: vi.fn(async () => {}),
    };
    constructor() {
      FakeRoom.current = this;
    }
    on(name: string, fn: (...args: unknown[]) => void) {
      this.handlers.set(name, [...(this.handlers.get(name) || []), fn]);
      return this;
    }
    emit(name: string, ...args: unknown[]) {
      for (const fn of this.handlers.get(name) || []) fn(...args);
    }
    connect = vi.fn(async () => {});
    startAudio = vi.fn(async () => {});
    disconnect = vi.fn(async () => {});
    removeAllListeners() {
      this.handlers.clear();
    }
  }
  return { FakeRoom };
});
vi.mock("livekit-client", () => ({
  Room: FakeRoom,
  Track: { Kind: { Audio: "audio" } },
  RoomEvent: {
    ConnectionStateChanged: "connection",
    AudioPlaybackStatusChanged: "playback",
    TrackSubscribed: "track",
    TrackUnsubscribed: "untrack",
    DataReceived: "data",
    ParticipantDisconnected: "participant-left",
  },
}));
const grant = {
  url: "ws://localhost:7880",
  room: "opaque",
  participant: "caller",
  token: "scoped",
  expires_at: "2026-10-28T23:00:00Z",
  session_id: "24ad626c-5a6d-40cd-87d4-b946d61109e4",
  generation: 2,
};
let events: MediaEvents;
beforeEach(() => {
  events = {
    state: vi.fn(),
    caption: vi.fn(),
    audioBlocked: vi.fn(),
    error: vi.fn(),
  };
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
function message(
  kind: string,
  extra: Record<string, unknown>,
  sequence = 1,
  identity = "worker",
) {
  FakeRoom.current.emit(
    "data",
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        session_id: grant.session_id,
        generation: 2,
        sequence,
        kind,
        ...extra,
      }),
    ),
    { identity },
    undefined,
    "voice.v1",
  );
}
function attachAudio() {
  const element = document.createElement("audio");
  Object.defineProperty(element, "paused", {
    value: false,
    configurable: true,
  });
  Object.defineProperty(element, "currentTime", { value: 10, writable: true });
  FakeRoom.current.emit(
    "track",
    { kind: "audio", attach: () => element },
    {},
    { identity: "worker" },
  );
  element.dispatchEvent(new Event("playing"));
  return element;
}
it("uses worker-only data and never forwards stale captions", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  message("caption", { text: "forged", lang: "en" }, 1, "caller");
  message("caption", { text: "old", lang: "en", generation: 1 }, 1);
  message("caption", { text: "accepted", lang: "en" }, 1);
  message("caption", { text: "replayed", lang: "en" }, 1);
  expect(events.caption).toHaveBeenCalledTimes(1);
  expect(events.caption).toHaveBeenCalledWith("accepted", "en");
  await media.disconnect();
});
it("acknowledges complete audio progress only, fenced on disconnect and mute", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  message("segment", {
    segment_id: "first",
    sample_rate: 24000,
    total_samples: 48000,
    critical: true,
  });
  message("segment_end", { segment_id: "first" }, 2);
  expect(FakeRoom.current.localParticipant.publishData).not.toHaveBeenCalled();
  element.currentTime = 12;
  element.dispatchEvent(new Event("timeupdate"));
  await Promise.resolve();
  const [bytes, options] = FakeRoom.current.localParticipant.publishData.mock
    .calls[0] as unknown as [Uint8Array, unknown];
  expect(JSON.parse(new TextDecoder().decode(bytes))).toEqual({
    version: 1,
    session_id: grant.session_id,
    generation: 2,
    sequence: 1,
    segment_id: "first",
    played_samples: 48000,
  });
  expect(options).toEqual({
    reliable: true,
    topic: "voice.v1",
    destinationIdentities: ["worker"],
  });
  message(
    "segment",
    {
      segment_id: "second",
      sample_rate: 24000,
      total_samples: 48000,
      critical: true,
    },
    3,
  );
  message("segment_end", { segment_id: "second" }, 4);
  await media.setMuted(true);
  element.currentTime = 30;
  element.dispatchEvent(new Event("timeupdate"));
  expect(FakeRoom.current.localParticipant.publishData).toHaveBeenCalledTimes(
    2,
  );
  await media.disconnect();
  expect(element.isConnected).toBe(false);
});
it("does not acknowledge blocked or interrupted audio", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  message("segment", {
    segment_id: "critical",
    sample_rate: 24000,
    total_samples: 48000,
    critical: true,
  });
  message("segment_end", { segment_id: "critical" }, 2);
  FakeRoom.current.canPlaybackAudio = false;
  FakeRoom.current.emit("playback");
  element.currentTime = 20;
  element.dispatchEvent(new Event("timeupdate"));
  expect(events.audioBlocked).toHaveBeenCalled();
  expect(FakeRoom.current.localParticipant.publishData).not.toHaveBeenCalled();
  await media.disconnect();
});
it("stops the old room before resuming and never sends its late data", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const old = FakeRoom.current;
  attachAudio();
  await media.connect({ ...grant, generation: 3 });
  old.emit(
    "data",
    new TextEncoder().encode(
      JSON.stringify({
        version: 1,
        session_id: grant.session_id,
        generation: 2,
        sequence: 100,
        kind: "caption",
        text: "late",
        lang: "en",
      }),
    ),
    { identity: "worker" },
    undefined,
    "voice.v1",
  );
  expect(events.caption).not.toHaveBeenCalled();
  expect(old.disconnect).toHaveBeenCalledWith(true);
  await media.disconnect();
});
it("preserves a worker state received during microphone setup", async () => {
  events.state = vi.fn((state) => {
    if (state === "connecting")
      queueMicrotask(() => message("state", { state: "listening" }));
  });
  const media = createLiveMedia(events);
  await media.connect(grant);
  expect(events.state).toHaveBeenLastCalledWith("listening");
  await media.disconnect();
});
it("disconnects the old media immediately when automatic reconnect starts", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  const old = FakeRoom.current;
  old.emit("connection", "reconnecting");
  await Promise.resolve();
  expect(element.isConnected).toBe(false);
  expect(old.disconnect).toHaveBeenCalledWith(true);
  expect(events.state).toHaveBeenLastCalledWith("disconnected");
  await media.disconnect();
});
it("removes the playback source on worker invalidation until a new segment", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  const source = {} as MediaStream;
  element.srcObject = source;
  message("invalidate", {});
  expect(element.srcObject).toBeNull();
  element.currentTime = 100;
  element.dispatchEvent(new Event("timeupdate"));
  expect(FakeRoom.current.localParticipant.publishData).not.toHaveBeenCalled();
  await media.disconnect();
});

it("retains ended playback evidence after the worker reports listening", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  message("segment", {
    segment_id: "last",
    sample_rate: 24000,
    total_samples: 48000,
    critical: true,
  });
  message("segment_end", { segment_id: "last" }, 2);
  message("state", { state: "listening" }, 3);
  element.currentTime = 12;
  element.dispatchEvent(new Event("timeupdate"));
  expect(FakeRoom.current.localParticipant.publishData).toHaveBeenCalledTimes(
    1,
  );
  await media.disconnect();
});

it("never acknowledges a segment whose baseline began at zero volume", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  Object.defineProperty(element, "volume", { value: 0, writable: true });
  message("segment", {
    segment_id: "silent",
    sample_rate: 24000,
    total_samples: 48000,
    critical: true,
  });
  message("segment_end", { segment_id: "silent" }, 2);
  element.currentTime = 12;
  element.volume = 1;
  element.dispatchEvent(new Event("volumechange"));
  element.dispatchEvent(new Event("timeupdate"));
  expect(FakeRoom.current.localParticipant.publishData).not.toHaveBeenCalled();
  await media.disconnect();
});

it("stops media when its worker leaves the room", async () => {
  const media = createLiveMedia(events);
  await media.connect(grant);
  const element = attachAudio();
  const old = FakeRoom.current;
  old.emit("participant-left", { identity: "worker" });
  await Promise.resolve();
  expect(element.isConnected).toBe(false);
  expect(events.state).toHaveBeenLastCalledWith("disconnected");
  expect(old.disconnect).toHaveBeenCalledWith(true);
  await media.disconnect();
});
