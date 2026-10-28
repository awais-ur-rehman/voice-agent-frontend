import { useEffect, useRef, useState } from "react";
import { Link, useBlocker, useParams } from "react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../../app/auth";
import { DashboardError } from "../../api/dashboard";
import type {
  AgentConfig,
  AgentOut,
  DraftOut,
  VoiceOut,
  VersionOut,
} from "../../api/dashboard.generated";
import {
  useDashboardQuery,
  QueryState,
  useRefreshClinic,
} from "../clinic/ClinicPages";
import {
  PageHeader,
  ErrorSummary,
  StatusBadge,
} from "../../components/ui/patterns";
import { TestPanel } from "./TestPanel";
type Intent = {
  kind: "publish" | "rollback" | "archive" | "enabled" | "save";
  identity: string;
  revision: number;
  key: string;
  name: string;
  version?: VersionOut;
  enabled?: boolean;
  config?: AgentConfig;
  firstPublication: boolean;
  changes: { label: string; before: string; after: string }[];
};
function editable(config: DraftOut["config"]): AgentConfig {
  return {
    name: config.name ?? "",
    language_mode: config.language_mode ?? "bilingual",
    instructions: config.instructions ?? "",
    read_digits_in_english: config.read_digits_in_english ?? false,
    prayer_break: config.prayer_break ?? null,
    ...(config.schema_version === 2
      ? {
          schema_version: 2,
          greeting_en: config.greeting_en ?? "",
          greeting_ur: config.greeting_ur ?? "",
          tone: config.tone ?? "friendly",
          voice_en_id: config.voice_en_id ?? "",
          voice_ur_id: config.voice_ur_id ?? "",
        }
      : {}),
  };
}
function validate(config: AgentConfig, voices: VoiceOut[]) {
  if (!config.name?.trim()) return "Enter a nonblank agent name.";
  if (!config.instructions?.trim()) return "Enter additional instructions.";
  if (config.schema_version !== 2)
    return "Review the upgrade and select voices before saving.";
  if (config.language_mode !== "ur" && !config.greeting_en?.trim())
    return "An English greeting is required.";
  if (config.language_mode !== "en" && !config.greeting_ur?.trim())
    return "An Urdu greeting is required.";
  const en = voices.find(
      (v) => v.id === config.voice_en_id && v.language === "en",
    ),
    ur = voices.find((v) => v.id === config.voice_ur_id && v.language === "ur");
  if (!en || !ur)
    return "Choose both English and Urdu voices, including the stored inactive-language choice.";
  if (config.language_mode === "bilingual" && en.gender !== ur.gender)
    return "Bilingual voices require matching gender.";
  if (
    config.prayer_break &&
    (!config.prayer_break[0] ||
      !config.prayer_break[1] ||
      config.prayer_break[0] >= config.prayer_break[1])
  )
    return "Prayer break requires ordered clinic-local start and end times.";
  return "";
}
export function AgentEditor() {
  const { identity = "" } = useParams();
  const auth = useAuth();
  if (!auth.isManager) return <p>Owners and admins manage agent drafts.</p>;
  return (
    <EditorLoader key={`${auth.sessionId}:${identity}`} identity={identity} />
  );
}
function EditorLoader({ identity }: { identity: string }) {
  const agent = useDashboardQuery("GET /dashboard/agents/{identity}", {
      params: { identity },
    }),
    draft = useDashboardQuery("GET /dashboard/agents/{identity}/draft", {
      params: { identity },
    }),
    voices = useDashboardQuery("GET /dashboard/voices"),
    versions = useDashboardQuery("GET /dashboard/agents/{identity}/versions", {
      params: { identity },
    });
  return (
    <QueryState query={agent}>
      <QueryState query={draft}>
        <QueryState query={voices}>
          {agent.data && draft.data && voices.data && (
            <Editor
              agent={agent.data}
              saved={draft.data}
              voices={voices.data}
              versions={versions.data ?? []}
              versionsError={versions.error}
              versionsPending={versions.isPending}
              versionsFetching={versions.isFetching}
              retryVersions={() => void versions.refetch()}
            />
          )}
        </QueryState>
      </QueryState>
    </QueryState>
  );
}
function Editor({
  agent,
  saved,
  voices,
  versions,
  versionsError,
  versionsPending,
  versionsFetching,
  retryVersions,
}: {
  agent: AgentOut;
  saved: DraftOut;
  voices: VoiceOut[];
  versions: VersionOut[];
  versionsError: unknown;
  versionsPending: boolean;
  versionsFetching: boolean;
  retryVersions: () => void;
}) {
  const auth = useAuth(),
    refresh = useRefreshClinic();
  const [baseline, setBaseline] = useState(saved),
    [values, setValues] = useState(() => editable(saved.config)),
    [tab, setTab] = useState("General"),
    [error, setError] = useState<unknown>(),
    [intent, setIntent] = useState<Intent | null>(null),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [testActive, setTestActive] = useState(false),
    [notice, setNotice] = useState("");
  const lock = useRef(false);
  const dirty =
    JSON.stringify(values) !== JSON.stringify(editable(baseline.config));
  const remote = saved.revision > baseline.revision;
  const frozen = !!intent || busy || !!agent.archived_at;
  const publishedVersion = versions.find(
    (version) => version.id === agent.active_version_id,
  );
  const publicationBlocked = !!agent.active_version_id && !publishedVersion;
  // Reconcile only a clean editor; a dirty editor retains its original revision through refetch.
  if (remote && !dirty && !intent) {
    setBaseline(saved);
    setValues(editable(saved.config));
  }
  const blocker = useBlocker(dirty || !!intent);
  useEffect(() => {
    const listener = (e: BeforeUnloadEvent) => {
      if (dirty || lock.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, [dirty]);
  function change<K extends keyof AgentConfig>(key: K, value: AgentConfig[K]) {
    setValues((old) => ({ ...old, [key]: value }));
    setError(undefined);
  }
  function review(kind: Intent["kind"], version?: VersionOut) {
    if (lock.current) return;
    if (["publish", "rollback"].includes(kind) && (dirty || testActive)) {
      setError(
        "Save edits and end the current test before publishing or rolling back.",
      );
      return;
    }
    if (kind === "publish") {
      if (publicationBlocked) {
        setError(
          "Load the active published version before reviewing publication.",
        );
        return;
      }
      const problem = validate(values, voices);
      if (problem) {
        setError(problem);
        return;
      }
    }
    const next: Intent = {
      kind,
      identity: agent.id,
      revision: kind === "enabled" ? agent.revision : baseline.revision,
      key: crypto.randomUUID(),
      name: values.name ?? agent.name,
      firstPublication: !agent.active_version_id,
      changes: (
        [
          ["name", "Name"],
          ["language_mode", "Language"],
          ["greeting_en", "English greeting"],
          ["greeting_ur", "Urdu greeting"],
          ["tone", "Tone"],
          ["instructions", "Additional instructions"],
          ["voice_en_id", "English voice"],
          ["voice_ur_id", "Urdu voice"],
          ["read_digits_in_english", "Read digits in English"],
          ["prayer_break", "Friday prayer break"],
        ] as const
      ).flatMap(([field, label]) => {
        const previous: AgentConfig = publishedVersion
          ? editable(publishedVersion.config)
          : {};
        const format = (value: unknown) =>
          Array.isArray(value)
            ? value.join(" – ")
            : value === undefined || value === null || value === ""
              ? "Not configured"
              : typeof value === "boolean"
                ? value
                  ? "Yes"
                  : "No"
                : String(value);
        return JSON.stringify(previous[field]) === JSON.stringify(values[field])
          ? []
          : [
              {
                label,
                before: agent.active_version_id
                  ? format(previous[field])
                  : "No published version",
                after: format(values[field]),
              },
            ];
      }),
      ...(version ? { version } : {}),
      ...(kind === "enabled" ? { enabled: !agent.enabled } : {}),
      ...(kind === "save"
        ? { config: { ...values, name: values.name?.trim() ?? "" } }
        : {}),
    };
    lock.current = true;
    setIntent(next);
    setUncertain(false);
    setError(undefined);
    if (kind === "save") void execute(next);
  }
  async function execute(next: Intent) {
    if (busy) return;
    if (next.kind === "publish" && publicationBlocked) {
      setError(
        "Load the active published version before confirming publication.",
      );
      return;
    }
    setBusy(true);
    setError(undefined);
    try {
      const params = { identity: next.identity },
        idempotencyKey = next.key;
      switch (next.kind) {
        case "save": {
          const result = await auth.request(
            "PUT /dashboard/agents/{identity}/draft",
            {
              params,
              body: { revision: next.revision, config: next.config! },
              idempotencyKey,
            },
          );
          setBaseline(result);
          setValues(editable(result.config));
          setNotice("Draft saved.");
          break;
        }
        case "publish":
        case "rollback": {
          const result =
            next.kind === "publish"
              ? await auth.request(
                  "POST /dashboard/agents/{identity}/publish",
                  { params, body: { revision: next.revision }, idempotencyKey },
                )
              : await auth.request(
                  "POST /dashboard/agents/{identity}/rollback",
                  {
                    params,
                    body: {
                      revision: next.revision,
                      version_id: next.version!.id,
                    },
                    idempotencyKey,
                  },
                );
          const current = await auth.request(
            "GET /dashboard/agents/{identity}/draft",
            { params },
          );
          setBaseline(current);
          setValues(editable(current.config));
          setNotice(
            `Published version ${result.number}. ${result.warnings?.join(" ") ?? ""}`,
          );
          break;
        }
        case "archive":
          await auth.request("DELETE /dashboard/agents/{identity}", {
            params,
            idempotencyKey,
          });
          setNotice(
            "Agent archived. Existing sessions retain their pinned versions.",
          );
          break;
        case "enabled":
          await auth.request("PATCH /dashboard/agents/{identity}", {
            params,
            body: { revision: next.revision, enabled: next.enabled! },
            idempotencyKey,
          });
          setNotice(
            next.enabled
              ? "New admission enabled."
              : "New admission disabled. Existing sessions may finish.",
          );
          break;
      }
      setIntent(null);
      setUncertain(false);
      lock.current = false;
      await refresh();
    } catch (e) {
      setError(e);
      setUncertain(
        !(e instanceof DashboardError) || e.status >= 500 || e.status === 408,
      );
      if (
        next.kind === "save" &&
        e instanceof DashboardError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 408
      ) {
        setIntent(null);
        lock.current = false;
      }
      if (
        e instanceof DashboardError &&
        e.status >= 400 &&
        e.status < 500 &&
        e.status !== 408
      )
        await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeader
        title={agent.name}
        description="Draft changes take effect only after publication."
        actions={
          <Link to="/agents" className="button secondary">
            All agents
          </Link>
        }
      />
      <div className="agent-toolbar">
        <StatusBadge>
          {agent.archived_at
            ? "Archived"
            : agent.enabled
              ? "Enabled"
              : "Disabled"}
        </StatusBadge>
        <span>
          {agent.published_number
            ? `Published v${agent.published_number}`
            : "Not published"}
        </span>
        <span role="status">
          {dirty
            ? "Unsaved changes"
            : `Saved draft · revision ${baseline.revision}`}
        </span>
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={frozen || !dirty || values.schema_version !== 2}
            onClick={() => {
              const problem = validate(values, voices);
              if (problem) setError(problem);
              else review("save");
            }}
          >
            Save draft
          </button>
          <button
            className="button"
            disabled={
              frozen ||
              dirty ||
              testActive ||
              publicationBlocked ||
              values.schema_version !== 2
            }
            onClick={() => review("publish")}
          >
            Publish
          </button>
        </div>
      </div>
      {publicationBlocked && (
        <div className="notice" role="status">
          <p>
            {versionsPending
              ? "Loading published version details. Publication requires the active version for comparison."
              : "Published version details are unavailable. Retry version history before publishing."}
          </p>
          <ErrorSummary error={versionsError} />
          <button
            className="button secondary"
            disabled={versionsFetching}
            onClick={retryVersions}
          >
            Retry version history
          </button>
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="agent-layout">
        <section className="panel agent-editor">
          <div className="agent-tabs" role="group" aria-label="Agent sections">
            {["General", "Voice", "Versions", "Test"].map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={tab === item}
                disabled={!!intent}
                onClick={() => setTab(item)}
              >
                {item}
              </button>
            ))}
          </div>
          {remote && dirty && (
            <div className="notice">
              The saved draft changed. Your edits still use revision{" "}
              {baseline.revision}.
              <button
                className="button secondary"
                disabled={frozen}
                onClick={() => {
                  setBaseline(saved);
                  setValues(editable(saved.config));
                  setError(undefined);
                }}
              >
                Discard edits and reload saved draft
              </button>
            </div>
          )}
          {values.schema_version !== 2 && (
            <div className="notice">
              <p>
                This legacy draft retains its existing voice behavior. Upgrade
                deliberately to choose explicit English and Urdu profiles.
              </p>
              <button
                className="button secondary"
                disabled={frozen}
                onClick={() =>
                  setValues({
                    ...values,
                    schema_version: 2,
                    greeting_en: "",
                    greeting_ur: "",
                    tone: "friendly",
                    voice_en_id: "",
                    voice_ur_id: "",
                  })
                }
              >
                Review upgrade to version 2
              </button>
            </div>
          )}
          {tab === "General" && (
            <fieldset className="form-field" disabled={frozen}>
              <legend className="sr-only">General agent settings</legend>
              <label htmlFor="agent-name">Agent name</label>
              <input
                id="agent-name"
                dir="auto"
                value={values.name ?? ""}
                maxLength={100}
                onChange={(e) => change("name", e.target.value)}
              />
              <div className="form-grid">
                <div>
                  <label htmlFor="language-mode">Language</label>
                  <select
                    id="language-mode"
                    value={values.language_mode}
                    onChange={(e) =>
                      change(
                        "language_mode",
                        e.target.value as AgentConfig["language_mode"],
                      )
                    }
                  >
                    <option value="bilingual">English + Urdu</option>
                    <option value="en">English</option>
                    <option value="ur">Urdu</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="agent-tone">Tone</label>
                  <select
                    id="agent-tone"
                    disabled={values.schema_version !== 2}
                    value={values.tone ?? "friendly"}
                    onChange={(e) =>
                      change("tone", e.target.value as AgentConfig["tone"])
                    }
                  >
                    <option value="friendly">Friendly</option>
                    <option value="formal">Formal</option>
                    <option value="concise">Concise</option>
                  </select>
                </div>
              </div>
              {values.schema_version === 2 && (
                <>
                  <label htmlFor="greeting-en">English greeting</label>
                  <textarea
                    id="greeting-en"
                    value={values.greeting_en ?? ""}
                    maxLength={500}
                    onChange={(e) => change("greeting_en", e.target.value)}
                  />
                  <label htmlFor="greeting-ur">Urdu greeting</label>
                  <textarea
                    id="greeting-ur"
                    dir="auto"
                    lang="ur"
                    value={values.greeting_ur ?? ""}
                    maxLength={500}
                    onChange={(e) => change("greeting_ur", e.target.value)}
                  />
                </>
              )}
              <label htmlFor="agent-instructions">
                Additional instructions
              </label>
              <textarea
                id="agent-instructions"
                dir="auto"
                value={values.instructions ?? ""}
                maxLength={2000}
                onChange={(e) => change("instructions", e.target.value)}
              />
              <p className="muted">
                AI disclosure and safety rules are always applied by the system.
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={values.read_digits_in_english ?? false}
                  onChange={(e) =>
                    change("read_digits_in_english", e.target.checked)
                  }
                />
                Read digits in English
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={!!values.prayer_break}
                  onChange={(e) =>
                    change("prayer_break", e.target.checked ? ["", ""] : null)
                  }
                />
                Set Friday prayer break
              </label>
              <p className="muted">
                Clinic-local times help interpret “after Friday prayers”. This
                does not replace provider availability.
              </p>
              {values.prayer_break && (
                <div className="form-grid">
                  {(["Start", "End"] as const).map((label, index) => (
                    <div key={label}>
                      <label htmlFor={`prayer-${index}`}>
                        Prayer break {label.toLowerCase()}
                      </label>
                      <input
                        id={`prayer-${index}`}
                        type="time"
                        value={values.prayer_break?.[index] ?? ""}
                        onChange={(e) => {
                          const times: [string, string] = [
                            ...values.prayer_break!,
                          ];
                          times[index] = e.target.value;
                          change("prayer_break", times);
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
              <p className="muted">
                Address and preparation instructions come from{" "}
                <Link to="/clinic">Clinic settings</Link>. Publishing and
                testing capture those saved settings.
              </p>
            </fieldset>
          )}
          {tab === "Voice" && (
            <fieldset
              className="form-field"
              disabled={frozen || values.schema_version !== 2}
            >
              <legend>Voice profiles</legend>
              <p className="notice">
                All profiles are provisional. Saving a choice does not enable
                native speech admission.
              </p>
              <p>
                Both language choices are stored, including the inactive
                language. Bilingual voices must have matching gender.
              </p>
              {(["en", "ur"] as const).map((lang) => (
                <div className="voice-choice" key={lang}>
                  <label htmlFor={`voice-${lang}`}>
                    {lang === "en" ? "English" : "Urdu"} voice
                  </label>
                  <select
                    id={`voice-${lang}`}
                    value={
                      values[lang === "en" ? "voice_en_id" : "voice_ur_id"] ??
                      ""
                    }
                    onChange={(e) =>
                      change(
                        lang === "en" ? "voice_en_id" : "voice_ur_id",
                        e.target.value,
                      )
                    }
                  >
                    <option value="">Choose a voice</option>
                    {(["female", "male"] as const).map((gender) => (
                      <optgroup
                        label={gender === "female" ? "Female" : "Male"}
                        key={gender}
                      >
                        {voices
                          .filter(
                            (v) => v.language === lang && v.gender === gender,
                          )
                          .slice(0, 3)
                          .map((voice) => (
                            <option value={voice.id} key={voice.id}>
                              {voice.id} · {voice.engine}
                            </option>
                          ))}
                      </optgroup>
                    ))}
                  </select>
                  <button type="button" className="button secondary" disabled>
                    Preview unavailable
                  </button>
                  <p className="muted">
                    {voices.find(
                      (v) =>
                        v.id ===
                        values[lang === "en" ? "voice_en_id" : "voice_ur_id"],
                    )?.unavailable_reason ??
                      "No verified pre-rendered preview exists."}
                  </p>
                </div>
              ))}
            </fieldset>
          )}
          {tab === "Versions" && (
            <>
              <h2>Published history</h2>
              <ErrorSummary error={publicationBlocked ? null : versionsError} />
              {versions.length ? (
                <ol className="version-list">
                  {versions.map((version) => (
                    <li key={version.id}>
                      <strong>Version {version.number ?? "Legacy"}</strong>
                      <p>
                        {new Date(version.created_at).toLocaleString()} ·
                        Publisher {version.publisher_id ?? "Legacy record"}
                      </p>
                      {version.rollback_source_id && (
                        <p>
                          Copied from version{" "}
                          {versions.find(
                            (v) => v.id === version.rollback_source_id,
                          )?.number ?? version.rollback_source_id}
                        </p>
                      )}
                      <button
                        className="button secondary"
                        disabled={frozen || dirty || testActive}
                        onClick={() => review("rollback", version)}
                      >
                        Restore as new version
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p>No published versions.</p>
              )}
              <p className="muted">
                Restoring creates a new immutable version. History and existing
                sessions stay pinned.
              </p>
            </>
          )}
          {tab === "Test" && (
            <>
              <h2>Test the saved draft</h2>
              <p>
                The isolated panel uses saved revision {baseline.revision}. Save
                edits before creating a fresh snapshot.
              </p>
              <p>
                Text tests run real planning against synthetic records. Speech
                remains gated by native capability checks.
              </p>
            </>
          )}
          <ErrorSummary
            error={intent && intent.kind !== "save" ? null : error}
          />
          <div className="agent-danger">
            <button
              className="button secondary"
              disabled={frozen || testActive}
              onClick={() => review("enabled")}
            >
              {agent.enabled ? "Disable agent" : "Enable agent"}
            </button>
            <button
              className="button secondary"
              disabled={frozen || testActive || dirty}
              onClick={() => review("archive")}
            >
              Archive agent
            </button>
          </div>
        </section>
        <TestPanel
          agentId={agent.id}
          revision={baseline.revision}
          disabled={dirty || frozen || values.schema_version !== 2}
          onActive={setTestActive}
        />
      </div>
      <Dialog.Root
        open={!!intent && (intent.kind !== "save" || uncertain)}
        onOpenChange={(open) => {
          if (!open && !busy && !uncertain) {
            setIntent(null);
            lock.current = false;
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onEscapeKeyDown={(e) => {
              if (busy || uncertain) e.preventDefault();
            }}
            onInteractOutside={(e) => {
              if (busy || uncertain) e.preventDefault();
            }}
          >
            <Dialog.Title>
              {intent?.kind === "rollback"
                ? "Restore as new version"
                : intent?.kind === "archive"
                  ? "Archive agent"
                  : intent?.kind === "enabled"
                    ? intent.enabled
                      ? "Enable agent"
                      : "Disable agent"
                    : intent?.kind === "save"
                      ? "Retry draft save"
                      : "Review publication"}
            </Dialog.Title>
            <Dialog.Description>
              {intent?.name} · captured revision {intent?.revision}.{" "}
              {intent?.kind === "publish"
                ? "Publish the saved draft as a new immutable version. Provisional voice selections do not enable speech."
                : intent?.kind === "rollback"
                  ? `Copy version ${intent.version?.number} into a new version and saved draft.`
                  : "Existing admitted sessions keep their pinned configuration and may finish."}
            </Dialog.Description>
            {intent?.kind === "publish" && (
              <dl>
                <dt>Language</dt>
                <dd>{values.language_mode}</dd>
                <dt>English voice</dt>
                <dd>{values.voice_en_id}</dd>
                <dt>Urdu voice</dt>
                <dd>{values.voice_ur_id}</dd>
                <dt>Draft</dt>
                <dd>
                  {agent.draft_changed
                    ? "Saved changes to publish"
                    : "Republish the saved configuration"}
                </dd>
              </dl>
            )}
            {intent?.kind === "publish" && (
              <div className="publication-changes">
                <h3>
                  {intent.firstPublication
                    ? "First publication"
                    : "Changes from published version"}
                </h3>
                {intent.changes.length ? (
                  intent.changes.map((change) => (
                    <div key={change.label}>
                      <strong>{change.label}</strong>
                      <p dir="auto">
                        <span className="muted">{change.before}</span> →{" "}
                        {change.after}
                      </p>
                    </div>
                  ))
                ) : (
                  <p>
                    No editable settings changed. This creates another immutable
                    version of the saved draft.
                  </p>
                )}
              </div>
            )}
            {uncertain && (
              <p className="notice">
                The outcome is unknown. Retry the same operation to resolve it
                before leaving this review.
              </p>
            )}
            <ErrorSummary error={error} />
            <div className="form-actions">
              <button
                className="button secondary"
                disabled={busy || uncertain}
                onClick={() => {
                  setIntent(null);
                  lock.current = false;
                  setError(undefined);
                }}
              >
                Back to editing
              </button>
              <button
                className="button"
                disabled={
                  busy || (intent?.kind === "publish" && publicationBlocked)
                }
                onClick={() => intent && void execute(intent)}
              >
                {busy
                  ? "Applying…"
                  : uncertain
                    ? "Retry same operation"
                    : intent?.kind === "publish"
                      ? "Confirm publish"
                      : intent?.kind === "rollback"
                        ? "Confirm restore"
                        : intent?.kind === "archive"
                          ? "Confirm archive"
                          : "Confirm change"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root open={blocker.state === "blocked"}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              blocker.reset?.();
            }}
          >
            <Dialog.Title>
              {intent ? "Operation in progress" : "Leave unsaved edits?"}
            </Dialog.Title>
            <Dialog.Description>
              {intent
                ? "Resolve the reviewed operation before leaving."
                : "Your unsaved changes will be discarded."}
            </Dialog.Description>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => blocker.reset?.()}
              >
                Stay
              </button>
              {!intent && (
                <button className="button" onClick={() => blocker.proceed?.()}>
                  Discard and leave
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
