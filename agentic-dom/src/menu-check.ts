// Functional check for the mega menu: desktop panels, keyboard close, mobile drawer.
import { chromium, Page } from "playwright";
import { mkdirSync } from "fs";

const base = process.argv[2] || "https://nativecodeai.webflow.io";
const path = process.argv[3] || "/";
const out = "menu-shots";
mkdirSync(out, { recursive: true });
let fails = 0;
const check = (ok: boolean, msg: string) => { console.log(`${ok ? "ok  " : "FAIL"} ${msg}`); if (!ok) fails++; };

async function visible(page: Page, sel: string) {
  return page.$eval(sel, (el) => { const r = (el as HTMLElement).getBoundingClientRect(); return r.height > 0 && getComputedStyle(el).display !== "none"; }).catch(() => false);
}

(async () => {
  const browser = await chromium.launch();
  // Desktop
  const d = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs: string[] = [];
  d.on("pageerror", (e) => errs.push(e.message));
  await d.goto(base + path, { waitUntil: "networkidle" });
  const tabs = await d.$$eval(".mm-tab", (els) => els.map((e) => e.textContent?.trim()));
  check(tabs.length === 4, `desktop tabs: ${tabs.join(" | ")}`);
  check(await d.$("#ncmm-css") !== null, "css script injected");
  for (const id of ["services", "industries", "resources", "company"]) {
    await d.click(`.mm-tab[data-mm="${id}"]`);
    await d.waitForTimeout(250);
    const open = await visible(d, `#mm-${id}`);
    const exp = await d.getAttribute(`.mm-tab[data-mm="${id}"]`, "aria-expanded");
    const links = await d.$$eval(`#mm-${id} a`, (els) => els.filter((e) => (e as HTMLElement).offsetHeight > 0).length);
    const others = await d.$$eval(".mm-panel", (els, id) => els.filter((e) => e.id !== "mm-" + id && getComputedStyle(e).display !== "none").length, id);
    check(open && exp === "true" && others === 0, `desktop ${id}: open=${open} expanded=${exp} links=${links} othersOpen=${others}`);
    await d.screenshot({ path: `${out}/desktop-${id}.png` });
  }
  await d.keyboard.press("Escape");
  await d.waitForTimeout(200);
  check(!(await visible(d, "#mm-company")), "Escape closes panel");
  const focused = await d.evaluate(() => (document.activeElement as HTMLElement)?.getAttribute("data-mm"));
  check(focused === "company", `focus returns to tab (${focused})`);
  await d.click('.mm-tab[data-mm="services"]');
  await d.mouse.click(700, 880);
  await d.waitForTimeout(200);
  check(!(await visible(d, "#mm-services")), "click outside closes panel");
  check(!(await visible(d, ".mm-acc")), "accordion buttons hidden on desktop");
  // Keyboard open
  await d.focus('.mm-tab[data-mm="resources"]');
  await d.keyboard.press("Enter");
  await d.waitForTimeout(200);
  check(await visible(d, "#mm-resources"), "Enter opens panel");
  await d.keyboard.press("Escape");
  check(errs.length === 0, `no page errors on desktop ${errs.join("; ")}`);

  // Mobile
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await m.goto(base + path, { waitUntil: "networkidle" });
  check(!(await visible(m, "#mm-wrap")), "mobile drawer closed on load");
  await m.screenshot({ path: `${out}/mobile-closed.png` });
  await m.tap(".ds-nav-menu");
  await m.waitForTimeout(300);
  check(await visible(m, "#mm-wrap"), "Menu opens drawer");
  check(await visible(m, "#mm-services"), "Services open by default");
  check((await m.textContent(".ds-nav-menu"))?.trim() === "Close", "Menu label becomes Close");
  await m.screenshot({ path: `${out}/mobile-open.png` });
  await m.$eval('.mm-acc[data-mm="resources"]', (el) => (el as HTMLElement).click());
  const geo = await m.evaluate(() => ({ nav: document.querySelector(".ds-nav")!.getBoundingClientRect().top, wrap: document.getElementById("mm-wrap")!.getBoundingClientRect().top, scrollY: window.scrollY, kids: [...document.querySelectorAll("#mm-resources, #mm-resources > *, #mm-resources .mm-inner > *")].map((e) => `${e.className}:${getComputedStyle(e).display}:${Math.round(e.getBoundingClientRect().height)}:pb${getComputedStyle(e).paddingBottom}:mb${getComputedStyle(e).marginBottom}`) }));
  console.log("mobile geometry", JSON.stringify(geo));
  await m.waitForTimeout(250);
  check(await visible(m, "#mm-resources") && !(await visible(m, "#mm-services")), "accordion switches to Resources");
  await m.screenshot({ path: `${out}/mobile-resources.png` });
  await m.tap(".ds-nav-menu");
  await m.waitForTimeout(250);
  check(!(await visible(m, "#mm-wrap")), "Close hides drawer");
  await browser.close();
  console.log(fails ? `${fails} check(s) failed` : "all checks passed");
  process.exit(fails ? 1 : 0);
})();
