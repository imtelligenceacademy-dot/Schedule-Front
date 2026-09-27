import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("E2e-password-2026");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();
}
async function schedules(page: Page) {
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "All Schedules", exact: true })
    .click();
  await page.getByRole("tab", { name: "Compact", exact: true }).click();
}

test("separate users see the same data, permission gates, version conflicts and shared colors", async ({
  browser,
}) => {
  const adminContext = await browser.newContext(),
    viewerContext = await browser.newContext(),
    superContext = await browser.newContext();
  const admin = await adminContext.newPage(),
    viewer = await viewerContext.newPage(),
    superPage = await superContext.newPage();
  await login(admin, "admin@example.com");
  await login(viewer, "viewer@example.com");
  await login(superPage, "super@example.com");
  await expect(
    viewer.getByRole("navigation").getByRole("button", { name: "Users", exact: true }),
  ).toHaveCount(0);
  await expect(
    viewer.getByRole("navigation").getByRole("button", { name: "Data Import", exact: true }),
  ).toHaveCount(0);
  await schedules(admin);
  await schedules(viewer);
  await schedules(superPage);
  await expect(viewer.getByRole("button", { name: "Add session", exact: true })).toHaveCount(0);
  await expect(viewer.getByRole("button", { name: "CSV", exact: true })).toHaveCount(0);
  await admin.getByRole("button", { name: "Add session", exact: true }).click();
  const dialog = admin.getByRole("dialog");
  await dialog
    .getByLabel("School", { exact: true })
    .selectOption({ label: "Example Cedar School" });
  await dialog.getByLabel("Assigned teacher").selectOption({ label: "Example Huda" });
  await dialog.getByLabel("Grade / class").selectOption({ label: "Grade 4 · A" });
  await dialog.getByLabel("Day", { exact: true }).selectOption({ label: "Saturday" });
  await dialog.getByLabel("Start time").fill("11:00");
  await dialog.getByLabel("End time").fill("11:50");
  await dialog.getByLabel("Notes (optional)").fill("Shared browser test");
  await dialog.getByRole("button", { name: "Add session", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await viewer.getByRole("button", { name: "Refresh", exact: true }).click();
  const viewerRow = viewer.getByRole("row").filter({ hasText: "Saturday" });
  await expect(viewerRow).toContainText("11:00–11:50");
  await viewer.reload();
  await schedules(viewer);
  await expect(viewer.getByRole("row").filter({ hasText: "Saturday" })).toContainText(
    "11:00–11:50",
  );
  await superPage.getByRole("button", { name: "Refresh", exact: true }).click();
  await superPage
    .getByRole("row")
    .filter({ hasText: "Saturday" })
    .getByRole("button", { name: "Open" })
    .click();
  await admin
    .getByRole("row")
    .filter({ hasText: "Saturday" })
    .getByRole("button", { name: "Open" })
    .click();
  await admin.getByRole("dialog").getByLabel("Start time").fill("11:10");
  await admin
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(admin.getByRole("dialog")).toHaveCount(0);
  await superPage.getByRole("dialog").getByLabel("End time").fill("12:00");
  await superPage
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await expect(superPage.getByRole("dialog").getByRole("alert")).toContainText(
    "modified by another user",
  );
  await superPage
    .getByRole("dialog")
    .getByRole("button", { name: "Reload latest", exact: true })
    .click();
  await expect(superPage.getByRole("dialog").getByLabel("Start time")).toHaveValue("11:10");
  await superPage.getByRole("button", { name: "Close dialog", exact: true }).click();
  await superPage
    .getByRole("navigation")
    .getByRole("button", { name: "Audit Log", exact: true })
    .click();
  await expect(
    superPage.locator(".audit-row").filter({ hasText: "update · schedule entries" }),
  ).toBeVisible();
  await viewer.getByRole("button", { name: "Refresh", exact: true }).click();
  await viewer.getByRole("tab", { name: "Teacher Columns", exact: true }).click();
  const blocks = viewer.locator(".schedule-block").filter({ hasText: "Example Cedar School" });
  const colors = await blocks.evaluateAll((nodes) =>
    nodes.map((x) => (x as HTMLElement).style.borderLeftColor),
  );
  expect(new Set(colors).size).toBe(1);
  await adminContext.close();
  await viewerContext.close();
  await superContext.close();
});

test("mobile workspace and import validation/export operate through the backend", async ({
  browser,
}) => {
  const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    page = await context.newPage();
  await login(page, "super@example.com");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Data Import", exact: true })
    .click();
  const csv =
    "school,teacher,grade,class,day,start_time,end_time,notes\nImported School,Teacher Grade 6C,Grade 6,C,Sunday,10:00,10:50,Imported in browser\n";
  await page.getByLabel("Schedule import file").setInputFiles({
    name: "schedule.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(csv),
  });
  const createMissing = page.getByRole("checkbox", {
    name: "Create missing schools, teachers and yearly assignments",
  });
  await expect(createMissing).toBeChecked();
  await createMissing.uncheck();
  await page.getByRole("button", { name: "Validate file", exact: true }).click();
  await expect(page.locator(".import-result")).toContainText(
    "School 'Imported School' was not found",
  );
  await createMissing.check();
  await expect(page.locator(".import-result")).toHaveCount(0);
  await page.getByRole("button", { name: "Validate file", exact: true }).click();
  await expect(page.locator(".import-result")).toContainText("1 valid sessions");
  await expect(page.locator(".import-records")).toContainText(
    "1 school, 1 teacher, 1 yearly assignment and 1 class",
  );
  await page.getByText("View new teacher names", { exact: true }).click();
  await expect(page.locator(".import-records")).toContainText("Teacher Grade 6C");
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.screenshot({ path: "test-results/import-preview.png", fullPage: true });
  await page.getByRole("button", { name: "Import 1 sessions", exact: true }).click();
  await expect(page.locator(".import-result")).toContainText("1 sessions imported");
  await page.getByRole("button", { name: "Open navigation", exact: true }).click();
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "All Schedules", exact: true })
    .click();
  const dayFilter = page.getByRole("button", { name: /^Filter by day/ });
  await expect(dayFilter).toBeHidden();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await dayFilter.click();
  await page.getByRole("checkbox", { name: "Sunday", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Filters (1)", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Compact", exact: true }).click();
  await expect(page.getByRole("row").filter({ hasText: "Sunday" })).toContainText("Grade 6 · C");
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  expect((await downloaded).suggestedFilename()).toBe("robotics-schedule.xlsx");
  await context.close();
});

test("filters accept several values to compare two teachers", async ({ page }) => {
  await login(page, "super@example.com");
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "All Schedules", exact: true })
    .click();
  await page.getByRole("button", { name: /^Filter by teacher/ }).click();
  await page.getByRole("checkbox", { name: "Example Huda", exact: true }).check();
  await page.getByRole("checkbox", { name: "Example Rami", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Filter by teacher: 2 teachers" })).toBeVisible();
  const legend = page.locator(".school-legend");
  await expect(legend).toContainText("Comparing 2 teachers");
  await expect(page.locator(".schedule-block")).not.toHaveCount(0);
  const names = await page.locator(".schedule-block .block-teacher").allInnerTexts();
  expect(new Set(names.map((x) => x.split(" · ")[1]))).toEqual(
    new Set(["Example Huda", "Example Rami"]),
  );
  // Days combine the same way: Monday + Tuesday only.
  await page.getByRole("button", { name: /^Filter by day/ }).click();
  await page.getByRole("checkbox", { name: "Monday", exact: true }).check();
  await page.getByRole("checkbox", { name: "Tuesday", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.locator(".timeline-day:not(.time-heading)")).toHaveText([/Monday/, /Tuesday/]);
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(legend).not.toContainText("Comparing");
});

test("cold startup remains a loading state and wakes successfully", async ({ page }) => {
  await page.route("**/api/auth/me", async (route) => {
    await new Promise((r) => setTimeout(r, 6500));
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ detail: "Please sign in." }),
    });
  });
  await page.goto("/");
  await expect(page.getByText("Starting schedule server...", { exact: true })).toBeVisible({
    timeout: 6000,
  });
  await expect(page.getByRole("button", { name: "Sign In", exact: true })).toBeVisible({
    timeout: 10000,
  });
});
