import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
const snapshot = {
  session_id: "24ad626c-5a6d-40cd-87d4-b946d61109e4",
  generation: 1,
  revision: 1,
  status: "active",
  call_deadline: "2026-10-28T23:00:00Z",
  media: {
    url: "ws://localhost:7880",
    room: "opaque",
    participant: "caller",
    token: "scoped",
    expires_at: "2026-10-28T23:00:00Z",
    session_id: "24ad626c-5a6d-40cd-87d4-b946d61109e4",
    generation: 1,
  },
};
const media = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  setMuted: vi.fn(),
  enableAudio: vi.fn(),
};
let sessionError = 0;
beforeEach(() => {
  sessionError = 0;
  vi.clearAllMocks();
  media.connect.mockResolvedValue(undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      if (input.endsWith("/auth/login"))
        return Response.json({
          access_token: "staff",
          refresh_token: "refresh",
          expires_in: 900,
        });
      if (input.endsWith("/voice/agents"))
        return Response.json({
          agents: [
            {
              id: "agent-1",
              name: "Reception · English / Urdu",
              language_mode: "bilingual",
            },
          ],
        });
      if (input.endsWith("/end"))
        return Response.json({ ...snapshot, status: "ended", media: null });
      if (sessionError)
        return Response.json(
          {
            detail:
              sessionError === 429
                ? "Voice capacity is busy."
                : "Speech models unavailable.",
          },
          { status: sessionError },
        );
      return Response.json(snapshot);
    }),
  );
});
function setup() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <App createMedia={() => media} />
    </QueryClientProvider>,
  );
}
async function login() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "staff@example.test");
  await user.type(screen.getByLabelText("Password"), "password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await screen.findByRole("button", { name: "Start voice session" });
  return user;
}
it("keeps staff signed out when credentials are rejected", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ detail: "Invalid credentials" }, { status: 401 }),
    ),
  );
  setup();
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "bad@example.test");
  await user.type(screen.getByLabelText("Password"), "bad");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Sign-in expired or credentials rejected",
  );
  expect(
    screen.queryByRole("button", { name: "Start voice session" }),
  ).not.toBeInTheDocument();
});
it.each([429, 503])(
  "shows truthful busy or model failure (%s)",
  async (code) => {
    setup();
    const user = await login();
    sessionError = code;
    await user.click(
      screen.getByRole("button", { name: "Start voice session" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      code === 429 ? "busy" : "unavailable",
    );
    expect(screen.queryByText("Listening")).not.toBeInTheDocument();
  },
);
it("cleans media after microphone denial and permits a fresh start", async () => {
  media.connect.mockRejectedValue(
    new DOMException("Denied", "NotAllowedError"),
  );
  setup();
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Microphone access",
  );
  await waitFor(() => expect(media.disconnect).toHaveBeenCalled());
  expect(
    screen.getByRole("button", { name: "Start voice session" }),
  ).toBeEnabled();
});
it("ends and cleans the media session and clears captions", async () => {
  setup();
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  await user.click(await screen.findByRole("button", { name: "End session" }));
  await waitFor(() =>
    expect(screen.getByText("Session ended")).toBeInTheDocument(),
  );
  expect(media.disconnect).toHaveBeenCalled();
});
it("offers explicit speaker permission retry without claiming delivered speech", async () => {
  let events: import("../features/voice/media").MediaEvents | undefined;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <App
        createMedia={(e) => {
          events = e;
          return media;
        }}
      />
    </QueryClientProvider>,
  );
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  await waitFor(() =>
    expect(screen.getByText("Media connected")).toBeInTheDocument(),
  );
  const { act } = await import("@testing-library/react");
  act(() => events?.audioBlocked());
  expect(
    screen.getByRole("button", { name: "Enable audio" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Enable audio" }));
  await waitFor(() =>
    expect(
      screen.queryByText("Browser sound is blocked."),
    ).not.toBeInTheDocument(),
  );
});
it("reconnects a disconnected session and discards its old captions", async () => {
  let events: import("../features/voice/media").MediaEvents | undefined;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <App
        createMedia={(e) => {
          events = e;
          return media;
        }}
      />
    </QueryClientProvider>,
  );
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  await waitFor(() =>
    expect(screen.getByText("Media connected")).toBeInTheDocument(),
  );
  await user.click(
    screen.getByRole("checkbox", { name: "Show live captions" }),
  );
  const { act } = await import("@testing-library/react");
  act(() => {
    events?.caption("آپ کی ملاقات", "ur");
    events?.state("disconnected");
  });
  expect(screen.getByText("آپ کی ملاقات")).toHaveAttribute("dir", "auto");
  await user.click(screen.getByRole("button", { name: "Reconnect" }));
  await waitFor(() =>
    expect(screen.getByText("Media connected")).toBeInTheDocument(),
  );
  expect(screen.queryByText("آپ کی ملاقات")).not.toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith(
    expect.stringContaining("/resume"),
    expect.objectContaining({ method: "POST" }),
  );
});
it("ends an allocated session when its create response arrives after unmount", async () => {
  let finish: (value: Response) => void = () => {};
  const original = fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init?: RequestInit) =>
      input.endsWith("/voice/sessions")
        ? new Promise<Response>((resolve) => {
            finish = resolve;
          })
        : original(input, init),
    ),
  );
  const view = setup();
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  view.unmount();
  finish(Response.json(snapshot));
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/end"),
      expect.objectContaining({ method: "POST" }),
    ),
  );
});
it("explains the bounded Urdu capability failure without echoing server content", async () => {
  setup();
  const user = await login();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({ detail: "voice_urdu_unavailable" }, { status: 503 }),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Urdu synthesis is unavailable on this CPU profile",
  );
});
it("returns to sign-in after an expired staff credential during session end", async () => {
  setup();
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  await screen.findByRole("button", { name: "End session" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ detail: "expired" }, { status: 401 })),
  );
  await user.click(screen.getByRole("button", { name: "End session" }));
  expect(await screen.findByLabelText("Password")).toBeInTheDocument();
  expect(screen.getByRole("alert")).toHaveTextContent("Sign-in expired");
});
it("rejects a mismatched media grant instead of joining a stale room", async () => {
  setup();
  const user = await login();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) =>
      Response.json(
        input.endsWith("/end")
          ? { ...snapshot, status: "ended", media: null }
          : { ...snapshot, media: { ...snapshot.media, generation: 2 } },
      ),
    ),
  );
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("media grant");
  expect(media.connect).not.toHaveBeenCalled();
});

it("clears the previous account session before another staff member signs in", async () => {
  setup();
  const user = await login();
  await user.click(screen.getByRole("button", { name: "Start voice session" }));
  await screen.findByRole("button", { name: "End session" });
  const successfulFetch = globalThis.fetch;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ detail: "expired" }, { status: 401 })),
  );
  await user.click(screen.getByRole("button", { name: "End session" }));
  await screen.findByLabelText("Password");
  vi.stubGlobal("fetch", successfulFetch);
  await user.type(screen.getByLabelText("Email"), "other-staff@example.test");
  await user.type(screen.getByLabelText("Password"), "password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  const start = await screen.findByRole("button", {
    name: "Start voice session",
  });
  expect(start).toBeEnabled();
  expect(
    screen.queryByRole("button", { name: "End session" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Reconnect" }),
  ).not.toBeInTheDocument();
});
