import { chromium } from "playwright";

async function capture() {
  const browser = await chromium.launch({ channel: "chrome" });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  console.log("Navigating to landing page...");
  await page.goto("https://family-lineage-diagram-maker.vercel.app", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: "public/demo-landing.png" });
  console.log("Saved public/demo-landing.png");

  console.log("Navigating to editor multi-marriage demo...");
  await page.goto("https://family-lineage-diagram-maker.vercel.app/app?preset=multi", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "public/demo-editor.png" });
  console.log("Saved public/demo-editor.png");

  // Also create a primary demo.png
  await page.screenshot({ path: "public/demo.png" });
  console.log("Saved public/demo.png");

  await browser.close();
}

capture().catch((err) => {
  console.error(err);
  process.exit(1);
});
