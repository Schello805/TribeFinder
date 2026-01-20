import { test, expect } from "@playwright/test";

function getBase(baseURL?: string) {
  return baseURL || process.env.E2E_BASE_URL || "http://localhost:3000";
}

test("public pages load", async ({ page, baseURL }) => {
  const base = getBase(baseURL);

  await page.goto(`${base}/`);
  await expect(page).toHaveURL(/\/$/);

  await page.goto(`${base}/groups`);
  await expect(page).toHaveURL(/\/groups/);

  await page.goto(`${base}/events`);
  await expect(page).toHaveURL(/\/events/);

  await page.goto(`${base}/map`);
  await expect(page).toHaveURL(/\/map/);
});

test("dashboard smoke (optional, needs E2E_EMAIL/E2E_PASSWORD)", async ({ page, baseURL }) => {
  const base = getBase(baseURL);
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    test.skip(true, "E2E credentials not provided");
  }

  await page.goto(`${base}/auth/signin`);
  await page.locator("#email").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Anmelden" }).click();

  await page.waitForURL(`${base}/dashboard`, { timeout: 30_000 });

  await page.goto(`${base}/dashboard/dance-styles`);
  await expect(page.getByRole("heading", { name: "Tanzstile" })).toBeVisible();

  await page.goto(`${base}/dashboard/notifications`);
  await expect(page.getByRole("heading", { name: "Benachrichtigungen" })).toBeVisible();

  await page.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByText("Gespeichert!")).toBeVisible();
});

test("groups + events CRUD smoke (optional, needs E2E_EMAIL/E2E_PASSWORD)", async ({ page, baseURL }) => {
  const base = getBase(baseURL);
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    test.skip(true, "E2E credentials not provided");
  }

  const uniq = `e2e-${Date.now()}`;

  // Login
  await page.goto(`${base}/auth/signin`);
  await page.locator("#email").fill(email!);
  await page.locator("#password").fill(password!);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(`${base}/dashboard`, { timeout: 30_000 });

  // Create group via UI wizard (frontend-visible)
  await page.goto(`${base}/groups/create`);
  await expect(page.getByRole("heading", { name: "Neue Gruppe erstellen" })).toBeVisible();

  await page.getByLabel(/Name der Gruppe/i).fill(`E2E Gruppe ${uniq}`);
  await page.getByLabel(/Beschreibung/i).fill(`Beschreibung für ${uniq} - mindestens zehn Zeichen.`);

  // basics -> details -> location -> finish
  await page.getByRole("button", { name: /Weiter/i }).click();
  await page.getByRole("button", { name: /Weiter/i }).click();
  await page.getByRole("button", { name: /Weiter/i }).click();

  await page.getByRole("button", { name: /Gruppe erstellen/i }).click();
  await page.waitForURL(/\/groups\//, { timeout: 30_000 });

  const groupUrl = page.url();
  const groupId = groupUrl.split("/groups/")[1]?.split("/")[0];
  expect(groupId, "groupId extracted from URL").toBeTruthy();

  // Verify group title visible
  await expect(page.getByText(`E2E Gruppe ${uniq}`)).toBeVisible();

  // Create event via API (stable) and verify in frontend
  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const iso = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const createEventRes = await page.request.post(`${base}/api/events`, {
    data: {
      title: `E2E Event ${uniq}`,
      description: `Event Beschreibung ${uniq}`,
      eventType: "EVENT",
      startDate: iso(startDate),
      endDate: iso(new Date(startDate.getTime() + 60 * 60 * 1000)),
      locationName: "E2E Location",
      address: "Berlin",
      lat: 52.52,
      lng: 13.405,
      flyer1: "",
      flyer2: "",
      website: "",
      ticketLink: "",
      ticketPrice: "",
      organizer: "",
      groupId,
      requiresRegistration: false,
    },
  });
  expect(createEventRes.ok(), `create event status ${createEventRes.status()}`).toBeTruthy();
  const createdEvent = await createEventRes.json();
  const eventId = createdEvent?.id as string | undefined;
  expect(eventId, "eventId from API").toBeTruthy();

  await page.goto(`${base}/groups/${groupId}/events`);
  await expect(page.getByText(`E2E Event ${uniq}`)).toBeVisible();

  // Update event via API and verify
  const updateEventRes = await page.request.put(`${base}/api/events/${eventId}`, {
    data: {
      title: `E2E Event ${uniq} (upd)`,
      description: `Event Beschreibung ${uniq} (upd)`,
      eventType: "EVENT",
      startDate: iso(startDate),
      endDate: iso(new Date(startDate.getTime() + 2 * 60 * 60 * 1000)),
      locationName: "E2E Location",
      address: "Berlin",
      lat: 52.52,
      lng: 13.405,
      flyer1: "",
      flyer2: "",
      website: "",
      ticketLink: "",
      ticketPrice: "",
      organizer: "",
      groupId,
      requiresRegistration: false,
    },
  });
  expect(updateEventRes.ok(), `update event status ${updateEventRes.status()}`).toBeTruthy();

  await page.goto(`${base}/groups/${groupId}/events`);
  await expect(page.getByText(`E2E Event ${uniq} (upd)`)).toBeVisible();

  // Delete event via API
  const deleteEventRes = await page.request.delete(`${base}/api/events/${eventId}`);
  expect(deleteEventRes.ok(), `delete event status ${deleteEventRes.status()}`).toBeTruthy();
  await page.goto(`${base}/groups/${groupId}/events`);
  await expect(page.getByText(`E2E Event ${uniq} (upd)`)).toHaveCount(0);

  // Update group via API and verify
  const updateGroupRes = await page.request.put(`${base}/api/groups/${groupId}`, {
    data: {
      name: `E2E Gruppe ${uniq} (upd)`,
      description: `Beschreibung für ${uniq} (upd) - mindestens zehn Zeichen.`,
      size: "SMALL",
      image: "",
      website: "",
      contactEmail: "",
      videoUrl: "",
      trainingTime: "",
      performances: false,
      foundingYear: null,
      seekingMembers: false,
      tags: [],
    },
  });
  expect(updateGroupRes.ok(), `update group status ${updateGroupRes.status()}`).toBeTruthy();
  await page.goto(`${base}/groups/${groupId}`);
  await expect(page.getByText(`E2E Gruppe ${uniq} (upd)`)).toBeVisible();

  // Delete group via API (cleanup)
  const deleteGroupRes = await page.request.delete(`${base}/api/groups/${groupId}`);
  expect(deleteGroupRes.ok(), `delete group status ${deleteGroupRes.status()}`).toBeTruthy();
});
