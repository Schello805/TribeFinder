import { test, expect, type Page } from "@playwright/test";

function getBase(baseURL?: string) {
  return baseURL || process.env.E2E_BASE_URL || "http://localhost:3000";
}

async function login(page: Page, base: string, email: string, password: string) {
  await page.goto(`${base}/auth/signin`);
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Anmelden" }).click();
  await page.waitForURL(`${base}/dashboard`, { timeout: 30_000 });
}

async function createGroupViaWizard(page: Page, base: string, uniq: string) {
  await page.goto(`${base}/groups/create`);
  await expect(page.getByRole("heading", { name: "Neue Gruppe erstellen" })).toBeVisible();

  await page.getByLabel(/Name der Gruppe/i).fill(`E2E Inbox Gruppe ${uniq}`);
  await page.getByLabel(/Beschreibung/i).fill(`Beschreibung für ${uniq} - mindestens zehn Zeichen.`);

  await page.getByRole("button", { name: /Weiter/i }).click();
  await page.getByRole("button", { name: /Weiter/i }).click();
  await page.getByRole("button", { name: /Weiter/i }).click();

  await page.getByRole("button", { name: /Gruppe erstellen/i }).click();
  await page.waitForURL(/\/groups\//, { timeout: 30_000 });

  const groupUrl = page.url();
  const groupId = groupUrl.split("/groups/")[1]?.split("/")[0];
  expect(groupId, "groupId extracted from URL").toBeTruthy();
  return groupId as string;
}

function deleteButtonForMessage(page: Page, text: string) {
  const msg = page.getByText(text, { exact: true });
  const container = msg.locator('xpath=ancestor::div[contains(@class,"text-right")][1]');
  return container.getByRole("button", { name: "Löschen" });
}

function editButtonForMessage(page: Page, text: string) {
  const msg = page.getByText(text, { exact: true });
  const container = msg.locator('xpath=ancestor::div[contains(@class,"text-right")][1]');
  return container.getByRole("button", { name: "Bearbeiten" });
}

test("messages: edit/delete allowed until read by other user", async ({ browser, baseURL }) => {
  const base = getBase(baseURL);

  const email1 = process.env.E2E_EMAIL_1;
  const password1 = process.env.E2E_PASSWORD_1;
  const email2 = process.env.E2E_EMAIL_2;
  const password2 = process.env.E2E_PASSWORD_2;

  if (!email1 || !password1 || !email2 || !password2) {
    test.skip(true, "Missing E2E env vars: E2E_EMAIL_1/E2E_PASSWORD_1/E2E_EMAIL_2/E2E_PASSWORD_2");
  }

  const ctx1 = await browser.newContext();
  const ctx2 = await browser.newContext();

  const page1 = await ctx1.newPage();
  const page2 = await ctx2.newPage();

  const uniq = `e2e-msg-${Date.now()}`;

  // Login both users
  await login(page1, base, email1!, password1!);
  await login(page2, base, email2!, password2!);

  const groupId = await createGroupViaWizard(page2, base, uniq);

  // --- Case A: delete works within 5s if unread ---
  await page1.goto(`${base}/messages/new?groupId=${groupId}`);
  await expect(page1.getByRole("heading", { name: "Nachricht an Gruppe" })).toBeVisible();

  const msgA = `Hello A ${uniq}`;
  await page1.locator('textarea').fill(msgA);
  await page1.getByRole("button", { name: "Senden" }).click();

  await page1.waitForURL(/\/messages\/threads\//, { timeout: 30_000 });

  await expect(page1.getByText(msgA, { exact: true })).toBeVisible();
  const deleteBtnA = deleteButtonForMessage(page1, msgA);
  await expect(deleteBtnA).toBeVisible();

  await deleteBtnA.click();
  await expect(page1.getByText(msgA)).toHaveCount(0);

  // --- Case B: edit/delete remain available if still unread (even after some time) ---
  await page1.goto(`${base}/messages/new?groupId=${groupId}`);
  const msgB = `Hello B ${uniq}`;
  await page1.locator('textarea').fill(msgB);
  await page1.getByRole("button", { name: "Senden" }).click();

  await expect(page1.getByText(msgB, { exact: true })).toBeVisible();
  const deleteBtnB = deleteButtonForMessage(page1, msgB);
  const editBtnB = editButtonForMessage(page1, msgB);
  await expect(deleteBtnB).toBeVisible();
  await expect(editBtnB).toBeVisible();
  await page1.waitForTimeout(6_000);
  await expect(deleteBtnB).toBeVisible();
  await expect(editBtnB).toBeVisible();

  // Edit the message and verify updated content
  const msgB2 = `Hello B edited ${uniq}`;
  await editBtnB.click();
  await page1.locator("textarea").first().fill(msgB2);
  await page1.getByRole("button", { name: "Speichern" }).click();
  await expect(page1.getByText(msgB2, { exact: true })).toBeVisible();

  // --- Case C: delete button disappears after being read by other user ---
  await page1.goto(`${base}/messages/new?groupId=${groupId}`);
  const msgC = `Hello C ${uniq}`;
  await page1.locator('textarea').fill(msgC);
  await page1.getByRole("button", { name: "Senden" }).click();
  await page1.waitForURL(/\/messages\/threads\//, { timeout: 30_000 });

  const threadUrl = page1.url();
  const threadId = threadUrl.split("/messages/threads/")[1]?.split("/")[0];
  expect(threadId, "threadId extracted from URL").toBeTruthy();

  // Open thread as user2 to mark as read
  await page2.goto(`${base}/messages/threads/${threadId}`);
  await expect(page2.getByText(msgC, { exact: true })).toBeVisible();

  // Back to user1, refresh thread and ensure delete no longer available
  await page1.goto(`${base}/messages/threads/${threadId}`);
  await expect(page1.getByText(msgC, { exact: true })).toBeVisible();
  await expect(deleteButtonForMessage(page1, msgC)).toHaveCount(0);
  await expect(editButtonForMessage(page1, msgC)).toHaveCount(0);

  await ctx1.close();
  await ctx2.close();
});
