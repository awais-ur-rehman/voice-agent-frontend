/* Generated from contracts/dashboard.v1.json. Do not edit. */

export type AddressEn = string | null;
export type AddressUr = string | null;
export type PreparationEn = string | null;
export type PreparationUr = string | null;
export type GreetingEn = string;
export type GreetingUr = string;
export type Instructions = string;
export type LanguageMode = "en" | "ur" | "bilingual";
export type Name = string;
export type PrayerBreak = [string, string] | null;
export type ReadDigitsInEnglish = boolean;
export type SchemaVersion = 2;
export type Tone = "friendly" | "formal" | "concise";
export type VoiceEnId = string;
export type VoiceUrId = string;
export type Name1 = string;
export type ActiveVersionId = string | null;
export type ArchivedAt = string | null;
export type DraftChanged = boolean;
export type Enabled = boolean;
export type Id = string;
export type LanguageMode1 = string;
export type Name2 = string;
export type PublishedNumber = number | null;
export type Revision = number;
export type Enabled1 = boolean;
export type Revision1 = number;
export type DateBasis = "last_seen_utc_date";
export type AsOf = string | null;
export type PendingBuckets = number;
export type PendingExpirations = number;
export type Source = "persisted_rollups" | "raw_snapshot";
export type Stale = boolean;
export type HasMore = boolean;
export type AgentId = string;
export type Channel = ("text" | "voice") | null;
export type Denominator = number;
export type Id1 = string;
export type Kind =
  "latency" | "tool_failure" | "provider_failure" | "ended_error" | "backlog";
export type Language = "en" | "ur" | "mixed" | "unknown";
export type LastSeenAt = string;
export type Numerator = number;
export type ObservedValue = number | null;
export type OpenedAt = string;
export type ResolvedAt = string | null;
export type State = "open" | "resolved";
export type WindowEnd = string;
export type WindowStart = string;
export type Items = AlertView[];
export type NextCursor = string | null;
export type SnapshotAt = string;
export type Total = number;
export type CreatedAt = string;
export type EndsAt = string;
export type Id2 = string;
export type PatientId = string;
export type ProviderId = string;
export type RescheduledFromId = string | null;
export type ServiceId = string;
export type StartsAt = string;
export type Status = string;
export type CreatedAt1 = string;
export type EndsAt1 = string;
export type Id3 = string;
export type PatientId1 = string;
export type PatientName = string;
export type PatientNameUr = string | null;
export type ProviderId1 = string;
export type ProviderName = string;
export type ProviderNameUr = string | null;
export type RescheduledFromId1 = string | null;
export type ServiceId1 = string;
export type ServiceName = string;
export type ServiceNameUr = string | null;
export type StartsAt1 = string;
export type Status1 = string;
export type Items1 = CalendarAppointment[];
export type Limit = number;
export type Offset = number;
export type Total1 = number;
export type EndDate = string;
export type EndTime = string | null;
export type Id4 = string;
export type Kind1 = "closed" | "custom";
export type ProviderId2 = string;
export type StartDate = string;
export type StartTime = string | null;
export type Exceptions = ExceptionOut[];
export type Revision2 = string;
export type EndTime1 = string;
export type Id5 = string;
export type ProviderId3 = string;
export type SlotMin = number;
export type StartTime1 = string;
export type Weekday = number;
export type Rules = RuleOut[];
export type AddedExceptions = ExceptionOut[];
export type AddedRules = RuleOut[];
export type RemovedRuleIds = string[];
export type Revision3 = string;
export type BreakEnd = string | null;
export type BreakStart = string | null;
export type EndDate1 = string | null;
export type EndTime2 = string | null;
export type Revision4 = string;
export type StartDate1 = string | null;
export type StartTime2 = string | null;
export type Template = "friday_prayer" | "ramadan";
export type Confirmed = boolean;
export type PatientId2 = string;
export type ProviderId4 = string;
export type ServiceId2 = string;
export type StartsAt2 = string;
export type AttemptedTasks = number;
export type AgentId1 = string;
export type Channel1 = "text" | "voice";
export type EndReason =
  | (
      | "caller_end"
      | "staff_end"
      | "handoff"
      | "timeout"
      | "error"
      | "provisioning_failed"
      | "disconnect"
    )
  | null;
export type EndedAt = string | null;
export type ExpiresAt = string;
export type Language1 = "en" | "ur" | "mixed" | "unknown";
export type LocalDate = string;
export type Outcome =
  | (
      | "booked"
      | "cancelled"
      | "rescheduled"
      | "info_only"
      | "abandoned"
      | "handoff"
      | "error"
    )
  | null;
export type PendingExpiry = boolean;
export type QualityFlags = (
  "repeated_prompt" | "interruptions" | "low_stt_confidence" | "handoff"
)[];
export type SessionId = string;
export type StartedAt = string;
export type Status2 =
  "active" | "disconnected" | "ended" | "expired" | "failed";
export type Timezone = string;
export type UtcOffsetMinutes = number;
export type CompletedTasks = number;
export type HasMore1 = boolean;
export type Kind2 =
  | "session.started"
  | "turn.user"
  | "turn.assistant"
  | "tool.called"
  | "tool.result"
  | "metric.turn"
  | "lang.switched"
  | "handoff.requested"
  | "session.ended";
export type Language2 = "en" | "ur" | "mixed" | "unknown";
export type OccurredAt = string;
export type Ordinal = number;
export type ToolName =
  | (
      | "update_dialogue_state"
      | "find_patient"
      | "set_caller_contact"
      | "verify_patient"
      | "prepare_patient"
      | "create_patient"
      | "get_clinic_info"
      | "search_knowledge"
      | "get_available_slots"
      | "hold_slot"
      | "find_appointments"
      | "select_appointment"
      | "read_back"
      | "book_appointment"
      | "cancel_appointment"
      | "reschedule_appointment"
      | "confirm"
      | "ask_caller"
      | "resume_task"
      | "request_handoff"
      | "end_call"
    )
  | null;
export type ToolStatus = ("success" | "failure") | null;
export type Items2 = SafeEvent[];
export type NextCursor1 = number | null;
export type Total2 = number;
export type HasMore2 = boolean;
export type DurationMs = number;
export type Id6 = string;
export type Language3 = "en" | "ur" | "mixed" | "unknown";
export type ObservedAt = string;
export type Origin = "server" | "native";
export type Stage =
  | "command_total"
  | "tool"
  | "llm_completion"
  | "llm_first_token"
  | "stt_completion"
  | "tts_first_byte"
  | "end_of_speech_to_audio"
  | "tts_buffered_generation"
  | "audio_queue"
  | "end_of_speech_to_audio_queue";
export type TurnOrdinal = number | null;
export type Items3 = MeasurementView[];
export type NextCursor2 = string | null;
export type Total3 = number;
export type Availability1 = "unavailable" | "unavailable_to_role" | "available";
export type Reason =
  | "off"
  | "pending"
  | "declined"
  | "live_disabled"
  | "deleted"
  | "expired"
  | "no_captured"
  | "captured"
  | "available";
export type TextAccess = "restricted" | "manager";
export type Summary = string;
export type TraceId = string;
export type Basis = "reported_tokens_configured_usd_per_million";
export type CostKnown = number;
export type Currency = "USD";
export type EstimatedUsd = string | null;
export type InputTokens = number | null;
export type Invocations = number;
export type OutputTokens = number | null;
export type UsageKnown = number;
export type HasMore3 = boolean;
export type Items4 = CallView[];
export type NextCursor3 = string | null;
export type SnapshotAt1 = string;
export type Total4 = number;
export type Available = boolean;
export type Reason1 = string | null;
export type CancellationMin = number;
export type Currency1 = string;
export type DailyLimit = number;
export type HorizonDays = number;
export type Id7 = string;
export type MinNoticeMin = number;
export type Name3 = string;
export type Timezone1 = string;
export type CancellationMin1 = number | null;
export type DailyLimit1 = number | null;
export type HorizonDays1 = number | null;
export type MinNoticeMin1 = number | null;
export type Name4 = string | null;
export type Timezone2 = string | null;
export type AddressEn1 = string | null;
export type AddressUr1 = string | null;
export type PreparationEn1 = string | null;
export type PreparationUr1 = string | null;
export type AddressEn2 = string;
export type AddressUr2 = string;
export type CancellationMin2 = number;
export type Currency2 = string;
export type DailyLimit2 = number;
export type HorizonDays2 = number;
export type Id8 = string;
export type MinNoticeMin2 = number;
export type Name5 = string;
export type PreparationEn2 = string;
export type PreparationUr2 = string;
export type Revision5 = number;
export type Timezone3 = string;
export type Confirmed1 = boolean;
export type Role = "assistant";
export type Text = string;
export type Messages = Message[];
export type Revision6 = number;
export type TextConfirmationReset = boolean;
export type Transport = "text" | "voice";
export type BookingSessions = number;
export type EndedSessions = number;
export type LocalDate1 = string;
export type Sessions = number;
export type Instructions1 = string;
export type LanguageMode2 = "en" | "ur" | "bilingual";
export type Name6 = string;
export type PrayerBreak1 = [string, string] | null;
export type ReadDigitsInEnglish1 = boolean;
export type SchemaVersion1 = 1;
export type Revision7 = number;
export type UpdatedAt = string;
export type Revision8 = number;
export type EndDate2 = string;
export type EndTime3 = string | null;
export type Kind3 = "closed" | "custom";
export type ProviderId5 = string;
export type StartDate2 = string;
export type StartTime3 = string | null;
export type Answer = string;
export type Kind4 = "faq";
export type Name7 = string;
export type Question = string;
export type Answer1 = string;
export type Kind5 = "faq";
export type Question1 = string;
export type Answer2 = string;
export type Kind6 = "faq";
export type Name8 = string;
export type Question2 = string;
export type Revision9 = number;
export type Format = "pdf" | "docx" | "txt" | "md";
export type Kind7 = "file";
export type AgentId2 = string | null;
export type Channel2 = "all" | "text" | "voice";
export type End = string;
export type Start = string;
export type Timezone4 = string | null;
export type EndsAt2 = string;
export type Id9 = string;
export type PatientId3 = string;
export type ProviderId6 = string;
export type ServiceId3 = string;
export type StartsAt3 = string;
export type Dob = string;
export type Id10 = string;
export type Name9 = string;
export type Phone = string;
export type AppointmentUnavailableReason = string | null;
export type Patients = FixturePatient[];
export type Decision =
  | "ready"
  | "no_sources"
  | "processing_pending"
  | "below_threshold"
  | "service_unavailable"
  | "rejected"
  | "stale";
export type Fingerprint = string;
export type Occurrences = number;
export type Location = (string | number)[];
export type Message1 = string;
export type ErrorType = string;
export type Detail = ValidationError[];
export type BookingSessions1 = number;
export type BucketStart = string;
export type Channel3 = "text" | "voice";
export type EndedSessions1 = number;
export type LocalDate2 = string;
export type Sessions1 = number;
export type Timezone5 = string;
export type UtcOffsetMinutes1 = number;
export type Items5 = HourCount[];
export type Limit1 = number;
export type UnavailableReason = "series_limit" | null;
export type Intent =
  "book" | "cancel" | "reschedule" | "information" | "handoff";
export type Sessions2 = number;
export type Denominator1 = number;
export type Numerator1 = number;
export type Value = number | null;
export type DateBasis1 = "stored_admission_local_date";
export type Items6 = IntentRow[];
export type Overlapping = true;
export type Purpose = "production";
export type SnapshotAt2 = string;
export type Timezones = string[];
export type UnavailableReason1 = "raw_retention" | null;
export type Unit = "distinct_sessions_per_intent";
export type ChunkId = string;
export type Cosine = number;
export type Heading = string;
export type Language4 = string;
export type Quote = string;
export type SourceId = string;
export type SourceName = string;
export type ChannelAttribution = "server_session";
export type DateBasis2 = "stored_admission_local_date";
export type HasMore4 = boolean;
export type Irrelevant = number;
export type Items7 = GapRow[];
export type NextCursor4 = string | null;
export type Purpose1 = "production";
export type SnapshotAt3 = string;
export type Timezones1 = string[];
export type Total5 = number;
export type UnattributedDateBasis = "observed_utc_date";
export type UnattributedObservations = number;
export type Unavailable = number;
export type UnavailableReason2 = "raw_retention" | null;
/**
 * @maxItems 4
 */
export type Citations =
  | []
  | [KnowledgeCitation]
  | [KnowledgeCitation, KnowledgeCitation]
  | [KnowledgeCitation, KnowledgeCitation, KnowledgeCitation]
  | [
      KnowledgeCitation,
      KnowledgeCitation,
      KnowledgeCitation,
      KnowledgeCitation,
    ];
export type Status3 =
  | "ready"
  | "no_sources"
  | "processing_pending"
  | "below_threshold"
  | "service_unavailable"
  | "rejected"
  | "stale";
export type DateBasis3 = "stored_admission_local_date";
export type Purpose2 = "production";
export type SampleLimit = number;
export type SnapshotAt4 = string;
export type Diagnostic = boolean;
export type EligibleSessions = number;
export type P50Ms = number | null;
export type P95Ms = number | null;
export type SampledSessions = number | null;
export type Samples = number | null;
export type Stage1 =
  | "command_total"
  | "tool"
  | "llm_completion"
  | "llm_first_token"
  | "stt_completion"
  | "tts_first_byte"
  | "end_of_speech_to_audio"
  | "tts_buffered_generation"
  | "audio_queue"
  | "end_of_speech_to_audio_queue";
export type Stages = StageView[];
export type Timezones2 = string[];
export type UnavailableReason3 = ("raw_retention" | "sample_limit") | null;
export type Email = string;
export type Password = string;
export type Email1 = string;
export type Id11 = string;
export type Role1 = string;
export type TenantId = string;
export type ExpiresAt1 = string;
export type Generation = number;
export type Participant = string;
export type Room = string;
export type SessionId1 = string;
export type Token = string;
export type Url = string;
export type DestinationId = string;
export type DestinationRevision = number;
export type Dob1 = string | null;
export type Name10 = string;
export type NameUr = string | null;
export type Phone1 = string;
export type SourceRevision = number;
export type Confirmed2 = boolean;
export type ProviderId7 = string | null;
export type StartsAt4 = string;
export type AverageDurationMs = number | null;
export type BookOperations = number;
export type CancelOperations = number;
export type DateBasis4 = "stored_admission_local_date";
export type Days = DayCount[];
export type DurationSamples = number;
export type EndedSessions2 = number;
export type Purpose3 = "production";
export type RescheduleOperations = number;
export type Sessions3 = number;
export type SnapshotAt5 = string;
export type TextSessions = number;
export type Timezones3 = string[];
export type VoiceSessions = number;
export type Dob2 = string | null;
export type Name11 = string;
export type NameUr1 = string | null;
export type Phone2 = string;
export type Dob3 = string | null;
export type Id12 = string;
export type MergedIntoId = string | null;
export type Name12 = string;
export type NameUr2 = string | null;
export type Phone3 = string;
export type Revision10 = number;
export type Dob4 = string | null;
export type Id13 = string;
export type Name13 = string;
export type NameUr3 = string | null;
export type Phone4 = string;
export type Items8 = PatientDetail[];
export type Limit2 = number;
export type Offset1 = number;
export type Total6 = number;
export type Available1 = boolean;
export type Excerpts = string[];
export type Reason2 = "ready" | "processing_unavailable";
export type SourceId1 = string;
export type AddressEn3 = string | null;
export type AddressUr3 = string | null;
export type CancellationMin3 = number | null;
export type ConfirmTimezoneChange = boolean;
export type DailyLimit3 = number | null;
export type HorizonDays3 = number | null;
export type MinNoticeMin3 = number | null;
export type Name14 = string | null;
export type PreparationEn3 = string | null;
export type PreparationUr3 = string | null;
export type Revision11 = number;
export type Timezone6 = string | null;
export type Name15 = string;
export type NameUr4 = string | null;
export type Specialty = string;
export type Active = boolean;
export type Id14 = string;
export type Name16 = string;
export type NameUr5 = string | null;
export type Specialty1 = string;
export type Active1 = boolean | null;
export type Name17 = string | null;
export type NameUr6 = string | null;
export type Specialty2 = string | null;
export type ProviderId8 = string;
export type ServiceId4 = string;
export type Items9 = ProviderServiceItem[];
export type Limit3 = number;
export type Offset2 = number;
export type Total7 = number;
export type DateBasis5 = "stored_admission_local_date";
export type Purpose4 = "production";
export type SnapshotAt6 = string;
export type Timezones4 = string[];
export type RefreshToken = string;
export type ClinicName = string;
export type DisplayName = string | null;
export type Email2 = string;
export type Password1 = string;
export type Timezone7 = string;
export type Revision13 = number;
export type Revision14 = number;
export type VersionId = string;
export type EndTime4 = string;
export type ProviderId9 = string;
export type SlotMin1 = number;
export type StartTime4 = string;
export type Weekday1 = number;
export type ChunkId1 = string;
export type Cosine1 = number;
export type GenerationId = string;
export type Heading1 = string;
export type Language5 = string;
export type Name18 = string;
export type Profile = string;
export type Score = number;
export type SourceId2 = string;
export type Text1 = string;
export type Language6 = "en" | "ur";
export type Query = string;
export type QueryId = string;
export type Chunks = SearchChunk[];
export type Reason3 =
  | "ready"
  | "no_sources"
  | "processing_pending"
  | "below_threshold"
  | "service_unavailable";
export type BufferAfterMin = number;
export type BufferBeforeMin = number;
export type DurationMin = number;
export type Name19 = string;
export type NameUr7 = string | null;
export type Price = number | string;
export type Active2 = boolean;
export type BufferAfterMin1 = number;
export type BufferBeforeMin1 = number;
export type DurationMin1 = number;
export type Id15 = string;
export type Name20 = string;
export type NameUr8 = string | null;
export type Price1 = string;
export type Active3 = boolean | null;
export type BufferAfterMin2 = number | null;
export type BufferBeforeMin2 = number | null;
export type DurationMin2 = number | null;
export type Name21 = string | null;
export type NameUr9 = string | null;
export type Price2 = number | string | null;
export type CaptureEnabled = boolean;
export type RetentionDays = number;
export type Revision15 = number;
export type CaptureEnabled1 = boolean;
export type RetentionDays1 = number;
export type Revision16 = number;
export type UpdatedAt1 = string;
export type Agent = boolean;
export type Hours = boolean;
export type Profile1 = boolean;
export type Providers = boolean;
export type Services = boolean;
export type EndsAt3 = string;
export type ProviderId10 = string;
export type ServiceId5 = string;
export type StartsAt5 = string;
export type ActiveGenerationId = string | null;
export type AgentId3 = string;
export type Available2 = boolean;
export type ChunkCount = number;
export type ErrorAt = string | null;
export type ErrorCode = string | null;
export type Id16 = string;
export type Input1 =
  TextSourceInput | FAQSourceInput | URLSourceInput | FileSourceInput;
export type Format1 = "txt" | "md";
export type Kind8 = "text";
export type Text2 = string;
export type Kind9 = "url";
export type Url1 = string;
export type Kind10 = "text" | "faq" | "url" | "file";
export type Name22 = string;
export type Revision17 = number;
export type Status4 = "queued" | "processing" | "ready" | "failed" | "deleted";
export type UpdatedAt2 = string;
export type ActiveGenerationId1 = string | null;
export type AgentId4 = string;
export type Available3 = boolean;
export type ChunkCount1 = number;
export type ErrorAt1 = string | null;
export type ErrorCode1 = string | null;
export type Id17 = string;
export type Kind11 = "text" | "faq" | "url" | "file";
export type Name23 = string;
export type Revision18 = number;
export type Status5 = "queued" | "processing" | "ready" | "failed" | "deleted";
export type UpdatedAt3 = string;
export type DraftRevision = number;
export type Replace = boolean;
export type DraftRevision1 = number;
export type ExpiresAt2 = string;
export type Id18 = string;
export type Status6 = "active" | "ended" | "expired";
export type CommandId = string;
export type Revision19 = number;
export type Text3 = string;
export type RequestKey = string;
export type OccurredAt1 = string;
export type Ordinal1 = number;
export type Speaker = "user" | "assistant";
export type Text4 = string;
export type Format2 = "txt" | "md";
export type Kind12 = "text";
export type Name24 = string;
export type Text5 = string;
export type Format3 = "txt" | "md";
export type Kind13 = "text";
export type Name25 = string;
export type Revision20 = number;
export type Text6 = string;
export type AccessToken = string;
export type ExpiresIn = number;
export type RefreshToken1 = string;
export type TokenType = string;
export type Action = string | null;
export type Code = string | null;
export type Ok = boolean;
export type HasMore5 = boolean;
export type Items10 = TextItem[];
export type NextCursor5 = number | null;
export type ResidualSensitiveContent = true;
export type Total8 = number;
export type Id19 = string;
export type Messages1 = Message[];
export type Revision21 = number;
export type Status7 = "active" | "ended" | "expired";
export type ToolTrace1 = ToolTrace[];
export type Kind14 = "url";
export type Name26 = string;
export type Url2 = string;
export type Kind15 = "url";
export type Name27 = string;
export type Revision22 = number;
export type Url3 = string;
export type Email3 = string;
export type Password2 = string;
export type Role2 = "admin" | "staff";
export type CreatedAt2 = string;
export type Id20 = string;
export type Number = number | null;
export type PublisherId = string | null;
export type PublisherName = string | null;
export type RollbackSourceId = string | null;
export type Warnings = string[];
export type Id21 = string;
export type LanguageMode3 = string;
export type Name28 = string;
export type Agents = VoiceAgent[];
export type AgentId5 = string;
export type RequestKey1 = string;
export type ConfigFingerprint = string;
export type Engine = "kokoro" | "parler";
export type Gender = "female" | "male";
export type Id22 = string;
export type Language7 = "en" | "ur";
export type License = string;
export type ModelRevision = string;
export type PreviewAvailable = false;
export type PreviewUrl = null;
export type Readiness = "provisional";
export type UnavailableReason4 = string;
export type CallDeadline = string;
export type Generation1 = number;
export type Revision23 = number;
export type SessionId2 = string;
export type Status8 =
  "provisioning" | "active" | "disconnected" | "ended" | "failed";
export type Enabled2 = boolean;
export type ProcessingAvailable = boolean;
export type QueryAvailable = boolean;
export type QueryUnavailableReason =
  | ("disabled" | "no_sources" | "processing_pending" | "service_unavailable")
  | null;
export type SourceLimit = number;
export type UnavailableReason5 =
  | (
      | "disabled"
      | "processing_unavailable"
      | "worker_stale"
      | "embedding_unavailable"
      | "artifacts_unavailable"
    )
  | null;
export type UploadMaxBytes = number;

export interface DashboardSchemas {
  AgentConfig: AgentConfig;
  AgentCreate: AgentCreate;
  AgentOut: AgentOut;
  AgentPatch: AgentPatch;
  AlertPage: AlertPage;
  AlertView: AlertView;
  AppointmentOut: AppointmentOut;
  AppointmentPage: AppointmentPage;
  Availability: Availability;
  AvailabilityChanges: AvailabilityChanges;
  AvailabilityPreview: AvailabilityPreview;
  AvailabilityTemplate: AvailabilityTemplate;
  Book: Book;
  CalendarAppointment: CalendarAppointment;
  CallDetail: CallDetail;
  CallPage: CallPage;
  CallView: CallView;
  Capability: Capability;
  ClinicOut: ClinicOut;
  ClinicPatch: ClinicPatch;
  ClinicProfile: ClinicProfile;
  "ClinicProfile-Input": ClinicProfile_Input;
  "ClinicProfile-Output": ClinicProfile_Output;
  Confirm: Confirm;
  Conversation: Conversation;
  DayCount: DayCount;
  DraftOut: DraftOut;
  DraftPut: DraftPut;
  EventPage: EventPage;
  ExceptionCreate: ExceptionCreate;
  ExceptionOut: ExceptionOut;
  FAQSource: FAQSource;
  FAQSourceInput: FAQSourceInput;
  FAQUpdate: FAQUpdate;
  FileSourceInput: FileSourceInput;
  Filters: Filters;
  FixtureAppointment: FixtureAppointment;
  FixturePatient: FixturePatient;
  Fixtures: Fixtures;
  FreshnessView: FreshnessView;
  GapRow: GapRow;
  HTTPValidationError: HTTPValidationError;
  HourCount: HourCount;
  HourSeries: HourSeries;
  IntentRow: IntentRow;
  Intents: Intents;
  KnowledgeCitation: KnowledgeCitation;
  KnowledgeGaps: KnowledgeGaps;
  KnowledgeTrace: KnowledgeTrace;
  Latency: Latency;
  LegacyAgentConfig: LegacyAgentConfig;
  Login: Login;
  Me: Me;
  MeasurementPage: MeasurementPage;
  MeasurementView: MeasurementView;
  MediaGrant: MediaGrant;
  Merge: Merge;
  Message: Message;
  Move: Move;
  Overview: Overview;
  PatientCreate: PatientCreate;
  PatientDetail: PatientDetail;
  PatientOut: PatientOut;
  PatientPage: PatientPage;
  Preview: Preview;
  PrivacyView: PrivacyView;
  ProfilePatch: ProfilePatch;
  ProviderCreate: ProviderCreate;
  ProviderOut: ProviderOut;
  ProviderPatch: ProviderPatch;
  ProviderServiceItem: ProviderServiceItem;
  ProviderServicePage: ProviderServicePage;
  Quality: Quality;
  Ratio: Ratio;
  Refresh: Refresh;
  Register: Register;
  RetainedFields: RetainedFields;
  Revision: Revision12;
  Rollback: Rollback;
  RuleCreate: RuleCreate;
  RuleOut: RuleOut;
  SafeEvent: SafeEvent;
  SearchChunk: SearchChunk;
  SearchQuery: SearchQuery;
  SearchResult: SearchResult;
  ServiceCreate: ServiceCreate;
  ServiceOut: ServiceOut;
  ServicePatch: ServicePatch;
  SettingsUpdate: SettingsUpdate;
  SettingsView: SettingsView;
  Setup: Setup;
  Slot: Slot;
  SourceDetailOut: SourceDetailOut;
  SourceOut: SourceOut;
  StageView: StageView;
  TestCreate: TestCreate;
  TestSnapshot: TestSnapshot;
  TestTurn: TestTurn;
  TestVoiceCreate: TestVoiceCreate;
  TextItem: TextItem;
  TextSource: TextSource;
  TextSourceInput: TextSourceInput;
  TextUpdate: TextUpdate;
  Tokens: Tokens;
  ToolTrace: ToolTrace;
  TranscriptPage: TranscriptPage;
  TurnResult: TurnResult;
  URLSource: URLSource;
  URLSourceInput: URLSourceInput;
  URLUpdate: URLUpdate;
  UsageView: UsageView;
  UserCreate: UserCreate;
  ValidationError: ValidationError;
  VersionOut: VersionOut;
  VoiceAgent: VoiceAgent;
  VoiceAgents: VoiceAgents;
  VoiceCreate: VoiceCreate;
  VoiceOut: VoiceOut;
  VoiceSnapshot: VoiceSnapshot;
  brain__draft_test_routes__Capabilities: Brain_DraftTestRoutes__Capabilities;
  knowledge__contracts__Capabilities: Knowledge_Contracts__Capabilities;
}
export interface AgentConfig {
  clinic_profile?: ClinicProfile;
  greeting_en?: GreetingEn;
  greeting_ur?: GreetingUr;
  instructions?: Instructions;
  language_mode?: LanguageMode;
  name?: Name;
  prayer_break?: PrayerBreak;
  read_digits_in_english?: ReadDigitsInEnglish;
  schema_version?: SchemaVersion;
  tone?: Tone;
  voice_en_id?: VoiceEnId;
  voice_profiles?: VoiceProfiles;
  voice_ur_id?: VoiceUrId;
}
export interface ClinicProfile {
  address_en?: AddressEn;
  address_ur?: AddressUr;
  preparation_en?: PreparationEn;
  preparation_ur?: PreparationUr;
}
export interface VoiceProfiles {
  [k: string]: {
    [k: string]: unknown;
  };
}
export interface AgentCreate {
  name: Name1;
}
export interface AgentOut {
  active_version_id: ActiveVersionId;
  archived_at: ArchivedAt;
  draft_changed: DraftChanged;
  enabled: Enabled;
  id: Id;
  language_mode: LanguageMode1;
  name: Name2;
  published_number: PublishedNumber;
  revision: Revision;
}
export interface AgentPatch {
  enabled: Enabled1;
  revision: Revision1;
}
export interface AlertPage {
  date_basis?: DateBasis;
  freshness: FreshnessView;
  has_more: HasMore;
  items: Items;
  next_cursor: NextCursor;
  snapshot_at: SnapshotAt;
  total: Total;
}
export interface FreshnessView {
  as_of: AsOf;
  pending_buckets: PendingBuckets;
  pending_expirations: PendingExpirations;
  source?: Source;
  stale: Stale;
}
export interface AlertView {
  agent_id: AgentId;
  channel: Channel;
  denominator: Denominator;
  id: Id1;
  kind: Kind;
  language: Language;
  last_seen_at: LastSeenAt;
  numerator: Numerator;
  observed_value: ObservedValue;
  opened_at: OpenedAt;
  resolved_at: ResolvedAt;
  state: State;
  window_end: WindowEnd;
  window_start: WindowStart;
}
export interface AppointmentOut {
  created_at: CreatedAt;
  ends_at: EndsAt;
  id: Id2;
  patient_id: PatientId;
  provider_id: ProviderId;
  rescheduled_from_id: RescheduledFromId;
  service_id: ServiceId;
  starts_at: StartsAt;
  status: Status;
}
export interface AppointmentPage {
  items: Items1;
  limit: Limit;
  offset: Offset;
  total: Total1;
}
export interface CalendarAppointment {
  created_at: CreatedAt1;
  ends_at: EndsAt1;
  id: Id3;
  patient_id: PatientId1;
  patient_name: PatientName;
  patient_name_ur: PatientNameUr;
  provider_id: ProviderId1;
  provider_name: ProviderName;
  provider_name_ur: ProviderNameUr;
  rescheduled_from_id: RescheduledFromId1;
  service_id: ServiceId1;
  service_name: ServiceName;
  service_name_ur: ServiceNameUr;
  starts_at: StartsAt1;
  status: Status1;
}
export interface Availability {
  exceptions: Exceptions;
  revision: Revision2;
  rules: Rules;
}
export interface ExceptionOut {
  end_date: EndDate;
  end_time?: EndTime;
  id: Id4;
  kind: Kind1;
  provider_id: ProviderId2;
  start_date: StartDate;
  start_time?: StartTime;
}
export interface RuleOut {
  end_time: EndTime1;
  id: Id5;
  provider_id: ProviderId3;
  slot_min?: SlotMin;
  start_time: StartTime1;
  weekday: Weekday;
}
export interface AvailabilityChanges {
  added_exceptions: AddedExceptions;
  added_rules: AddedRules;
  removed_rule_ids: RemovedRuleIds;
}
export interface AvailabilityPreview {
  after: Availability;
  changes: AvailabilityChanges;
  revision: Revision3;
}
export interface AvailabilityTemplate {
  break_end?: BreakEnd;
  break_start?: BreakStart;
  end_date?: EndDate1;
  end_time?: EndTime2;
  revision: Revision4;
  start_date?: StartDate1;
  start_time?: StartTime2;
  template: Template;
}
export interface Book {
  confirmed: Confirmed;
  patient_id: PatientId2;
  provider_id: ProviderId4;
  service_id: ServiceId2;
  starts_at: StartsAt2;
}
export interface CallDetail {
  attempted_tasks: AttemptedTasks;
  call: CallView;
  completed_tasks: CompletedTasks;
  events: EventPage;
  measurements: MeasurementPage;
  operations: Operations;
  privacy: PrivacyView;
  summary: Summary;
  trace_id: TraceId;
  usage: UsageView;
}
export interface CallView {
  agent_id: AgentId1;
  channel: Channel1;
  end_reason: EndReason;
  ended_at: EndedAt;
  expires_at: ExpiresAt;
  language: Language1;
  local_date: LocalDate;
  outcome: Outcome;
  pending_expiry: PendingExpiry;
  quality_flags: QualityFlags;
  session_id: SessionId;
  started_at: StartedAt;
  status: Status2;
  timezone: Timezone;
  utc_offset_minutes: UtcOffsetMinutes;
}
export interface EventPage {
  has_more: HasMore1;
  items: Items2;
  next_cursor: NextCursor1;
  total: Total2;
}
export interface SafeEvent {
  kind: Kind2;
  language: Language2;
  occurred_at: OccurredAt;
  ordinal: Ordinal;
  tool_name: ToolName;
  tool_status: ToolStatus;
}
export interface MeasurementPage {
  has_more: HasMore2;
  items: Items3;
  next_cursor: NextCursor2;
  total: Total3;
}
export interface MeasurementView {
  duration_ms: DurationMs;
  id: Id6;
  language: Language3;
  observed_at: ObservedAt;
  origin: Origin;
  stage: Stage;
  turn_ordinal: TurnOrdinal;
}
export interface Operations {
  [k: string]: number;
}
export interface PrivacyView {
  availability: Availability1;
  reason: Reason;
  text_access: TextAccess;
}
export interface UsageView {
  basis?: Basis;
  cost_known: CostKnown;
  currency?: Currency;
  estimated_usd: EstimatedUsd;
  input_tokens: InputTokens;
  invocations: Invocations;
  output_tokens: OutputTokens;
  usage_known: UsageKnown;
}
export interface CallPage {
  has_more: HasMore3;
  items: Items4;
  next_cursor: NextCursor3;
  snapshot_at: SnapshotAt1;
  total: Total4;
}
export interface Capability {
  available: Available;
  reason?: Reason1;
}
export interface ClinicOut {
  cancellation_min: CancellationMin;
  currency: Currency1;
  daily_limit: DailyLimit;
  horizon_days: HorizonDays;
  id: Id7;
  min_notice_min: MinNoticeMin;
  name: Name3;
  timezone: Timezone1;
}
export interface ClinicPatch {
  cancellation_min?: CancellationMin1;
  daily_limit?: DailyLimit1;
  horizon_days?: HorizonDays1;
  min_notice_min?: MinNoticeMin1;
  name?: Name4;
  timezone?: Timezone2;
}
export interface ClinicProfile_Input {
  address_en?: AddressEn1;
  address_ur?: AddressUr1;
  preparation_en?: PreparationEn1;
  preparation_ur?: PreparationUr1;
}
export interface ClinicProfile_Output {
  address_en: AddressEn2;
  address_ur: AddressUr2;
  cancellation_min: CancellationMin2;
  currency: Currency2;
  daily_limit: DailyLimit2;
  horizon_days: HorizonDays2;
  id: Id8;
  min_notice_min: MinNoticeMin2;
  name: Name5;
  preparation_en: PreparationEn2;
  preparation_ur: PreparationUr2;
  revision: Revision5;
  timezone: Timezone3;
}
export interface Confirm {
  confirmed: Confirmed1;
}
export interface Conversation {
  messages: Messages;
  revision: Revision6;
  text_confirmation_reset: TextConfirmationReset;
  transport: Transport;
}
export interface Message {
  role?: Role;
  text: Text;
}
export interface DayCount {
  booking_sessions: BookingSessions;
  ended_sessions: EndedSessions;
  local_date: LocalDate1;
  sessions: Sessions;
}
export interface DraftOut {
  config: AgentConfig | LegacyAgentConfig;
  revision: Revision7;
  updated_at: UpdatedAt;
}
export interface LegacyAgentConfig {
  clinic_profile?: ClinicProfile;
  instructions?: Instructions1;
  language_mode?: LanguageMode2;
  name?: Name6;
  prayer_break?: PrayerBreak1;
  read_digits_in_english?: ReadDigitsInEnglish1;
  schema_version?: SchemaVersion1;
}
export interface DraftPut {
  config: AgentConfig;
  revision: Revision8;
}
export interface ExceptionCreate {
  end_date: EndDate2;
  end_time?: EndTime3;
  kind: Kind3;
  provider_id: ProviderId5;
  start_date: StartDate2;
  start_time?: StartTime3;
}
export interface FAQSource {
  answer: Answer;
  kind: Kind4;
  name: Name7;
  question: Question;
}
export interface FAQSourceInput {
  answer: Answer1;
  kind?: Kind5;
  question: Question1;
}
export interface FAQUpdate {
  answer: Answer2;
  kind: Kind6;
  name: Name8;
  question: Question2;
  revision: Revision9;
}
export interface FileSourceInput {
  format: Format;
  kind?: Kind7;
}
export interface Filters {
  agent_id?: AgentId2;
  channel?: Channel2;
  end: End;
  start: Start;
  timezone?: Timezone4;
}
export interface FixtureAppointment {
  ends_at: EndsAt2;
  id: Id9;
  patient_id: PatientId3;
  provider_id: ProviderId6;
  service_id: ServiceId3;
  starts_at: StartsAt3;
}
export interface FixturePatient {
  dob: Dob;
  id: Id10;
  name: Name9;
  phone: Phone;
}
export interface Fixtures {
  appointment: FixtureAppointment | null;
  appointment_unavailable_reason: AppointmentUnavailableReason;
  patients: Patients;
}
export interface GapRow {
  decision: Decision;
  fingerprint: Fingerprint;
  occurrences: Occurrences;
}
export interface HTTPValidationError {
  detail?: Detail;
}
export interface ValidationError {
  ctx?: Context;
  input?: Input;
  loc: Location;
  msg: Message1;
  type: ErrorType;
}
export interface Context {}
export interface Input {
  [k: string]: unknown;
}
export interface HourCount {
  booking_sessions: BookingSessions1;
  bucket_start: BucketStart;
  channel: Channel3;
  ended_sessions: EndedSessions1;
  local_date: LocalDate2;
  sessions: Sessions1;
  timezone: Timezone5;
  utc_offset_minutes: UtcOffsetMinutes1;
}
export interface HourSeries {
  items: Items5;
  limit?: Limit1;
  unavailable_reason: UnavailableReason;
}
export interface IntentRow {
  intent: Intent;
  sessions: Sessions2;
  share: Ratio;
}
export interface Ratio {
  denominator: Denominator1;
  numerator: Numerator1;
  value: Value;
}
export interface Intents {
  date_basis?: DateBasis1;
  filters: Filters;
  freshness: FreshnessView;
  items: Items6;
  overlapping?: Overlapping;
  purpose?: Purpose;
  snapshot_at: SnapshotAt2;
  timezones: Timezones;
  unavailable_reason: UnavailableReason1;
  unit?: Unit;
}
export interface KnowledgeCitation {
  chunk_id: ChunkId;
  cosine: Cosine;
  heading: Heading;
  language: Language4;
  quote: Quote;
  source_id: SourceId;
  source_name: SourceName;
}
export interface KnowledgeGaps {
  channel_attribution?: ChannelAttribution;
  date_basis?: DateBasis2;
  filters: Filters;
  freshness: FreshnessView;
  has_more: HasMore4;
  irrelevant: Irrelevant;
  items: Items7;
  next_cursor: NextCursor4;
  purpose?: Purpose1;
  snapshot_at: SnapshotAt3;
  timezones: Timezones1;
  total: Total5;
  unattributed_date_basis?: UnattributedDateBasis;
  unattributed_observations: UnattributedObservations;
  unavailable: Unavailable;
  unavailable_reason: UnavailableReason2;
}
export interface KnowledgeTrace {
  citations?: Citations;
  status: Status3;
}
export interface Latency {
  date_basis?: DateBasis3;
  filters: Filters;
  freshness: FreshnessView;
  purpose?: Purpose2;
  sample_limit?: SampleLimit;
  snapshot_at: SnapshotAt4;
  stages: Stages;
  timezones: Timezones2;
  unavailable_reason: UnavailableReason3;
}
export interface StageView {
  diagnostic: Diagnostic;
  eligible_sessions: EligibleSessions;
  p50_ms: P50Ms;
  p95_ms: P95Ms;
  sampled_sessions: SampledSessions;
  samples: Samples;
  stage: Stage1;
}
export interface Login {
  email: Email;
  password: Password;
}
export interface Me {
  email: Email1;
  id: Id11;
  role: Role1;
  tenant_id: TenantId;
}
export interface MediaGrant {
  expires_at: ExpiresAt1;
  generation: Generation;
  participant: Participant;
  room: Room;
  session_id: SessionId1;
  token: Token;
  url: Url;
}
export interface Merge {
  destination_id: DestinationId;
  destination_revision: DestinationRevision;
  fields: RetainedFields;
  source_revision: SourceRevision;
}
export interface RetainedFields {
  dob: Dob1;
  name: Name10;
  name_ur: NameUr;
  phone: Phone1;
}
export interface Move {
  confirmed: Confirmed2;
  provider_id?: ProviderId7;
  starts_at: StartsAt4;
}
export interface Overview {
  abandonment_rate: Ratio;
  average_duration_ms: AverageDurationMs;
  book_operations: BookOperations;
  booking_conversion: Ratio;
  cancel_operations: CancelOperations;
  date_basis?: DateBasis4;
  days: Days;
  duration_samples: DurationSamples;
  ended_sessions: EndedSessions2;
  filters: Filters;
  freshness: FreshnessView;
  handoff_rate: Ratio;
  hours: HourSeries;
  purpose?: Purpose3;
  reschedule_operations: RescheduleOperations;
  sessions: Sessions3;
  snapshot_at: SnapshotAt5;
  text_sessions: TextSessions;
  timezones: Timezones3;
  usage: UsageView;
  voice_sessions: VoiceSessions;
}
export interface PatientCreate {
  dob?: Dob2;
  name: Name11;
  name_ur?: NameUr1;
  phone: Phone2;
}
export interface PatientDetail {
  dob?: Dob3;
  id: Id12;
  merged_into_id: MergedIntoId;
  name: Name12;
  name_ur?: NameUr2;
  phone: Phone3;
  revision: Revision10;
}
export interface PatientOut {
  dob?: Dob4;
  id: Id13;
  name: Name13;
  name_ur?: NameUr3;
  phone: Phone4;
}
export interface PatientPage {
  items: Items8;
  limit: Limit2;
  offset: Offset1;
  total: Total6;
}
export interface Preview {
  available: Available1;
  excerpts: Excerpts;
  reason: Reason2;
  source_id: SourceId1;
}
export interface ProfilePatch {
  address_en?: AddressEn3;
  address_ur?: AddressUr3;
  cancellation_min?: CancellationMin3;
  confirm_timezone_change?: ConfirmTimezoneChange;
  daily_limit?: DailyLimit3;
  horizon_days?: HorizonDays3;
  min_notice_min?: MinNoticeMin3;
  name?: Name14;
  preparation_en?: PreparationEn3;
  preparation_ur?: PreparationUr3;
  revision: Revision11;
  timezone?: Timezone6;
}
export interface ProviderCreate {
  name: Name15;
  name_ur?: NameUr4;
  specialty?: Specialty;
}
export interface ProviderOut {
  active: Active;
  id: Id14;
  name: Name16;
  name_ur?: NameUr5;
  specialty?: Specialty1;
}
export interface ProviderPatch {
  active?: Active1;
  name?: Name17;
  name_ur?: NameUr6;
  specialty?: Specialty2;
}
export interface ProviderServiceItem {
  provider_id: ProviderId8;
  service_id: ServiceId4;
}
export interface ProviderServicePage {
  items: Items9;
  limit: Limit3;
  offset: Offset2;
  total: Total7;
}
export interface Quality {
  date_basis?: DateBasis5;
  filters: Filters;
  freshness: FreshnessView;
  purpose?: Purpose4;
  repeated_question: Ratio;
  snapshot_at: SnapshotAt6;
  task_completion: Ratio;
  timezones: Timezones4;
  tool_failure: Ratio;
  turns_per_task: Ratio;
}
export interface Refresh {
  refresh_token: RefreshToken;
}
export interface Register {
  clinic_name: ClinicName;
  display_name?: DisplayName;
  email: Email2;
  password: Password1;
  timezone: Timezone7;
}
export interface Revision12 {
  revision: Revision13;
}
export interface Rollback {
  revision: Revision14;
  version_id: VersionId;
}
export interface RuleCreate {
  end_time: EndTime4;
  provider_id: ProviderId9;
  slot_min?: SlotMin1;
  start_time: StartTime4;
  weekday: Weekday1;
}
export interface SearchChunk {
  chunk_id: ChunkId1;
  cosine: Cosine1;
  generation_id: GenerationId;
  heading: Heading1;
  language: Language5;
  name: Name18;
  profile: Profile;
  score: Score;
  source_id: SourceId2;
  text: Text1;
}
export interface SearchQuery {
  language: Language6;
  query: Query;
  query_id: QueryId;
}
export interface SearchResult {
  chunks: Chunks;
  reason: Reason3;
}
export interface ServiceCreate {
  buffer_after_min?: BufferAfterMin;
  buffer_before_min?: BufferBeforeMin;
  duration_min: DurationMin;
  name: Name19;
  name_ur?: NameUr7;
  price?: Price;
}
export interface ServiceOut {
  active: Active2;
  buffer_after_min?: BufferAfterMin1;
  buffer_before_min?: BufferBeforeMin1;
  duration_min: DurationMin1;
  id: Id15;
  name: Name20;
  name_ur?: NameUr8;
  price?: Price1;
}
export interface ServicePatch {
  active?: Active3;
  buffer_after_min?: BufferAfterMin2;
  buffer_before_min?: BufferBeforeMin2;
  duration_min?: DurationMin2;
  name?: Name21;
  name_ur?: NameUr9;
  price?: Price2;
}
export interface SettingsUpdate {
  capture_enabled: CaptureEnabled;
  retention_days: RetentionDays;
  revision: Revision15;
}
export interface SettingsView {
  capture_enabled: CaptureEnabled1;
  retention_days: RetentionDays1;
  revision: Revision16;
  updated_at: UpdatedAt1;
}
export interface Setup {
  agent: Agent;
  hours: Hours;
  profile: Profile1;
  providers: Providers;
  services: Services;
}
export interface Slot {
  ends_at: EndsAt3;
  provider_id: ProviderId10;
  service_id: ServiceId5;
  starts_at: StartsAt5;
}
export interface SourceDetailOut {
  active_generation_id: ActiveGenerationId;
  agent_id: AgentId3;
  available: Available2;
  chunk_count: ChunkCount;
  error_at: ErrorAt;
  error_code: ErrorCode;
  id: Id16;
  input: Input1;
  kind: Kind10;
  name: Name22;
  revision: Revision17;
  status: Status4;
  updated_at: UpdatedAt2;
}
export interface TextSourceInput {
  format: Format1;
  kind?: Kind8;
  text: Text2;
}
export interface URLSourceInput {
  kind?: Kind9;
  url: Url1;
}
export interface SourceOut {
  active_generation_id: ActiveGenerationId1;
  agent_id: AgentId4;
  available: Available3;
  chunk_count: ChunkCount1;
  error_at: ErrorAt1;
  error_code: ErrorCode1;
  id: Id17;
  kind: Kind11;
  name: Name23;
  revision: Revision18;
  status: Status5;
  updated_at: UpdatedAt3;
}
export interface TestCreate {
  draft_revision: DraftRevision;
  replace?: Replace;
}
export interface TestSnapshot {
  conversation: Conversation;
  draft_revision: DraftRevision1;
  expires_at: ExpiresAt2;
  fixtures: Fixtures;
  id: Id18;
  status: Status6;
  transport_capabilities: Brain_DraftTestRoutes__Capabilities;
}
export interface Brain_DraftTestRoutes__Capabilities {
  text: Capability;
  voice: Capability;
}
export interface TestTurn {
  command_id: CommandId;
  revision: Revision19;
  text: Text3;
}
export interface TestVoiceCreate {
  request_key: RequestKey;
}
export interface TextItem {
  occurred_at: OccurredAt1;
  ordinal: Ordinal1;
  speaker: Speaker;
  text: Text4;
}
export interface TextSource {
  format: Format2;
  kind: Kind12;
  name: Name24;
  text: Text5;
}
export interface TextUpdate {
  format: Format3;
  kind: Kind13;
  name: Name25;
  revision: Revision20;
  text: Text6;
}
export interface Tokens {
  access_token: AccessToken;
  expires_in: ExpiresIn;
  refresh_token: RefreshToken1;
  token_type?: TokenType;
}
export interface ToolTrace {
  action: Action;
  code: Code;
  ok: Ok;
}
export interface TranscriptPage {
  has_more: HasMore5;
  items: Items10;
  next_cursor: NextCursor5;
  privacy: PrivacyView;
  residual_sensitive_content?: ResidualSensitiveContent;
  total: Total8;
}
export interface TurnResult {
  id: Id19;
  knowledge?: KnowledgeTrace | null;
  messages: Messages1;
  revision: Revision21;
  status: Status7;
  tool_trace: ToolTrace1;
}
export interface URLSource {
  kind: Kind14;
  name: Name26;
  url: Url2;
}
export interface URLUpdate {
  kind: Kind15;
  name: Name27;
  revision: Revision22;
  url: Url3;
}
export interface UserCreate {
  email: Email3;
  password: Password2;
  role?: Role2;
}
export interface VersionOut {
  config: AgentConfig | LegacyAgentConfig;
  created_at: CreatedAt2;
  id: Id20;
  number: Number;
  publisher_id: PublisherId;
  publisher_name?: PublisherName;
  rollback_source_id: RollbackSourceId;
  warnings?: Warnings;
}
export interface VoiceAgent {
  id: Id21;
  language_mode: LanguageMode3;
  name: Name28;
}
export interface VoiceAgents {
  agents: Agents;
}
export interface VoiceCreate {
  agent_id: AgentId5;
  request_key: RequestKey1;
}
export interface VoiceOut {
  config_fingerprint: ConfigFingerprint;
  engine: Engine;
  gender: Gender;
  id: Id22;
  language: Language7;
  license: License;
  model_revision: ModelRevision;
  preview_available: PreviewAvailable;
  preview_url: PreviewUrl;
  readiness: Readiness;
  unavailable_reason: UnavailableReason4;
}
export interface VoiceSnapshot {
  call_deadline: CallDeadline;
  generation: Generation1;
  media?: MediaGrant | null;
  revision: Revision23;
  session_id: SessionId2;
  status: Status8;
}
export interface Knowledge_Contracts__Capabilities {
  enabled: Enabled2;
  processing_available?: ProcessingAvailable;
  query_available?: QueryAvailable;
  query_unavailable_reason?: QueryUnavailableReason;
  source_limit?: SourceLimit;
  unavailable_reason: UnavailableReason5;
  upload_max_bytes?: UploadMaxBytes;
}

export interface DashboardOperations {
  "GET /appointments": {
    body: undefined;
    response: Array<DashboardSchemas["AppointmentOut"]>;
  };
  "POST /appointments": {
    body: DashboardSchemas["Book"];
    response: DashboardSchemas["AppointmentOut"];
  };
  "GET /appointments/{identity}": {
    body: undefined;
    response: DashboardSchemas["AppointmentOut"];
  };
  "POST /appointments/{identity}/cancel": {
    body: DashboardSchemas["Confirm"];
    response: DashboardSchemas["AppointmentOut"];
  };
  "POST /appointments/{identity}/reschedule": {
    body: DashboardSchemas["Move"];
    response: DashboardSchemas["AppointmentOut"];
  };
  "POST /auth/login": {
    body: DashboardSchemas["Login"];
    response: DashboardSchemas["Tokens"];
  };
  "POST /auth/logout": {
    body: DashboardSchemas["Refresh"];
    response: undefined;
  };
  "GET /auth/me": { body: undefined; response: DashboardSchemas["Me"] };
  "POST /auth/refresh": {
    body: DashboardSchemas["Refresh"];
    response: DashboardSchemas["Tokens"];
  };
  "POST /auth/register": {
    body: DashboardSchemas["Register"];
    response: DashboardSchemas["Tokens"];
  };
  "GET /availability-rules": {
    body: undefined;
    response: Array<DashboardSchemas["RuleOut"]>;
  };
  "POST /availability-rules": {
    body: DashboardSchemas["RuleCreate"];
    response: DashboardSchemas["RuleOut"];
  };
  "DELETE /availability-rules/{identity}": {
    body: undefined;
    response: undefined;
  };
  "PUT /availability-rules/{identity}": {
    body: DashboardSchemas["RuleCreate"];
    response: DashboardSchemas["RuleOut"];
  };
  "GET /clinic": { body: undefined; response: DashboardSchemas["ClinicOut"] };
  "PATCH /clinic": {
    body: DashboardSchemas["ClinicPatch"];
    response: DashboardSchemas["ClinicOut"];
  };
  "GET /dashboard/agents": {
    body: undefined;
    response: Array<DashboardSchemas["AgentOut"]>;
  };
  "POST /dashboard/agents": {
    body: DashboardSchemas["AgentCreate"];
    response: DashboardSchemas["AgentOut"];
  };
  "GET /dashboard/agents/{agent_id}/knowledge/capabilities": {
    body: undefined;
    response: DashboardSchemas["knowledge__contracts__Capabilities"];
  };
  "POST /dashboard/agents/{agent_id}/knowledge/search": {
    body: DashboardSchemas["SearchQuery"];
    response: DashboardSchemas["SearchResult"];
  };
  "GET /dashboard/agents/{agent_id}/knowledge/sources": {
    body: undefined;
    response: Array<DashboardSchemas["SourceOut"]>;
  };
  "POST /dashboard/agents/{agent_id}/knowledge/sources": {
    body:
      | DashboardSchemas["TextSource"]
      | DashboardSchemas["FAQSource"]
      | DashboardSchemas["URLSource"];
    response: DashboardSchemas["SourceOut"];
  };
  "POST /dashboard/agents/{agent_id}/knowledge/sources/upload": {
    body: Blob;
    response: DashboardSchemas["SourceOut"];
  };
  "DELETE /dashboard/agents/{agent_id}/knowledge/sources/{source_id}": {
    body: undefined;
    response: DashboardSchemas["SourceOut"];
  };
  "GET /dashboard/agents/{agent_id}/knowledge/sources/{source_id}": {
    body: undefined;
    response: DashboardSchemas["SourceDetailOut"];
  };
  "PUT /dashboard/agents/{agent_id}/knowledge/sources/{source_id}": {
    body:
      | DashboardSchemas["TextUpdate"]
      | DashboardSchemas["FAQUpdate"]
      | DashboardSchemas["URLUpdate"];
    response: DashboardSchemas["SourceOut"];
  };
  "PUT /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/content": {
    body: Blob;
    response: DashboardSchemas["SourceOut"];
  };
  "GET /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/preview": {
    body: undefined;
    response: DashboardSchemas["Preview"];
  };
  "POST /dashboard/agents/{agent_id}/knowledge/sources/{source_id}/reindex": {
    body: DashboardSchemas["Revision"];
    response: DashboardSchemas["SourceOut"];
  };
  "POST /dashboard/agents/{agent_id}/tests": {
    body: DashboardSchemas["TestCreate"];
    response: DashboardSchemas["TestSnapshot"];
  };
  "DELETE /dashboard/agents/{identity}": {
    body: undefined;
    response: DashboardSchemas["AgentOut"];
  };
  "GET /dashboard/agents/{identity}": {
    body: undefined;
    response: DashboardSchemas["AgentOut"];
  };
  "PATCH /dashboard/agents/{identity}": {
    body: DashboardSchemas["AgentPatch"];
    response: DashboardSchemas["AgentOut"];
  };
  "GET /dashboard/agents/{identity}/draft": {
    body: undefined;
    response: DashboardSchemas["DraftOut"];
  };
  "PUT /dashboard/agents/{identity}/draft": {
    body: DashboardSchemas["DraftPut"];
    response: DashboardSchemas["DraftOut"];
  };
  "POST /dashboard/agents/{identity}/publish": {
    body: DashboardSchemas["Revision"];
    response: DashboardSchemas["VersionOut"];
  };
  "POST /dashboard/agents/{identity}/rollback": {
    body: DashboardSchemas["Rollback"];
    response: DashboardSchemas["VersionOut"];
  };
  "GET /dashboard/agents/{identity}/versions": {
    body: undefined;
    response: Array<DashboardSchemas["VersionOut"]>;
  };
  "GET /dashboard/analytics/alerts": {
    body: undefined;
    response: DashboardSchemas["AlertPage"];
  };
  "GET /dashboard/analytics/intents": {
    body: undefined;
    response: DashboardSchemas["Intents"];
  };
  "GET /dashboard/analytics/knowledge-gaps": {
    body: undefined;
    response: DashboardSchemas["KnowledgeGaps"];
  };
  "GET /dashboard/analytics/latency": {
    body: undefined;
    response: DashboardSchemas["Latency"];
  };
  "GET /dashboard/analytics/overview": {
    body: undefined;
    response: DashboardSchemas["Overview"];
  };
  "GET /dashboard/analytics/quality": {
    body: undefined;
    response: DashboardSchemas["Quality"];
  };
  "GET /dashboard/analytics/settings": {
    body: undefined;
    response: DashboardSchemas["SettingsView"];
  };
  "PUT /dashboard/analytics/settings": {
    body: DashboardSchemas["SettingsUpdate"];
    response: DashboardSchemas["SettingsView"];
  };
  "GET /dashboard/appointments": {
    body: undefined;
    response: DashboardSchemas["AppointmentPage"];
  };
  "GET /dashboard/calls": {
    body: undefined;
    response: DashboardSchemas["CallPage"];
  };
  "GET /dashboard/calls/{session_id}": {
    body: undefined;
    response: DashboardSchemas["CallDetail"];
  };
  "DELETE /dashboard/calls/{session_id}/transcript": {
    body: undefined;
    response: undefined;
  };
  "GET /dashboard/calls/{session_id}/transcript": {
    body: undefined;
    response: DashboardSchemas["TranscriptPage"];
  };
  "GET /dashboard/clinic": {
    body: undefined;
    response: DashboardSchemas["ClinicProfile-Output"];
  };
  "PATCH /dashboard/clinic": {
    body: DashboardSchemas["ProfilePatch"];
    response: DashboardSchemas["ClinicProfile-Output"];
  };
  "GET /dashboard/patients": {
    body: undefined;
    response: DashboardSchemas["PatientPage"];
  };
  "GET /dashboard/patients/{identity}": {
    body: undefined;
    response: DashboardSchemas["PatientDetail"];
  };
  "POST /dashboard/patients/{source_id}/merge": {
    body: DashboardSchemas["Merge"];
    response: DashboardSchemas["PatientDetail"];
  };
  "GET /dashboard/provider-services": {
    body: undefined;
    response: DashboardSchemas["ProviderServicePage"];
  };
  "GET /dashboard/providers/{identity}/availability": {
    body: undefined;
    response: DashboardSchemas["Availability"];
  };
  "POST /dashboard/providers/{identity}/availability/apply": {
    body: DashboardSchemas["AvailabilityTemplate"];
    response: DashboardSchemas["Availability"];
  };
  "POST /dashboard/providers/{identity}/availability/preview": {
    body: DashboardSchemas["AvailabilityTemplate"];
    response: DashboardSchemas["AvailabilityPreview"];
  };
  "GET /dashboard/setup": {
    body: undefined;
    response: DashboardSchemas["Setup"];
  };
  "GET /dashboard/tests/{identity}": {
    body: undefined;
    response: DashboardSchemas["TestSnapshot"];
  };
  "POST /dashboard/tests/{identity}/end": {
    body: undefined;
    response: DashboardSchemas["TestSnapshot"];
  };
  "POST /dashboard/tests/{identity}/turns": {
    body: DashboardSchemas["TestTurn"];
    response: DashboardSchemas["TurnResult"];
  };
  "GET /dashboard/tests/{identity}/voice": {
    body: undefined;
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "POST /dashboard/tests/{identity}/voice": {
    body: DashboardSchemas["TestVoiceCreate"];
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "POST /dashboard/tests/{identity}/voice/end": {
    body: undefined;
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "POST /dashboard/tests/{identity}/voice/resume": {
    body: undefined;
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "GET /dashboard/voices": {
    body: undefined;
    response: Array<DashboardSchemas["VoiceOut"]>;
  };
  "GET /exceptions": {
    body: undefined;
    response: Array<DashboardSchemas["ExceptionOut"]>;
  };
  "POST /exceptions": {
    body: DashboardSchemas["ExceptionCreate"];
    response: DashboardSchemas["ExceptionOut"];
  };
  "DELETE /exceptions/{identity}": { body: undefined; response: undefined };
  "PUT /exceptions/{identity}": {
    body: DashboardSchemas["ExceptionCreate"];
    response: DashboardSchemas["ExceptionOut"];
  };
  "GET /patients": {
    body: undefined;
    response: Array<DashboardSchemas["PatientOut"]>;
  };
  "POST /patients": {
    body: DashboardSchemas["PatientCreate"];
    response: DashboardSchemas["PatientOut"];
  };
  "GET /patients/{identity}": {
    body: undefined;
    response: DashboardSchemas["PatientOut"];
  };
  "PUT /patients/{identity}": {
    body: DashboardSchemas["PatientCreate"];
    response: DashboardSchemas["PatientOut"];
  };
  "GET /patients/{patient_id}/appointments": {
    body: undefined;
    response: Array<DashboardSchemas["AppointmentOut"]>;
  };
  "GET /providers": {
    body: undefined;
    response: Array<DashboardSchemas["ProviderOut"]>;
  };
  "POST /providers": {
    body: DashboardSchemas["ProviderCreate"];
    response: DashboardSchemas["ProviderOut"];
  };
  "DELETE /providers/{identity}": { body: undefined; response: undefined };
  "GET /providers/{identity}": {
    body: undefined;
    response: DashboardSchemas["ProviderOut"];
  };
  "PATCH /providers/{identity}": {
    body: DashboardSchemas["ProviderPatch"];
    response: DashboardSchemas["ProviderOut"];
  };
  "DELETE /providers/{provider_id}/services/{service_id}": {
    body: undefined;
    response: undefined;
  };
  "PUT /providers/{provider_id}/services/{service_id}": {
    body: undefined;
    response: undefined;
  };
  "GET /services": {
    body: undefined;
    response: Array<DashboardSchemas["ServiceOut"]>;
  };
  "POST /services": {
    body: DashboardSchemas["ServiceCreate"];
    response: DashboardSchemas["ServiceOut"];
  };
  "DELETE /services/{identity}": { body: undefined; response: undefined };
  "GET /services/{identity}": {
    body: undefined;
    response: DashboardSchemas["ServiceOut"];
  };
  "PATCH /services/{identity}": {
    body: DashboardSchemas["ServicePatch"];
    response: DashboardSchemas["ServiceOut"];
  };
  "GET /slots": { body: undefined; response: Array<DashboardSchemas["Slot"]> };
  "GET /users": { body: undefined; response: Array<DashboardSchemas["Me"]> };
  "POST /users": {
    body: DashboardSchemas["UserCreate"];
    response: DashboardSchemas["Me"];
  };
  "GET /voice/agents": {
    body: undefined;
    response: DashboardSchemas["VoiceAgents"];
  };
  "POST /voice/sessions": {
    body: DashboardSchemas["VoiceCreate"];
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "GET /voice/sessions/{identity}": {
    body: undefined;
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "POST /voice/sessions/{identity}/end": {
    body: undefined;
    response: DashboardSchemas["VoiceSnapshot"];
  };
  "POST /voice/sessions/{identity}/resume": {
    body: undefined;
    response: DashboardSchemas["VoiceSnapshot"];
  };
}
