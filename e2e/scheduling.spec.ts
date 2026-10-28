import { test, expect } from "@playwright/test";
import type {
  CalendarAppointment,
  PatientDetail,
  Slot,
} from "../src/api/dashboard.generated";
const id = "11111111-1111-4111-8111-111111111111",
  other = "22222222-2222-4222-8222-222222222222";
const patient: PatientDetail = {
  id,
  name: "Synthetic patient with a longer English name",
  name_ur:
    "مصنوعی مریض عبدالرحمن محمد احمد ایک لمبا نام جو مکمل طور پر پڑھا جا سکتا ہے",
  phone: "+923001234567",
  dob: null,
  revision: 1,
  merged_into_id: null,
};
const destination: PatientDetail = {
  ...patient,
  id: other,
  name: "Synthetic retained patient",
  name_ur: null,
  revision: 2,
};
const slot: Slot = {
  provider_id: id,
  service_id: id,
  starts_at: "2026-11-05T14:30:00Z",
  ends_at: "2026-11-05T15:00:00Z",
};
const base: CalendarAppointment = {
  id,
  patient_id: id,
  provider_id: id,
  service_id: id,
  starts_at: "2026-11-05T14:00:00Z",
  ends_at: "2026-11-05T15:00:00Z",
  created_at: "2026-10-01T00:00:00Z",
  status: "booked",
  rescheduled_from_id: null,
  patient_name: "Synthetic morning patient",
  patient_name_ur: null,
  provider_name: "Synthetic provider",
  provider_name_ur: null,
  service_name: "Consultation",
  service_name_ur: null,
};
const appointments: CalendarAppointment[] = [
  base,
  {
    ...base,
    id: "55555555-5555-4555-8555-555555555555",
    starts_at: "2026-11-05T15:15:00Z",
    ends_at: "2026-11-05T15:45:00Z",
    patient_name: "Synthetic short appointment",
    patient_name_ur: "مختصر مصنوعی مریض عبدالرحمن",
  },
  {
    ...base,
    id: other,
    starts_at: "2026-11-05T16:00:00Z",
    ends_at: "2026-11-05T17:00:00Z",
    patient_name: "Synthetic bilingual patient",
    patient_name_ur: patient.name_ur ?? null,
  },
  {
    ...base,
    id: "33333333-3333-4333-8333-333333333333",
    starts_at: "2026-11-06T04:15:00Z",
    ends_at: "2026-11-06T04:45:00Z",
    patient_name: "Synthetic evening patient",
  },
  {
    ...base,
    id: "44444444-4444-4444-8444-444444444444",
    starts_at: "2026-11-06T15:00:00Z",
    ends_at: "2026-11-06T16:00:00Z",
    patient_name: "Synthetic Friday patient",
  },
];
const evidence = "../backend/.superpowers/sdd/2026-10-28-phase-4-dashboard/";
test.use({ timezoneId: "Asia/Tokyo" });
test("compact real day/week calendar, night reachability, focused booking/details and protected cancellation", async ({
  page,
}) => {
  const writes: { path: string; body: unknown; key: string | undefined }[] = [];
  let cancellations = 0;
  await page.route("http://localhost:8000/**", async (route) => {
    const request = route.request(),
      u = new URL(request.url()),
      p = u.pathname;
    let body: unknown = {},
      status = 200;
    if (request.method() !== "GET")
      writes.push({
        path: p,
        body: request.postDataJSON(),
        key: request.headers()["idempotency-key"],
      });
    if (p === "/auth/login")
      body = {
        access_token: "fixture-access",
        refresh_token: "fixture-refresh",
        expires_in: 300,
      };
    if (p === "/auth/me")
      body = {
        id,
        tenant_id: id,
        email: "fixture@example.test",
        role: "owner",
      };
    if (p === "/dashboard/clinic")
      body = {
        id,
        name: "Synthetic clinic · مصنوعی کلینک",
        timezone: "America/New_York",
        revision: 1,
        currency: "PKR",
        min_notice_min: 0,
        horizon_days: 30,
        cancellation_min: 0,
        daily_limit: 5,
        address_en: "",
        address_ur: "",
        preparation_en: "",
        preparation_ur: "",
      };
    if (p === "/dashboard/setup")
      body = {
        profile: true,
        providers: true,
        services: true,
        hours: true,
        agent: true,
      };
    if (p === "/providers")
      body = [
        {
          id,
          name: "Synthetic provider",
          name_ur: "مصنوعی ڈاکٹر",
          active: true,
        },
      ];
    if (p === "/services")
      body = [{ id, name: "Consultation", duration_min: 30, active: true }];
    if (p === "/dashboard/appointments") {
      const format = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/New_York",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      const items = appointments.filter((a) => {
        const d = format.format(new Date(a.starts_at));
        return (
          d >= (u.searchParams.get("date_from") ?? "") &&
          d <= (u.searchParams.get("date_to") ?? "")
        );
      });
      body = { items, total: items.length, offset: 0, limit: 100 };
    }
    if (p === "/dashboard/patients")
      body = { items: [patient, destination], total: 2, offset: 0, limit: 25 };
    if (p === `/dashboard/patients/${id}`) body = patient;
    if (p === `/dashboard/patients/${other}` || p.endsWith("/merge"))
      body = destination;
    if (p.startsWith("/patients/") && p.endsWith("/appointments"))
      body = [base];
    if (p === "/slots") body = [slot];
    if (p === "/appointments") body = base;
    if (p.endsWith("/cancel")) {
      cancellations++;
      status = cancellations === 1 ? 408 : 200;
      body =
        status === 408
          ? {
              error: {
                code: "timeout",
                message:
                  "Cancellation outcome unknown. Retry the same request.",
              },
            }
          : { ...base, status: "cancelled" };
    }
    await route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await page.getByLabel("Email *").fill("fixture@example.test");
  await page.getByLabel("Password *").fill("synthetic-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(
    page.getByRole("heading", { name: "Schedule", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Clinic date").fill("2026-11-05");
  await page.getByRole("button", { name: "Day", exact: true }).click();
  async function settle() {
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    });
  }
  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.getByRole("button", { name: "Day", exact: true }).click();
    await settle();
    const morning = page.getByRole("button", {
      name: /Synthetic morning patient/,
    });
    await expect(morning).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `${evidence}task-5-fix-day-${width}.png` });
    await morning.click();
    const details = page.getByRole("dialog", { name: "Appointment details" });
    await expect(details).toBeVisible();
    await expect(details).toContainText("Synthetic morning patient");
    await expect(details).toContainText("09:00");
    await page.screenshot({
      path: `${evidence}task-5-fix-details-${width}.png`,
    });
    await details
      .getByRole("button", { name: "Reschedule", exact: true })
      .click();
    const reschedule = page.getByRole("dialog", {
      name: "Reschedule appointment",
    });
    await expect(reschedule).toBeVisible();
    await reschedule.getByRole("radio").check();
    await reschedule
      .getByRole("button", { name: "Review appointment", exact: true })
      .click();
    await expect(
      reschedule.getByRole("region", { name: "Review appointment" }),
    ).toContainText("10:30");
    await page.screenshot({
      path: `${evidence}task-5-fix-reschedule-${width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(reschedule).toHaveCount(0);
    await expect(morning).toBeFocused();
    await page
      .getByRole("button", { name: "New appointment", exact: true })
      .click();
    const booking = page.getByRole("dialog", { name: "New appointment" });
    await expect(booking).toBeVisible();
    await booking
      .getByRole("region", { name: "Patient selection" })
      .getByRole("button", { name: /Synthetic patient with/ })
      .click();
    await booking.getByLabel("Provider", { exact: true }).selectOption(id);
    await booking.getByLabel("Service", { exact: true }).selectOption(id);
    await booking.getByRole("radio").check();
    await booking
      .getByRole("button", { name: "Review appointment", exact: true })
      .click();
    await page.screenshot({
      path: `${evidence}task-5-fix-booking-${width}.png`,
    });
    await page.keyboard.press("Escape");
    await expect(booking).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "New appointment", exact: true }),
    ).toBeFocused();
    if (width !== 390) {
      await page.getByRole("button", { name: "Week", exact: true }).click();
      await expect(
        page.getByRole("button", { name: /Synthetic Friday patient/ }),
      ).toBeVisible();
      await settle();
      await page.screenshot({
        path: `${evidence}task-5-fix-week-${width}.png`,
      });
      await page
        .locator(".calendar-event-content")
        .filter({ hasText: patient.name_ur! })
        .click();
      const fullPatient = page.getByRole("dialog", {
        name: "Appointment details",
      });
      await expect(fullPatient).toContainText(patient.name_ur!);
      await expect(fullPatient).toContainText("Synthetic bilingual patient");
      await page.screenshot({
        path: `${evidence}task-5-fix-urdu-details-${width}.png`,
      });
      await page.keyboard.press("Escape");
    }
  }
  // The mobile list includes late bookings on their clinic-local date.
  await expect(
    page.getByRole("button", { name: /Synthetic evening patient/ }),
  ).toContainText("23:15");
  await expect(
    page.getByRole("button", { name: /Synthetic bilingual patient/ }),
  ).toContainText(patient.name_ur!);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole("button", { name: "Day", exact: true }).click();
  await settle();
  // Reach the end of the full 00–24 grid through its own scroll region.
  await page.locator(".clinic-calendar").evaluate((root) => {
    for (const node of root.querySelectorAll<HTMLElement>("*"))
      if (
        node.scrollHeight > node.clientHeight + 20 &&
        ["auto", "scroll"].includes(getComputedStyle(node).overflowY)
      )
        node.scrollTop = node.scrollHeight;
  });
  await expect(
    page.getByRole("button", { name: /Synthetic evening patient/ }),
  ).toBeVisible();
  await page.screenshot({ path: `${evidence}task-5-fix-night-1440.png` });
  await page.getByRole("button", { name: "List", exact: true }).click();
  await page.getByRole("button", { name: /Synthetic morning patient/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  const cancel = page.getByRole("dialog", { name: "Cancel this appointment?" });
  await cancel
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  await expect(cancel).toContainText(
    "Cancellation outcome unknown. Retry the same request.",
  );
  await page.keyboard.press("Escape");
  await expect(cancel).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(cancel).toBeVisible();
  await expect(
    cancel.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: `${evidence}task-5-fix-cancel-uncertain.png`,
  });
  await cancel
    .getByRole("button", { name: "Confirm cancellation", exact: true })
    .click();
  await expect(cancel).toHaveCount(0);
  const retries = writes.filter((w) => w.path.endsWith("/cancel"));
  expect(retries).toHaveLength(2);
  expect(retries[0]).toEqual(retries[1]);
  await page.setViewportSize({ width: 390, height: 1000 });
  await page
    .getByRole("button", { name: "New appointment", exact: true })
    .click();
  const booking = page.getByRole("dialog", { name: "New appointment" });
  await booking
    .getByRole("region", { name: "Patient selection" })
    .getByRole("button", { name: /Synthetic patient with/ })
    .click();
  await booking.getByLabel("Provider", { exact: true }).selectOption(id);
  await booking.getByLabel("Service", { exact: true }).selectOption(id);
  await booking.getByRole("radio").check();
  await booking
    .getByRole("button", { name: "Review appointment", exact: true })
    .click();
  expect(writes.filter((w) => w.path === "/appointments")).toHaveLength(0);
  await booking.getByRole("button", { name: "Confirm appointment" }).click();
  await expect(booking).toHaveCount(0);
  expect(writes.find((w) => w.path === "/appointments")?.body).toMatchObject({
    confirmed: true,
    starts_at: slot.starts_at,
  });
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Schedule", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Toggle navigation" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page.getByRole("link", { name: "Patients", exact: true }).click();
  await page.getByLabel("Search patients by name or phone").fill("عبدالرحمن");
  await page.getByRole("button", { name: /Synthetic patient with/ }).click();
  await page
    .getByRole("button", { name: "Merge patient", exact: true })
    .click();
  const merge = page.getByRole("dialog");
  await merge
    .getByRole("button", { name: /Synthetic retained patient/ })
    .click();
  for (const label of [
    "Retain name",
    "Retain phone",
    "Retain Urdu name",
    "Retain date of birth",
  ])
    await merge.getByLabel(label).selectOption("destination");
  await merge.getByRole("button", { name: "Review merge" }).click();
  await page.keyboard.press("Escape");
  await expect(merge).toHaveCount(0);
  expect(writes.filter((w) => w.path.endsWith("/merge"))).toHaveLength(0);
  expect(
    await page.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
    })),
  ).toEqual({ local: 0, session: 0 });
  expect(page.url()).not.toContain("عبدالرحمن");
});
