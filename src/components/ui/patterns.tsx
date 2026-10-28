import { useEffect, useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions}
    </header>
  );
}
export function ErrorSummary({ error }: { error: unknown }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (error) ref.current?.focus();
  }, [error]);
  return error ? (
    <div ref={ref} tabIndex={-1} role="alert" className="error-summary">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null;
}
export function StatusBadge({ children }: { children: ReactNode }) {
  return <span className="status-badge">{children}</span>;
}
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="empty-state">{children}</p>;
}
export function ConfirmDialog({
  title,
  children,
  confirm,
  onConfirm,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  confirm: string;
  onConfirm: () => Promise<void>;
  busy?: boolean;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button type="button" className="button secondary">
          {confirm}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description asChild>
            <div>{children}</div>
          </Dialog.Description>
          <div className="form-actions">
            <Dialog.Close asChild>
              <button className="button secondary" disabled={busy}>
                Cancel
              </button>
            </Dialog.Close>
            <button
              className="button"
              disabled={busy}
              onClick={() => void onConfirm()}
            >
              {busy ? "Saving…" : confirm}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
