import { expect, test } from "@playwright/test";

test("landing page exposes the live product suite and authentication entry", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Röntgen AI/i);
  await expect(page.getByText("See through", { exact: true })).toBeVisible();
  await expect(page.getByText("your systems.", { exact: true })).toBeVisible();
  await expect(page.getByText("7 products live", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign in/i }).first()).toHaveAttribute(
    "href",
    "/sign-in",
  );
});

test("privacy and terms routes are available in the production build", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: /terms/i }).first()).toBeVisible();
});
