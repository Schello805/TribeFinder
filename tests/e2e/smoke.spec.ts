import { test, expect } from "@playwright/test";

function getBase(baseURL?: string) {
  return baseURL || process.env.E2E_BASE_URL || "http://localhost:3000";
}

test("public pages load", async ({ page, baseURL }) => {
  const base = getBase(baseURL);

  await page.goto(`${base}/`);
  await expect(page).toHaveURL(/\/$/);

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.goto(`${base}/groups`);
  await expect(page).toHaveURL(/\/groups/);

  await expect(page.getByRole("heading", { name: "Tanzgruppen finden" })).toBeVisible();

  await page.goto(`${base}/events`);
  await expect(page).toHaveURL(/\/events/);

  await expect(page.getByRole("heading", { name: /Event Kalender/i })).toBeVisible();

  await page.goto(`${base}/hilfe`);
  await expect(page).toHaveURL(/\/hilfe/);
  await expect(page.getByRole("heading", { name: "Hilfe" })).toBeVisible();

  await page.goto(`${base}/changelog`);
  await expect(page).toHaveURL(/\/changelog/);
  await expect(page.getByRole("heading", { name: "Changelog" })).toBeVisible();

  await page.goto(`${base}/marketplace`);
  await expect(page).toHaveURL(/\/marketplace/);
  await expect(page.getByRole("heading", { name: "Second-Hand" })).toBeVisible();

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

  // Create event via UI and verify in frontend
  const startDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const isoLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  await page.goto(`${base}/groups/${groupId}/events`);
  await page.getByRole("link", { name: "Neues Event" }).click();
  await expect(page.getByText("Neues Event erstellen")).toBeVisible();

  await page.locator('input[name="title"]').fill(`E2E Event ${uniq}`);
  await page.locator('input[name="startDate"]').fill(isoLocal(startDate));
  await page.locator('textarea[name="description"]').fill(`Event Beschreibung ${uniq}`);
  await page.locator('input[name="address"]').fill("Berlin");
  await page.getByRole("button", { name: "Event erstellen" }).click();

  await page.waitForURL(new RegExp(`/groups/${groupId}/events`), { timeout: 30_000 });
  await expect(page.getByText(`E2E Event ${uniq}`)).toBeVisible();

  // Edit event via UI
  const eventRow = page.locator('li', { hasText: `E2E Event ${uniq}` });
  await eventRow.getByRole('link', { name: 'Bearbeiten' }).click();
  await expect(page.getByText("Event bearbeiten")).toBeVisible();
  await page.locator('input[name="title"]').fill(`E2E Event ${uniq} (upd)`);
  await page.getByRole('button', { name: 'Aktualisieren' }).click();
  await page.waitForURL(new RegExp(`/groups/${groupId}/events`), { timeout: 30_000 });
  await expect(page.getByText(`E2E Event ${uniq} (upd)`)).toBeVisible();

  // Delete event via UI
  page.once('dialog', (d) => d.accept());
  const eventRowUpd = page.locator('li', { hasText: `E2E Event ${uniq} (upd)` });
  await eventRowUpd.getByRole('button', { name: 'Löschen' }).click();
  await expect(page.getByText(`E2E Event ${uniq} (upd)`)).toHaveCount(0);

  // Update group via UI and verify
  await page.goto(`${base}/groups/${groupId}/edit`);
  await expect(page.getByRole('heading', { name: 'Gruppe bearbeiten' })).toBeVisible();
  await page.locator('input[name="name"]').fill(`E2E Gruppe ${uniq} (upd)`);
  await page.locator('textarea[name="description"]').fill(`Beschreibung für ${uniq} (upd) - mindestens zehn Zeichen.`);
  await page.getByRole('button', { name: 'Aktualisieren' }).click();
  await page.waitForURL(new RegExp(`/groups/${groupId}$`), { timeout: 30_000 });
  await expect(page.getByText(`E2E Gruppe ${uniq} (upd)`)).toBeVisible();

  // Delete group via API (cleanup)
  const deleteGroupRes = await page.request.delete(`${base}/api/groups/${groupId}`);
  expect(deleteGroupRes.ok(), `delete group status ${deleteGroupRes.status()}`).toBeTruthy();
});
