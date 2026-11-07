import { StrictMode } from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { AuthProvider } from "../../app/auth";
import { routes } from "../../app/router";
import { knowledgeFixture, source } from "./fixtures.test-support";
let fixture: ReturnType<typeof knowledgeFixture>;
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  fixture = knowledgeFixture();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const body =
        typeof init.body === "string" ? JSON.parse(init.body) : init.body;
      const response = fixture.handle(
        url,
        init.method ?? "GET",
        body,
        new Headers(init.headers),
      );
      return Response.json(response.body, { status: response.status });
    }),
  );
});
async function setup(entry = "/login") {
  const router = createMemoryRouter(routes, { initialEntries: [entry] });
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <StrictMode>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </StrictMode>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email *"), "synthetic@example.test");
  await user.type(screen.getByLabelText("Password *"), "synthetic-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  if (entry.endsWith("/knowledge")) return { user, client, router };
  await screen.findByRole("heading", { name: "Set up your clinic" });
  await user.click(screen.getByRole("link", { name: "Agents" }));
  await user.click(await screen.findByRole("link", { name: "Reception" }));
  await screen.findByLabelText("Agent name");
  return { user, client, router };
}
async function knowledge(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Knowledge" }));
  await screen.findByRole("heading", { name: "Knowledge sources" });
  await screen.findByText(source.name);
}
it("preserves dirty General and Voice across knowledge routes and back, with one exit guard", async () => {
  const { user, router } = await setup();
  await user.clear(screen.getByLabelText("Agent name"));
  await user.type(screen.getByLabelText("Agent name"), "Retained draft");
  await user.click(screen.getByRole("button", { name: "Voice" }));
  await user.selectOptions(screen.getByLabelText("English voice"), "en-male");
  await knowledge(user);
  await user.click(screen.getByRole("button", { name: "Add source" }));
  await user.type(screen.getByLabelText("Source name"), "Draft-safe source");
  await user.type(
    screen.getByLabelText("Source text"),
    "Synthetic source text",
  );
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(router.state.location.pathname).toBe("/agents/agent-one/knowledge");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "General" }));
  expect(screen.getByLabelText("Agent name")).toHaveValue("Retained draft");
  await user.click(screen.getByRole("button", { name: "Voice" }));
  expect(screen.getByLabelText("English voice")).toHaveValue("en-male");
  await act(() => router.navigate(-1));
  expect(router.state.location.pathname).toBe("/agents/agent-one/knowledge");
  await user.click(screen.getByRole("link", { name: "All agents" }));
  expect(screen.getAllByRole("dialog")).toHaveLength(1);
  expect(screen.getByRole("dialog")).toHaveTextContent("Leave unsaved edits?");
});
it("separates old ready availability from failed updates and unavailable processing; previews escaped Urdu", async () => {
  const { user } = await setup();
  await knowledge(user);
  expect(screen.getByText("Previous version available")).toBeInTheDocument();
  expect(screen.getByText("Update failed")).toBeInTheDocument();
  expect(screen.getByText(/Processing unavailable/)).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Search knowledge" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Preview" }));
  const dialog = await screen.findByRole("dialog");
  expect(await within(dialog).findByText(/محفوظ مصنوعی رہنما/)).toHaveAttribute(
    "dir",
    "auto",
  );
  expect(dialog.querySelector("script")).toBeNull();
  expect(dialog).toHaveTextContent(source.name);
});
it("loads protected editable input, preserves edits on 409 and reloads revision explicitly", async () => {
  const { user } = await setup();
  await knowledge(user);
  await user.click(screen.getByRole("button", { name: "Edit" }));
  const text = await screen.findByLabelText("Source text");
  expect(text).toHaveValue(
    source.input.kind === "text" ? source.input.text : "",
  );
  expect(fixture.state.detailReads).toBeGreaterThan(0);
  await user.clear(text);
  await user.type(text, "Retained replacement");
  fixture.state.writeFailure = 409;
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await screen.findByText("Source changed. Reload its revision.");
  expect(text).toHaveValue("Retained replacement");
  fixture.state.sources[0]!.revision = 9;
  await user.click(
    screen.getByRole("button", { name: "Reload revision, keep my input" }),
  );
  await screen.findByText(/Reviewed revision 9/);
  fixture.state.writeFailure = 0;
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(fixture.state.writes[0]?.body).toMatchObject({ revision: 3 });
  expect(fixture.state.writes[1]?.body).toMatchObject({
    revision: 9,
    text: "Retained replacement",
  });
  expect(fixture.state.writes[0]?.key).not.toBe(fixture.state.writes[1]?.key);
});
it("creates paste, FAQ and public HTTPS sources; rejects blank and invalid URLs; maps field errors", async () => {
  const { user } = await setup();
  await knowledge(user);
  for (const kind of ["text", "faq", "url"]) {
    await user.click(screen.getByRole("button", { name: "Add source" }));
    await user.selectOptions(screen.getByLabelText("Source type"), kind);
    await user.type(screen.getByLabelText("Source name"), "  New guide  ");
    if (kind === "text")
      await user.type(screen.getByLabelText("Source text"), "Pasted text");
    if (kind === "faq") {
      await user.type(screen.getByLabelText("Question"), "Where?");
      await user.type(screen.getByLabelText("Answer"), "At reception.");
    }
    if (kind === "url") {
      await user.type(
        screen.getByLabelText("Public HTTPS URL"),
        "http://example.test",
      );
      await user.click(screen.getByRole("button", { name: "Save source" }));
      await screen.findByText(
        "Use a public HTTPS URL without credentials or a fragment.",
      );
      await user.clear(screen.getByLabelText("Public HTTPS URL"));
      await user.type(
        screen.getByLabelText("Public HTTPS URL"),
        "https://example.test/guide",
      );
      fixture.state.writeFailure = 422;
      await user.click(screen.getByRole("button", { name: "Save source" }));
      await screen.findByText("Check this source name.");
      fixture.state.writeFailure = 0;
    }
    await user.click(screen.getByRole("button", { name: "Save source" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  }
  expect(fixture.state.writes.map((w) => w.body)).toEqual(
    expect.arrayContaining([
      { kind: "text", name: "New guide", text: "Pasted text", format: "txt" },
      {
        kind: "faq",
        name: "New guide",
        question: "Where?",
        answer: "At reception.",
      },
      { kind: "url", name: "New guide", url: "https://example.test/guide" },
    ]),
  );
});
it("fences delete/reindex, retains unknown intent across back and native unload, clears on auth reset", async () => {
  const { user, router } = await setup();
  await knowledge(user);
  await user.click(screen.getByRole("button", { name: "Reindex" }));
  fixture.state.writeFailure = 503;
  await user.click(screen.getByRole("button", { name: "Confirm reindex" }));
  await screen.findByText(/outcome is unknown/i);
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  await act(() => router.navigate(-1));
  expect(
    await screen.findByText("Resolve this operation before leaving"),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Stay" }));
  fixture.state.writeFailure = 0;
  await user.click(
    screen.getByRole("button", { name: "Retry same operation" }),
  );
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(fixture.state.writes[0]).toEqual(fixture.state.writes[1]);
  expect(fixture.state.writes[0]?.body).toEqual({ revision: 3 });
  await user.click(screen.getByRole("button", { name: "Delete" }));
  await user.click(screen.getByRole("button", { name: "Confirm delete" }));
  await screen.findByText("No knowledge sources yet.");
  expect(fixture.state.writes[2]?.query).toBe("?revision=4");
});
it("retains visible sources on refresh error, retries and polls only queued/processing", async () => {
  const { user, client } = await setup();
  await knowledge(user);
  fixture.state.readFailure = 503;
  await act(() => client.invalidateQueries());
  await screen.findByText("Sources could not refresh");
  expect(screen.getByText(source.name)).toBeInTheDocument();
  fixture.state.readFailure = 0;
  fixture.state.sources[0]!.status = "processing";
  await user.click(screen.getByRole("button", { name: "Refresh sources" }));
  await screen.findByText("Processing");
  fixture.state.sources[0]!.status = "ready";
  await waitFor(
    () =>
      expect(screen.getByText("Ready", { exact: true })).toBeInTheDocument(),
    { timeout: 5000 },
  );
});
it("keeps exact search query identity across unknown response and shows bounded readable provenance", async () => {
  const { user } = await setup();
  await knowledge(user);
  await user.type(screen.getByLabelText("Knowledge question"), "  کب آئیں؟  ");
  await user.selectOptions(screen.getByLabelText("Question language"), "ur");
  fixture.state.searchFailure = true;
  await user.click(screen.getByRole("button", { name: "Search knowledge" }));
  await screen.findByText("Search unavailable");
  fixture.state.searchFailure = false;
  await user.click(screen.getByRole("button", { name: "Retry same search" }));
  await screen.findByText("اپنی ملاقات سے دس منٹ پہلے آئیں۔");
  expect(fixture.state.searches[0]).toEqual(fixture.state.searches[1]);
  expect(fixture.state.searches[0]).toMatchObject({
    query: "کب آئیں؟",
    language: "ur",
  });
});

it("renders server-returned knowledge decisions and escaped citations in the existing isolated test panel", async () => {
  const { user } = await setup();
  await user.click(screen.getByRole("button", { name: "Start isolated test" }));
  await screen.findByLabelText("Test message");
  await user.type(
    screen.getByLabelText("Test message"),
    "When should I arrive?",
  );
  await user.click(screen.getByRole("button", { name: "Send test message" }));
  const citations = await screen.findByRole("region", {
    name: "Knowledge used in this reply",
  });
  expect(citations).toHaveTextContent(source.name);
  expect(
    within(citations).getByText("اپنی ملاقات سے دس منٹ پہلے آئیں۔"),
  ).toHaveAttribute("dir", "auto");
});

it("opens the protected knowledge deep link after sign-in", async () => {
  const { router } = await setup("/agents/agent-one/knowledge");
  await screen.findByRole("heading", { name: "Knowledge sources" });
  expect(router.state.location.pathname).toBe("/agents/agent-one/knowledge");
});
it("keeps source content editable when processing is disabled and validates empty input and upload bounds", async () => {
  const { user } = await setup();
  await knowledge(user);
  await user.click(screen.getByRole("button", { name: "Add source" }));
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await screen.findByText("Enter a nonblank source name.");
  await user.type(screen.getByLabelText("Source name"), "Guide");
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await screen.findByText("Enter the source content before saving.");
  await user.selectOptions(screen.getByLabelText("Source type"), "file");
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await screen.findByText("Choose a nonempty file up to 10 MiB.");
  const tooLarge = new File([new Uint8Array(10485761)], "large.pdf", {
    type: "application/pdf",
  });
  await user.upload(screen.getByLabelText("Source file"), tooLarge);
  await user.click(screen.getByRole("button", { name: "Save source" }));
  expect(fixture.state.writes).toHaveLength(0);
  expect(
    screen.getByText("Choose a nonempty file up to 10 MiB."),
  ).toBeInTheDocument();
});
it("does not claim search availability from a ready source when query service is unavailable", async () => {
  fixture.state.sources[0]!.status = "ready";
  fixture.state.capabilities.query_available = false;
  fixture.state.capabilities.query_unavailable_reason = "service_unavailable";
  const { user } = await setup();
  await knowledge(user);
  expect(screen.getByText("Ready", { exact: true })).toBeInTheDocument();
  expect(
    screen.getByText("Knowledge search is unavailable. Try again later."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Search knowledge" }),
  ).toBeDisabled();
});

it("reopens saved source with fresh protected content and revision while later refetch preserves dirty input", async () => {
  const { user, client } = await setup();
  await knowledge(user);
  await user.click(screen.getByRole("button", { name: "Edit" }));
  await screen.findByLabelText("Source text");
  await user.clear(screen.getByLabelText("Source text"));
  await user.type(
    screen.getByLabelText("Source text"),
    "Saved replacement content",
  );
  await user.clear(screen.getByLabelText("Source name"));
  await user.type(
    screen.getByLabelText("Source name"),
    "Saved replacement name",
  );
  await user.click(screen.getByRole("button", { name: "Save source" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  const readsBeforeOpen = fixture.state.detailReads;
  await user.click(screen.getByRole("button", { name: "Edit" }));
  await waitFor(() =>
    expect(fixture.state.detailReads).toBeGreaterThan(readsBeforeOpen),
  );
  await waitFor(() =>
    expect(screen.getByLabelText("Source text")).toHaveValue(
      "Saved replacement content",
    ),
  );
  expect(screen.getByLabelText("Source name")).toHaveValue(
    "Saved replacement name",
  );
  expect(screen.getByText(/Reviewed revision 4/)).toBeInTheDocument();
  await user.clear(screen.getByLabelText("Source text"));
  await user.type(screen.getByLabelText("Source text"), "Genuine dirty input");
  fixture.state.sources[0] = {
    ...fixture.state.sources[0]!,
    revision: 8,
    name: "Remote replacement",
    input: { kind: "text", format: "txt", text: "Remote content" },
  };
  const readsBeforeRefresh = fixture.state.detailReads;
  await act(() =>
    client.invalidateQueries({
      predicate: (query) => query.queryKey.includes("knowledge-detail"),
    }),
  );
  expect(fixture.state.detailReads).toBeGreaterThan(readsBeforeRefresh);
  expect(screen.getByLabelText("Source text")).toHaveValue(
    "Genuine dirty input",
  );
  expect(screen.getByLabelText("Source name")).toHaveValue(
    "Saved replacement name",
  );
  expect(screen.getByText(/Reviewed revision 4/)).toBeInTheDocument();
});
it("shows Retry and Cancel for initial protected-detail errors, restores focus on Cancel and recovers on Retry", async () => {
  const { user } = await setup();
  await knowledge(user);
  fixture.state.detailFailure = 503;
  const edit = screen.getByRole("button", { name: "Edit" });
  await user.click(edit);
  await screen.findByText("Source detail unavailable");
  const dialog = screen.getByRole("dialog");
  expect(
    within(dialog).getByRole("button", { name: "Retry source detail" }),
  ).toBeVisible();
  await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(edit).toHaveFocus();
  await user.click(edit);
  await screen.findByText("Source detail unavailable");
  fixture.state.detailFailure = 0;
  await user.click(screen.getByRole("button", { name: "Retry source detail" }));
  expect(await screen.findByLabelText("Source text")).toHaveValue(
    source.input.kind === "text" ? source.input.text : "",
  );
  expect(
    screen.queryByText("Source detail unavailable"),
  ).not.toBeInTheDocument();
});
it("shows a failed-only library as unavailable without claiming work is ongoing", async () => {
  Object.assign(fixture.state.sources[0]!, {
    available: false,
    active_generation_id: null,
    chunk_count: 0,
  });
  fixture.state.capabilities.query_available = false;
  fixture.state.capabilities.query_unavailable_reason = "processing_pending";
  const { user } = await setup();
  await knowledge(user);
  expect(screen.getByText("Failed", { exact: true })).toBeInTheDocument();
  expect(
    screen.getByText(
      "No processed knowledge is available. Check source status.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByText(
      /Knowledge is still processing|Checking processing status/,
    ),
  ).not.toBeInTheDocument();
});
it("shows the source absolute update time with its timezone", async () => {
  const { user } = await setup();
  await knowledge(user);
  const time = screen.getByText("29 Oct 2026, 10:00 UTC");
  expect(time.tagName).toBe("TIME");
  expect(time).toHaveAttribute("datetime", "2026-10-29T10:00:00Z");
  expect(time.parentElement).toHaveTextContent("Updated");
});
