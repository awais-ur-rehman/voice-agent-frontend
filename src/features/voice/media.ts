import type {
  MediaGrant,
  CallControl,
  PlaybackAck,
} from "../../api/voice.generated";
import { PlaybackLedger, readWorkerMessage } from "./protocol";
export type MediaState =
  | "connecting"
  | "connected"
  | "listening"
  | "thinking"
  | "speaking"
  | "disconnected"
  | "error";
export type MediaEvents = {
  state: (state: MediaState) => void;
  caption: (text: string, lang: "en" | "ur") => void;
  audioBlocked: () => void;
  error: (message: string) => void;
};
export interface MediaConnection {
  connect(grant: MediaGrant): Promise<void>;
  disconnect(): Promise<void> | void;
  setMuted(muted: boolean): Promise<void>;
  enableAudio(): Promise<void>;
}
export function createLiveMedia(events: MediaEvents): MediaConnection {
  let room: import("livekit-client").Room | null = null;
  let audio: HTMLAudioElement | null = null;
  let grant: MediaGrant | null = null;
  let interruptedSource: HTMLMediaElement["srcObject"] = null;
  let workerReported = false;
  let epoch = 0,
    lastSequence = 0,
    sequence = 0,
    playing = false,
    muted = false;
  const ledger = new PlaybackLedger();
  const clear = () => {
    ledger.clear();
    playing = false;
  };
  async function publish(data: PlaybackAck | CallControl) {
    if (room?.state === "connected")
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        {
          reliable: true,
          topic: "voice.v1",
          destinationIdentities: ["worker"],
        },
      );
  }
  async function control(kind: CallControl["kind"]) {
    if (grant)
      await publish({
        version: 1,
        session_id: grant.session_id,
        generation: grant.generation,
        sequence: ++sequence,
        kind,
      });
  }
  function progress() {
    if (
      !audio ||
      !grant ||
      !room ||
      !playing ||
      muted ||
      audio.paused ||
      audio.muted ||
      audio.volume === 0
    )
      return;
    for (const ack of ledger.progress(audio.currentTime, true))
      void publish({
        version: 1,
        session_id: grant.session_id,
        generation: grant.generation,
        sequence: ++sequence,
        ...ack,
      }).catch(() => {
        clear();
        events.error(
          "Playback acknowledgment failed. Reconnect before confirming.",
        );
      });
  }
  async function disconnect() {
    epoch++;
    clear();
    const old = room;
    room = null;
    grant = null;
    interruptedSource = null;
    if (audio) {
      audio.pause();
      audio.srcObject = null;
      audio.remove();
      audio = null;
    }
    if (old) {
      old.removeAllListeners();
      await old.disconnect(true);
    }
  }
  return {
    async connect(next) {
      await disconnect();
      const own = epoch;
      const { Room, RoomEvent, Track } = await import("livekit-client");
      if (own !== epoch) return;
      grant = next;
      sequence = 0;
      lastSequence = 0;
      muted = false;
      workerReported = false;
      const current = new Room({
        adaptiveStream: false,
        dynacast: false,
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        disconnectOnPageLeave: true,
      });
      room = current;
      events.state("connecting");
      current.on(RoomEvent.ConnectionStateChanged, (state) => {
        if (own !== epoch) return;
        if (state === "reconnecting" || state === "disconnected") {
          // A resumed call requires a fresh staff-authorized grant, never the SDK's stale room.
          void disconnect().catch(() =>
            events.error("Media cleanup failed. End the session."),
          );
          events.state("disconnected");
        }
      });
      current.on(RoomEvent.ParticipantDisconnected, (participant) => {
        if (own !== epoch || participant.identity !== "worker") return;
        void disconnect().catch(() =>
          events.error("Media cleanup failed. End the session."),
        );
        events.state("disconnected");
        events.error(
          "The voice worker disconnected. Reconnect within the grace period or end this session.",
        );
      });
      current.on(RoomEvent.AudioPlaybackStatusChanged, () => {
        if (own !== epoch) return;
        if (!current.canPlaybackAudio) {
          clear();
          events.audioBlocked();
        }
      });
      current.on(
        RoomEvent.TrackSubscribed,
        (track, _publication, participant) => {
          if (
            own !== epoch ||
            participant.identity !== "worker" ||
            track.kind !== Track.Kind.Audio
          )
            return;
          if (audio) {
            audio.pause();
            audio.remove();
            clear();
          }
          audio = track.attach() as HTMLAudioElement;
          audio.setAttribute("aria-hidden", "true");
          audio.style.display = "none";
          document.body.append(audio);
          audio.addEventListener("playing", () => {
            playing = true;
            progress();
          });
          audio.addEventListener("timeupdate", progress);
          audio.addEventListener("pause", clear);
          audio.addEventListener("waiting", () => {
            ledger.clear();
            playing = false;
          });
          audio.addEventListener("volumechange", () => {
            // Any audibility transition invalidates the segment's original baseline.
            // The player may still be playing, so a later segment can start afresh.
            ledger.clear();
          });
          void audio.play().catch(() => {
            clear();
            events.audioBlocked();
          });
        },
      );
      current.on(RoomEvent.TrackUnsubscribed, () => {
        clear();
      });
      current.on(RoomEvent.DataReceived, (bytes, participant, _kind, topic) => {
        if (own !== epoch || topic !== "voice.v1" || !grant) return;
        const message = readWorkerMessage(
          bytes,
          participant?.identity,
          grant,
          lastSequence,
        );
        if (!message) return;
        lastSequence = message.sequence;
        if (message.kind === "state") {
          workerReported = true;
          if (message.state === "error") ledger.clear();
          events.state(message.state);
          if (message.state === "error") {
            void disconnect().catch(() => {});
            events.error(
              "The speech pipeline reported an error. End or reconnect the session.",
            );
          }
        } else if (message.kind === "caption")
          events.caption(message.text, message.lang);
        else if (message.kind === "invalidate") {
          clear();
          if (audio) {
            audio.pause();
            interruptedSource = audio.srcObject;
            audio.srcObject = null;
          }
        } else if (message.kind === "segment") {
          if (audio && interruptedSource) {
            audio.srcObject = interruptedSource;
            interruptedSource = null;
            void audio.play().catch(() => {
              clear();
              events.audioBlocked();
            });
          }
          ledger.begin(
            message.segment_id,
            message.total_samples,
            message.sample_rate,
            audio &&
              !audio.muted &&
              audio.volume > 0 &&
              !audio.paused &&
              playing &&
              !muted
              ? audio.currentTime
              : null,
          );
        } else if (message.kind === "segment_end") {
          ledger.end(message.segment_id);
          progress();
        }
      });
      try {
        await current.connect(next.url, next.token, { autoSubscribe: true });
        if (own !== epoch) {
          await current.disconnect(true);
          return;
        }
        await current.localParticipant.setMicrophoneEnabled(true);
        if (own !== epoch) {
          await current.disconnect(true);
          return;
        }
        if (!workerReported) events.state("connected");
        await current.startAudio().catch(() => events.audioBlocked());
      } catch (error) {
        if (own === epoch) await disconnect();
        throw error;
      }
    },
    disconnect,
    async setMuted(value) {
      if (!room) throw Error("Media is disconnected.");
      ledger.clear();
      muted = value;
      const notification = control(value ? "mute" : "unmute");
      await Promise.all([
        room.localParticipant.setMicrophoneEnabled(!value),
        notification,
      ]);
    },
    async enableAudio() {
      if (!room) throw Error("Media is disconnected.");
      clear();
      await room.startAudio();
      if (audio) await audio.play();
      if (!room.canPlaybackAudio)
        throw Error("Playback is blocked. Allow sound and try again.");
    },
  };
}
