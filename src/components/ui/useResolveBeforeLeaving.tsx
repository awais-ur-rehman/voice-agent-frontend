import { useEffect, useRef } from "react";
import { useBlocker } from "react-router";
import * as Dialog from "@radix-ui/react-dialog";
import { useAuth } from "../../app/auth";

/** Keep an in-memory mutation intent mounted until its outcome is definite. */
export function useResolveBeforeLeaving(active: boolean) {
  const { registerCleanup } = useAuth();
  const locked = useRef(active);
  useEffect(() => {
    locked.current = active;
  }, [active]);
  useEffect(
    () =>
      registerCleanup(() => {
        locked.current = false;
      }),
    [registerCleanup],
  );
  const blocker = useBlocker(() => locked.current);
  useEffect(() => {
    if (!active && blocker.state === "blocked") blocker.reset();
  }, [active, blocker]);
  useEffect(() => {
    const listener = (event: BeforeUnloadEvent) => {
      if (!locked.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", listener);
    return () => window.removeEventListener("beforeunload", listener);
  }, []);
  return {
    release: () => {
      locked.current = false;
    },
    guard: (
      <Dialog.Root
        open={blocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="dialog-content"
            onPointerDownOutside={(event) => event.preventDefault()}
          >
            <Dialog.Title>Resolve this operation before leaving</Dialog.Title>
            <Dialog.Description>
              The request may already have completed. Stay here and retry the
              exact confirmation to resolve its outcome.
            </Dialog.Description>
            <button className="button" onClick={() => blocker.reset?.()}>
              Stay and resolve
            </button>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    ),
  };
}
