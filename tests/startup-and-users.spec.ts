import { test, expect } from "@playwright/test";

test("startup retries gateway failures without showing an immediate error", async ({ page }) => {
  let requests = 0;
  await page.route("**/api/auth/me", async (route) => {
    requests++;
    await route.fulfill({
      status: requests <= 2 ? 503 : 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: requests <= 2 ? "Starting" : "Please sign in." }),
    });
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible({
    timeout: 15000,
  });
  expect(requests).toBeGreaterThan(2);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("Super Admin creates an account and its temporary password must be replaced", async ({
  browser,
}) => {
  const adminContext = await browser.newContext(),
    newContext = await browser.newContext();
  const admin = await adminContext.newPage(),
    newUser = await newContext.newPage();
  await admin.goto("/");
  await admin.getByLabel("Email", { exact: true }).fill("super@example.com");
  await admin.getByLabel("Password", { exact: true }).fill("E2e-password-2026");
  await admin.getByRole("button", { name: "Sign In", exact: true }).click();
  await admin.getByRole("navigation").getByRole("button", { name: "Users", exact: true }).click();
  await admin.getByRole("button", { name: "Create user", exact: true }).click();
  const dialog = admin.getByRole("dialog");
  await dialog.getByLabel("Full name", { exact: true }).fill("UI Viewer");
  await dialog.getByLabel("Email", { exact: true }).fill("ui-viewer@example.com");
  await dialog.getByLabel("Temporary password · at least 12 characters").fill("UI-temporary-2026");
  await dialog.getByRole("button", { name: "Create user", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(admin.getByRole("row").filter({ hasText: "ui-viewer@example.com" })).toBeVisible();
  await newUser.goto("/");
  await newUser.getByLabel("Email", { exact: true }).fill("ui-viewer@example.com");
  await newUser.getByLabel("Password", { exact: true }).fill("UI-temporary-2026");
  await newUser.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(
    newUser.getByRole("heading", { name: "Choose your password", exact: true }),
  ).toBeVisible();
  await newUser.getByLabel("Temporary password", { exact: true }).fill("UI-temporary-2026");
  await newUser
    .getByLabel("New password · at least 12 characters")
    .fill("UI-private-password-2026");
  await newUser
    .getByLabel("Confirm new password", { exact: true })
    .fill("UI-private-password-2026");
  await newUser.getByRole("button", { name: "Change password", exact: true }).click();
  await expect(newUser.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
  await expect(
    newUser.getByRole("navigation").getByRole("button", { name: "Users", exact: true }),
  ).toHaveCount(0);
  await adminContext.close();
  await newContext.close();
});
