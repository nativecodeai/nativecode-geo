// Full-page screenshots of a URL at desktop and mobile widths.
import { chromium } from "playwright";
import { mkdirSync } from "fs";
const url = process.argv[2];
mkdirSync("menu-shots", { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const [name, w, h] of [["desktop", 1440, 900], ["mobile", 390, 844]] as const) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(url, { waitUntil: "load" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `menu-shots/page-${name}.png`, fullPage: true });
  }
  await b.close();
})();
