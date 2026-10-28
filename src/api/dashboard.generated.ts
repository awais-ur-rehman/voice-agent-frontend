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
export type CreatedAt = string;
export type EndsAt = string;
export type Id1 = string;
export type PatientId = string;
export type ProviderId = string;
export type RescheduledFromId = string | null;
export type ServiceId = string;
export type StartsAt = string;
export type Status = string;
export type CreatedAt1 = string;
export type EndsAt1 = string;
export type Id2 = string;
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
export type Items = CalendarAppointment[];
export type Limit = number;
export type Offset = number;
export type Total = number;
export type EndDate = string;
export type EndTime = string | null;
export type Id3 = string;
export type Kind = "closed" | "custom";
export type ProviderId2 = string;
export type StartDate = string;
export type StartTime = string | null;
export type Exceptions = ExceptionOut[];
export type Revision2 = string;
export type EndTime1 = string;
export type Id4 = string;
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
export type Available = boolean;
export type Reason = string | null;
export type CancellationMin = number;
export type Currency = string;
export type DailyLimit = number;
export type HorizonDays = number;
export type Id5 = string;
export type MinNoticeMin = number;
export type Name3 = string;
export type Timezone = string;
export type CancellationMin1 = number | null;
export type DailyLimit1 = number | null;
export type HorizonDays1 = number | null;
export type MinNoticeMin1 = number | null;
export type Name4 = string | null;
export type Timezone1 = string | null;
export type AddressEn1 = string | null;
export type AddressUr1 = string | null;
export type PreparationEn1 = string | null;
export type PreparationUr1 = string | null;
export type AddressEn2 = string;
export type AddressUr2 = string;
export type CancellationMin2 = number;
export type Currency1 = string;
export type DailyLimit2 = number;
export type HorizonDays2 = number;
export type Id6 = string;
export type MinNoticeMin2 = number;
export type Name5 = string;
export type PreparationEn2 = string;
export type PreparationUr2 = string;
export type Revision5 = number;
export type Timezone2 = string;
export type Confirmed1 = boolean;
export type Role = "assistant";
export type Text = string;
export type Messages = Message[];
export type Revision6 = number;
export type TextConfirmationReset = boolean;
export type Transport = "text" | "voice";
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
export type Kind1 = "closed" | "custom";
export type ProviderId5 = string;
export type StartDate2 = string;
export type StartTime3 = string | null;
export type EndsAt2 = string;
export type Id7 = string;
export type PatientId3 = string;
export type ProviderId6 = string;
export type ServiceId3 = string;
export type StartsAt3 = string;
export type Dob = string;
export type Id8 = string;
export type Name7 = string;
export type Phone = string;
export type AppointmentUnavailableReason = string | null;
export type Patients = FixturePatient[];
export type Location = (string | number)[];
export type Message1 = string;
export type ErrorType = string;
export type Detail = ValidationError[];
export type Email = string;
export type Password = string;
export type Email1 = string;
export type Id9 = string;
export type Role1 = string;
export type TenantId = string;
export type ExpiresAt = string;
export type Generation = number;
export type Participant = string;
export type Room = string;
export type SessionId = string;
export type Token = string;
export type Url = string;
export type DestinationId = string;
export type DestinationRevision = number;
export type Dob1 = string | null;
export type Name8 = string;
export type NameUr = string | null;
export type Phone1 = string;
export type SourceRevision = number;
export type Confirmed2 = boolean;
export type ProviderId7 = string | null;
export type StartsAt4 = string;
export type Dob2 = string | null;
export type Name9 = string;
export type NameUr1 = string | null;
export type Phone2 = string;
export type Dob3 = string | null;
export type Id10 = string;
export type MergedIntoId = string | null;
export type Name10 = string;
export type NameUr2 = string | null;
export type Phone3 = string;
export type Revision9 = number;
export type Dob4 = string | null;
export type Id11 = string;
export type Name11 = string;
export type NameUr3 = string | null;
export type Phone4 = string;
export type Items1 = PatientDetail[];
export type Limit1 = number;
export type Offset1 = number;
export type Total1 = number;
export type AddressEn3 = string | null;
export type AddressUr3 = string | null;
export type CancellationMin3 = number | null;
export type ConfirmTimezoneChange = boolean;
export type DailyLimit3 = number | null;
export type HorizonDays3 = number | null;
export type MinNoticeMin3 = number | null;
export type Name12 = string | null;
export type PreparationEn3 = string | null;
export type PreparationUr3 = string | null;
export type Revision10 = number;
export type Timezone3 = string | null;
export type Name13 = string;
export type NameUr4 = string | null;
export type Specialty = string;
export type Active = boolean;
export type Id12 = string;
export type Name14 = string;
export type NameUr5 = string | null;
export type Specialty1 = string;
export type Active1 = boolean | null;
export type Name15 = string | null;
export type NameUr6 = string | null;
export type Specialty2 = string | null;
export type ProviderId8 = string;
export type ServiceId4 = string;
export type Items2 = ProviderServiceItem[];
export type Limit2 = number;
export type Offset2 = number;
export type Total2 = number;
export type RefreshToken = string;
export type ClinicName = string;
export type DisplayName = string | null;
export type Email2 = string;
export type Password1 = string;
export type Timezone4 = string;
export type Revision12 = number;
export type Revision13 = number;
export type VersionId = string;
export type EndTime4 = string;
export type ProviderId9 = string;
export type SlotMin1 = number;
export type StartTime4 = string;
export type Weekday1 = number;
export type BufferAfterMin = number;
export type BufferBeforeMin = number;
export type DurationMin = number;
export type Name16 = string;
export type NameUr7 = string | null;
export type Price = number | string;
export type Active2 = boolean;
export type BufferAfterMin1 = number;
export type BufferBeforeMin1 = number;
export type DurationMin1 = number;
export type Id13 = string;
export type Name17 = string;
export type NameUr8 = string | null;
export type Price1 = string;
export type Active3 = boolean | null;
export type BufferAfterMin2 = number | null;
export type BufferBeforeMin2 = number | null;
export type DurationMin2 = number | null;
export type Name18 = string | null;
export type NameUr9 = string | null;
export type Price2 = number | string | null;
export type Agent = boolean;
export type Hours = boolean;
export type Profile = boolean;
export type Providers = boolean;
export type Services = boolean;
export type EndsAt3 = string;
export type ProviderId10 = string;
export type ServiceId5 = string;
export type StartsAt5 = string;
export type DraftRevision = number;
export type Replace = boolean;
export type DraftRevision1 = number;
export type ExpiresAt1 = string;
export type Id14 = string;
export type Status2 = "active" | "ended" | "expired";
export type CommandId = string;
export type Revision14 = number;
export type Text1 = string;
export type RequestKey = string;
export type AccessToken = string;
export type ExpiresIn = number;
export type RefreshToken1 = string;
export type TokenType = string;
export type Action = string | null;
export type Code = string | null;
export type Ok = boolean;
export type Id15 = string;
export type Messages1 = Message[];
export type Revision15 = number;
export type Status3 = "active" | "ended" | "expired";
export type ToolTrace1 = ToolTrace[];
export type Email3 = string;
export type Password2 = string;
export type Role2 = "admin" | "staff";
export type CreatedAt2 = string;
export type Id16 = string;
export type Number = number | null;
export type PublisherId = string | null;
export type RollbackSourceId = string | null;
export type Warnings = string[];
export type Id17 = string;
export type LanguageMode3 = string;
export type Name19 = string;
export type Agents = VoiceAgent[];
export type AgentId = string;
export type RequestKey1 = string;
export type ConfigFingerprint = string;
export type Engine = "kokoro" | "parler";
export type Gender = "female" | "male";
export type Id18 = string;
export type Language = "en" | "ur";
export type License = string;
export type ModelRevision = string;
export type PreviewAvailable = false;
export type PreviewUrl = null;
export type Readiness = "provisional";
export type UnavailableReason = string;
export type CallDeadline = string;
export type Generation1 = number;
export type Revision16 = number;
export type SessionId1 = string;
export type Status4 =
  "provisioning" | "active" | "disconnected" | "ended" | "failed";

export interface DashboardSchemas {
  AgentConfig: AgentConfig;
  AgentCreate: AgentCreate;
  AgentOut: AgentOut;
  AgentPatch: AgentPatch;
  AppointmentOut: AppointmentOut;
  AppointmentPage: AppointmentPage;
  Availability: Availability;
  AvailabilityChanges: AvailabilityChanges;
  AvailabilityPreview: AvailabilityPreview;
  AvailabilityTemplate: AvailabilityTemplate;
  Book: Book;
  CalendarAppointment: CalendarAppointment;
  Capabilities: Capabilities;
  Capability: Capability;
  ClinicOut: ClinicOut;
  ClinicPatch: ClinicPatch;
  ClinicProfile: ClinicProfile;
  "ClinicProfile-Input": ClinicProfile_Input;
  "ClinicProfile-Output": ClinicProfile_Output;
  Confirm: Confirm;
  Conversation: Conversation;
  DraftOut: DraftOut;
  DraftPut: DraftPut;
  ExceptionCreate: ExceptionCreate;
  ExceptionOut: ExceptionOut;
  FixtureAppointment: FixtureAppointment;
  FixturePatient: FixturePatient;
  Fixtures: Fixtures;
  HTTPValidationError: HTTPValidationError;
  LegacyAgentConfig: LegacyAgentConfig;
  Login: Login;
  Me: Me;
  MediaGrant: MediaGrant;
  Merge: Merge;
  Message: Message;
  Move: Move;
  PatientCreate: PatientCreate;
  PatientDetail: PatientDetail;
  PatientOut: PatientOut;
  PatientPage: PatientPage;
  ProfilePatch: ProfilePatch;
  ProviderCreate: ProviderCreate;
  ProviderOut: ProviderOut;
  ProviderPatch: ProviderPatch;
  ProviderServiceItem: ProviderServiceItem;
  ProviderServicePage: ProviderServicePage;
  Refresh: Refresh;
  Register: Register;
  RetainedFields: RetainedFields;
  Revision: Revision11;
  Rollback: Rollback;
  RuleCreate: RuleCreate;
  RuleOut: RuleOut;
  ServiceCreate: ServiceCreate;
  ServiceOut: ServiceOut;
  ServicePatch: ServicePatch;
  Setup: Setup;
  Slot: Slot;
  TestCreate: TestCreate;
  TestSnapshot: TestSnapshot;
  TestTurn: TestTurn;
  TestVoiceCreate: TestVoiceCreate;
  Tokens: Tokens;
  ToolTrace: ToolTrace;
  TurnResult: TurnResult;
  UserCreate: UserCreate;
  ValidationError: ValidationError;
  VersionOut: VersionOut;
  VoiceAgent: VoiceAgent;
  VoiceAgents: VoiceAgents;
  VoiceCreate: VoiceCreate;
  VoiceOut: VoiceOut;
  VoiceSnapshot: VoiceSnapshot;
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
export interface AppointmentOut {
  created_at: CreatedAt;
  ends_at: EndsAt;
  id: Id1;
  patient_id: PatientId;
  provider_id: ProviderId;
  rescheduled_from_id: RescheduledFromId;
  service_id: ServiceId;
  starts_at: StartsAt;
  status: Status;
}
export interface AppointmentPage {
  items: Items;
  limit: Limit;
  offset: Offset;
  total: Total;
}
export interface CalendarAppointment {
  created_at: CreatedAt1;
  ends_at: EndsAt1;
  id: Id2;
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
  id: Id3;
  kind: Kind;
  provider_id: ProviderId2;
  start_date: StartDate;
  start_time?: StartTime;
}
export interface RuleOut {
  end_time: EndTime1;
  id: Id4;
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
export interface Capabilities {
  text: Capability;
  voice: Capability;
}
export interface Capability {
  available: Available;
  reason?: Reason;
}
export interface ClinicOut {
  cancellation_min: CancellationMin;
  currency: Currency;
  daily_limit: DailyLimit;
  horizon_days: HorizonDays;
  id: Id5;
  min_notice_min: MinNoticeMin;
  name: Name3;
  timezone: Timezone;
}
export interface ClinicPatch {
  cancellation_min?: CancellationMin1;
  daily_limit?: DailyLimit1;
  horizon_days?: HorizonDays1;
  min_notice_min?: MinNoticeMin1;
  name?: Name4;
  timezone?: Timezone1;
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
  currency: Currency1;
  daily_limit: DailyLimit2;
  horizon_days: HorizonDays2;
  id: Id6;
  min_notice_min: MinNoticeMin2;
  name: Name5;
  preparation_en: PreparationEn2;
  preparation_ur: PreparationUr2;
  revision: Revision5;
  timezone: Timezone2;
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
  kind: Kind1;
  provider_id: ProviderId5;
  start_date: StartDate2;
  start_time?: StartTime3;
}
export interface FixtureAppointment {
  ends_at: EndsAt2;
  id: Id7;
  patient_id: PatientId3;
  provider_id: ProviderId6;
  service_id: ServiceId3;
  starts_at: StartsAt3;
}
export interface FixturePatient {
  dob: Dob;
  id: Id8;
  name: Name7;
  phone: Phone;
}
export interface Fixtures {
  appointment: FixtureAppointment | null;
  appointment_unavailable_reason: AppointmentUnavailableReason;
  patients: Patients;
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
export interface Login {
  email: Email;
  password: Password;
}
export interface Me {
  email: Email1;
  id: Id9;
  role: Role1;
  tenant_id: TenantId;
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
export interface Merge {
  destination_id: DestinationId;
  destination_revision: DestinationRevision;
  fields: RetainedFields;
  source_revision: SourceRevision;
}
export interface RetainedFields {
  dob: Dob1;
  name: Name8;
  name_ur: NameUr;
  phone: Phone1;
}
export interface Move {
  confirmed: Confirmed2;
  provider_id?: ProviderId7;
  starts_at: StartsAt4;
}
export interface PatientCreate {
  dob?: Dob2;
  name: Name9;
  name_ur?: NameUr1;
  phone: Phone2;
}
export interface PatientDetail {
  dob?: Dob3;
  id: Id10;
  merged_into_id: MergedIntoId;
  name: Name10;
  name_ur?: NameUr2;
  phone: Phone3;
  revision: Revision9;
}
export interface PatientOut {
  dob?: Dob4;
  id: Id11;
  name: Name11;
  name_ur?: NameUr3;
  phone: Phone4;
}
export interface PatientPage {
  items: Items1;
  limit: Limit1;
  offset: Offset1;
  total: Total1;
}
export interface ProfilePatch {
  address_en?: AddressEn3;
  address_ur?: AddressUr3;
  cancellation_min?: CancellationMin3;
  confirm_timezone_change?: ConfirmTimezoneChange;
  daily_limit?: DailyLimit3;
  horizon_days?: HorizonDays3;
  min_notice_min?: MinNoticeMin3;
  name?: Name12;
  preparation_en?: PreparationEn3;
  preparation_ur?: PreparationUr3;
  revision: Revision10;
  timezone?: Timezone3;
}
export interface ProviderCreate {
  name: Name13;
  name_ur?: NameUr4;
  specialty?: Specialty;
}
export interface ProviderOut {
  active: Active;
  id: Id12;
  name: Name14;
  name_ur?: NameUr5;
  specialty?: Specialty1;
}
export interface ProviderPatch {
  active?: Active1;
  name?: Name15;
  name_ur?: NameUr6;
  specialty?: Specialty2;
}
export interface ProviderServiceItem {
  provider_id: ProviderId8;
  service_id: ServiceId4;
}
export interface ProviderServicePage {
  items: Items2;
  limit: Limit2;
  offset: Offset2;
  total: Total2;
}
export interface Refresh {
  refresh_token: RefreshToken;
}
export interface Register {
  clinic_name: ClinicName;
  display_name?: DisplayName;
  email: Email2;
  password: Password1;
  timezone: Timezone4;
}
export interface Revision11 {
  revision: Revision12;
}
export interface Rollback {
  revision: Revision13;
  version_id: VersionId;
}
export interface RuleCreate {
  end_time: EndTime4;
  provider_id: ProviderId9;
  slot_min?: SlotMin1;
  start_time: StartTime4;
  weekday: Weekday1;
}
export interface ServiceCreate {
  buffer_after_min?: BufferAfterMin;
  buffer_before_min?: BufferBeforeMin;
  duration_min: DurationMin;
  name: Name16;
  name_ur?: NameUr7;
  price?: Price;
}
export interface ServiceOut {
  active: Active2;
  buffer_after_min?: BufferAfterMin1;
  buffer_before_min?: BufferBeforeMin1;
  duration_min: DurationMin1;
  id: Id13;
  name: Name17;
  name_ur?: NameUr8;
  price?: Price1;
}
export interface ServicePatch {
  active?: Active3;
  buffer_after_min?: BufferAfterMin2;
  buffer_before_min?: BufferBeforeMin2;
  duration_min?: DurationMin2;
  name?: Name18;
  name_ur?: NameUr9;
  price?: Price2;
}
export interface Setup {
  agent: Agent;
  hours: Hours;
  profile: Profile;
  providers: Providers;
  services: Services;
}
export interface Slot {
  ends_at: EndsAt3;
  provider_id: ProviderId10;
  service_id: ServiceId5;
  starts_at: StartsAt5;
}
export interface TestCreate {
  draft_revision: DraftRevision;
  replace?: Replace;
}
export interface TestSnapshot {
  conversation: Conversation;
  draft_revision: DraftRevision1;
  expires_at: ExpiresAt1;
  fixtures: Fixtures;
  id: Id14;
  status: Status2;
  transport_capabilities: Capabilities;
}
export interface TestTurn {
  command_id: CommandId;
  revision: Revision14;
  text: Text1;
}
export interface TestVoiceCreate {
  request_key: RequestKey;
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
export interface TurnResult {
  id: Id15;
  messages: Messages1;
  revision: Revision15;
  status: Status3;
  tool_trace: ToolTrace1;
}
export interface UserCreate {
  email: Email3;
  password: Password2;
  role?: Role2;
}
export interface VersionOut {
  config: AgentConfig | LegacyAgentConfig;
  created_at: CreatedAt2;
  id: Id16;
  number: Number;
  publisher_id: PublisherId;
  rollback_source_id: RollbackSourceId;
  warnings?: Warnings;
}
export interface VoiceAgent {
  id: Id17;
  language_mode: LanguageMode3;
  name: Name19;
}
export interface VoiceAgents {
  agents: Agents;
}
export interface VoiceCreate {
  agent_id: AgentId;
  request_key: RequestKey1;
}
export interface VoiceOut {
  config_fingerprint: ConfigFingerprint;
  engine: Engine;
  gender: Gender;
  id: Id18;
  language: Language;
  license: License;
  model_revision: ModelRevision;
  preview_available: PreviewAvailable;
  preview_url: PreviewUrl;
  readiness: Readiness;
  unavailable_reason: UnavailableReason;
}
export interface VoiceSnapshot {
  call_deadline: CallDeadline;
  generation: Generation1;
  media?: MediaGrant | null;
  revision: Revision16;
  session_id: SessionId1;
  status: Status4;
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
  "GET /dashboard/appointments": {
    body: undefined;
    response: DashboardSchemas["AppointmentPage"];
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
