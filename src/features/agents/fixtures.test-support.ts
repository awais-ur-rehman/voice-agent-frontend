import type {
  AgentOut,
  DraftOut,
  VoiceOut,
  TestSnapshot,
  VoiceSnapshot,
  VersionOut,
} from "../../api/dashboard.generated";
export const agent: AgentOut = {
  id: "agent-one",
  name: "Reception",
  enabled: true,
  archived_at: null,
  active_version_id: "version-one",
  published_number: 1,
  draft_changed: false,
  language_mode: "bilingual",
  revision: 3,
};
export const draft: DraftOut = {
  revision: 7,
  updated_at: "2026-10-28T12:00:00Z",
  config: {
    schema_version: 2,
    name: "Reception",
    language_mode: "bilingual",
    instructions: "Ask one question.",
    greeting_en: "Hello",
    greeting_ur: "السلام علیکم",
    tone: "friendly",
    read_digits_in_english: false,
    prayer_break: null,
    voice_en_id: "en-female",
    voice_ur_id: "ur-female",
    voice_profiles: { en: { old: "snapshot" } },
  },
};
export const voices: VoiceOut[] = ["en", "ur"].flatMap((language) =>
  ["female", "male"].map((gender) => ({
    id: `${language}-${gender}`,
    language: language as "en" | "ur",
    gender: gender as "female" | "male",
    engine: language === "en" ? "kokoro" : "parler",
    model_revision: "frozen-v1",
    config_fingerprint: "a".repeat(64),
    license: "Apache-2.0",
    readiness: "provisional",
    preview_available: false,
    preview_url: null,
    unavailable_reason: "Native voice acceptance pending.",
  })),
);
export const testSnapshot: TestSnapshot = {
  id: "parent-test",
  draft_revision: 7,
  expires_at: "2099-01-01T00:00:00Z",
  status: "active",
  conversation: {
    messages: [],
    revision: 1,
    text_confirmation_reset: false,
    transport: "text",
  },
  fixtures: {
    patients: [],
    appointment: null,
    appointment_unavailable_reason: "No fixture slot",
  },
  transport_capabilities: {
    text: { available: true },
    voice: { available: false, reason: "voice_unavailable" },
  },
};
export const voiceSnapshot: VoiceSnapshot = {
  session_id: "child-runtime",
  generation: 2,
  revision: 1,
  status: "active",
  call_deadline: "2099-01-01T00:00:00Z",
  media: {
    session_id: "child-runtime",
    generation: 2,
    expires_at: "2099-01-01T00:00:00Z",
    url: "wss://media.example.test",
    room: "isolated-room",
    participant: "caller",
    token: "scoped-media",
  },
};
export const version: VersionOut = {
  id: "version-one",
  number: 1,
  config: draft.config,
  created_at: "2026-10-28T12:00:00Z",
  publisher_id: "staff-one",
  publisher_name: "QA Clinic Owner",
  rollback_source_id: null,
  warnings: [],
};
