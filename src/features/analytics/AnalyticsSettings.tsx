import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useSessionKey } from "../../app/auth";
import { DashboardError } from "../../api/dashboard";
import { ErrorSummary } from "../../components/ui/patterns";
import { useDashboardQuery } from "../clinic/ClinicPages";
import { ReadState } from "./charts";
import type { SettingsView } from "../../api/dashboard.generated";
export function AnalyticsSettings({ onClose }: { onClose: () => void }) {
  const query = useDashboardQuery("GET /dashboard/analytics/settings");
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content
          className="dialog-content analytics-dialog"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("capture-settings-trigger")?.focus();
          }}
        >
          <Dialog.Title>Transcript capture & retention</Dialog.Title>
          <Dialog.Description>
            Capture is off by default. Enable it only for new sessions with
            separate caller recording consent.
          </Dialog.Description>
          <ReadState query={query}>
            {query.data ? (
              <SettingsForm
                key={query.data.revision}
                value={query.data}
                onSaved={onClose}
              />
            ) : null}
          </ReadState>
          <Dialog.Close asChild>
            <button className="button secondary">Cancel</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
function SettingsForm({
  value,
  onSaved,
}: {
  value: SettingsView;
  onSaved: () => void;
}) {
  const auth = useAuth();
  const client = useQueryClient();
  const key = useSessionKey();
  const [error, setError] = useState<unknown>(null),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="analytics-settings"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const retention = Number(data.get("retention"));
        if (!Number.isInteger(retention) || retention < 1 || retention > 30)
          return;
        setBusy(true);
        setError(null);
        void auth
          .request("PUT /dashboard/analytics/settings", {
            body: {
              capture_enabled: data.get("enabled") === "on",
              retention_days: retention,
              revision: value.revision,
            },
          })
          .then(async () => {
            await client.cancelQueries({ queryKey: key });
            client.removeQueries({
              predicate: (q) =>
                q.queryKey.includes(
                  "GET /dashboard/calls/{session_id}/transcript",
                ),
            });
            await client.invalidateQueries({ queryKey: key });
            onSaved();
          })
          .catch(setError)
          .finally(() => setBusy(false));
      }}
    >
      <p>
        Current capture: <strong>{value.capture_enabled ? "ON" : "OFF"}</strong>
      </p>
      <label className="analytics-check">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={value.capture_enabled}
        />{" "}
        Enable capture for new sessions
      </label>
      <p>
        Earlier sessions are not recorded. Disabling stops capture immediately,
        including current sessions, and blocks transcript access while disabled.
      </p>
      <div className="form-field">
        <label htmlFor="capture-retention">Text retention (days)</label>
        <input
          id="capture-retention"
          name="retention"
          type="number"
          min={1}
          max={30}
          required
          defaultValue={value.retention_days}
        />
      </div>
      <p>
        Choose 1–30 days. Shortening retention applies immediately. Deleted,
        expired or uncaptured text cannot be restored by changing these
        settings.
      </p>
      <p>Redaction can leave sensitive information.</p>
      <ErrorSummary
        error={
          error instanceof DashboardError && error.status === 409
            ? "Settings changed. Reload current settings before saving."
            : error
        }
      />
      {error ? (
        <button
          type="button"
          className="button secondary"
          onClick={() => void client.invalidateQueries({ queryKey: key })}
        >
          Reload current settings
        </button>
      ) : null}
      <div className="form-actions">
        <button className="button" disabled={busy}>
          {busy ? "Saving…" : "Save capture settings"}
        </button>
      </div>
    </form>
  );
}
