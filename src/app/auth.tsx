import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Session } from "../api/session";
const AuthContext = createContext<Session | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [session] = useState(
    () =>
      new Session(() => {
        void client.cancelQueries();
        client.clear();
      }),
  );
  return (
    <AuthContext.Provider value={session}>{children}</AuthContext.Provider>
  );
}
export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) throw Error("AuthProvider is required");
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  return {
    ...state,
    request: session.request,
    login: session.login,
    register: session.register,
    logout: session.logout,
    registerCleanup: session.registerCleanup,
    isManager: state.me?.role === "owner" || state.me?.role === "admin",
  };
}
export function useSessionKey(...parts: readonly unknown[]) {
  const { sessionId, me } = useAuth();
  return ["session", sessionId, me?.tenant_id, ...parts] as const;
}
