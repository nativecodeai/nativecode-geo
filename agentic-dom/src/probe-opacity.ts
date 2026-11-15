/**
 * Prints the opacity chain for an element before and after it is scrolled into view.
 * Used to tell a real low-contrast color from a scroll-linked fade.
 *
 * Usage: tsx src/probe-opacity.ts <url> <css selector> [width]
 */
import { chromium } from "playwright";

const [url, selector, width = "1440"] = process.argv.slice(2);

async function chain(page: import("playwright").Page) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return "not found";
    const out: string[] = [];
    let n: Element | null = el;
    while (n && n !== document.body) {
      const cs = getComputedStyle(n);
      out.push(`${n.tagName.toLowerCase()}.${(n.getAttribute("class") || "").replace(/\s+/g, ".")} opacity=${cs.opacity} color=${cs.color} style="${n.getAttribute("style") || ""}"`);
      n = n.parentElement;
    }
    return out.join("\n");
  }, selector);
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
  const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(1500);
  console.log("== before scroll ==\n" + (await chain(page)));
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(2000);
  console.log("== in view ==\n" + (await chain(page)));
  await page.mouse.move(5, 5);
  await page.waitForTimeout(500);
  console.log("== in view, mouse away ==\n" + (await chain(page)));
  await browser.close();
})();
