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

  test("editor starts fresh by default, loads examples from load menu, and supports kinship, union editing, undo/redo, JSON, and dark mode", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/app");
    // Editor starts fresh by default (1 root member, 0 unions)
    await expect(page.getByText("1 Members · 0 Unions")).toBeVisible();
    await expect(page.getByText("1 Generations · 0 Multi-Unions")).toBeVisible();
    await expect(page.getByTestId("kinship-badge")).toHaveText("Self (Root)");

    // Open Load / Save menu to load the Multi-Marriage Demo example
    await page.getByRole("button", { name: "Import or export JSON" }).click();
    await page.getByRole("button", { name: /Multi-Marriage Demo/i }).click();

    await expect(page.getByText("16 Members · 6 Unions")).toBeVisible();
    await expect(page.getByText("5 Generations · 2 Multi-Unions")).toBeVisible();
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

    // Open JSON modal, verify Save .ged and Save .json buttons
    await page.getByRole("button", { name: "Import or export JSON" }).click();
    await expect(page.getByRole("button", { name: "Save .json" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save .ged" })).toBeVisible();
    const jsonField = page.getByRole("textbox", { name: "Family tree JSON" });
    await expect(jsonField).toHaveValue(/Nora Sterling/);
    await page.getByRole("button", { name: "Close", exact: true }).click();

    // Search for Uncle Thomas Sterling via toolbar search box
    await page.getByLabel("Find family member").fill("Thomas Sterling");
    await expect(page.getByTestId("kinship-badge")).toHaveText("Uncle");

    // Search for Sarah Jenkins and dissolve her union with Alex
    await page.getByLabel("Find family member").fill("Sarah Jenkins");
    await expect(page.getByTestId("kinship-badge")).toHaveText("Ex-Spouse");
    await page.getByRole("button", { name: "Dissolve Union #1" }).click();
    await expect(page.getByText("17 Members · 5 Unions")).toBeVisible();
    await expect(page.getByText("5 Generations · 1 Multi-Unions")).toBeVisible();

    // Load 5-Gen Ancestry example from the Load / Save menu
    await page.getByRole("button", { name: "Import or export JSON" }).click();
    await page.getByRole("button", { name: /5-Gen Ancestry/i }).click();
    await expect(page.getByText("9 Members · 4 Unions")).toBeVisible();

    // Drag a connector bus line handle vertically and verify Reset Layout appears and works
    const busHandle = page.getByTestId("bus-handle-u_4");
    await expect(busHandle).toBeVisible();
    await busHandle.hover();
    const box = await busHandle.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 28, {
        steps: 5,
      });
      await page.mouse.up();
    }
    const resetBtn = page.getByRole("button", { name: "Reset Layout" });
    await expect(resetBtn).toBeVisible();
    await resetBtn.click();
    await expect(resetBtn).toBeHidden();

    // Toggle dark mode
    await page.getByRole("button", { name: "Toggle color theme" }).click();
    await expect(page.locator("html")).toHaveClass(/dark/);

    expect(errors).toEqual([]);
  });
});
