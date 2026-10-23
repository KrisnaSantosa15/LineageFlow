import { expect, test } from "@playwright/test";

test.describe("LineageFlow E2E", () => {
  test("landing page playground switches presets and opens editor", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Draw the family you actually have." }),
    ).toBeVisible();
    await expect(page.getByText("16 Members · 6 Unions")).toBeVisible();

    await page.getByRole("tab", { name: "5-generation" }).click();
    await expect(page.getByText("9 Members · 4 Unions")).toBeVisible();

    await page.getByRole("tab", { name: "Blank" }).click();
    await expect(page.getByText("1 Members · 0 Unions")).toBeVisible();

    await page.getByRole("link", { name: /Start your tree/i }).click();
    await expect(page).toHaveURL(/\/app\?preset=blank/);
    expect(errors).toEqual([]);
  });

  test("editor supports kinship detection, adding relatives, union editing, undo/redo, JSON, and dark mode", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app");
    await expect(page.getByText("16 Members · 6 Unions")).toBeVisible();
    await expect(page.getByTestId("kinship-badge")).toHaveText("Self (Root)");

    // Select half-brother Lucas Sterling and verify kinship badge
    await page.getByText("Lucas Sterling").first().click();
    await expect(page.getByTestId("kinship-badge")).toHaveText("Half-Brother");

    // Select stepmother Diana Brooks and verify kinship badge
    await page.getByText("Diana Brooks").first().click();
    await expect(page.getByTestId("kinship-badge")).toHaveText("Stepmother");

    // Add a child to Diana Brooks's marriage
    await page.getByRole("button", { name: "+ Child Here" }).click();
    await page.getByLabel("Full Name *").fill("Nora Sterling");
    await page.getByRole("button", { name: "Save & Connect" }).click();

    await expect(page.getByText("17 Members · 6 Unions")).toBeVisible();
    await expect(page.getByTestId("kinship-badge")).toHaveText("Half-Brother");

    // Undo and Redo via toolbar buttons
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("16 Members · 6 Unions")).toBeVisible();

    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByText("17 Members · 6 Unions")).toBeVisible();

    // Open JSON modal and verify serialized tree contains Nora Sterling
    await page.getByRole("button", { name: "Import or export JSON" }).click();
    const jsonField = page.getByRole("textbox", { name: "Family tree JSON" });
    await expect(jsonField).toHaveValue(/Nora Sterling/);
    await page.getByRole("button", { name: "Close", exact: true }).click();

    // Toggle dark mode
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    expect(errors).toEqual([]);
  });
});
