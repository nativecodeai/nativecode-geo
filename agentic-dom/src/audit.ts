/**
 * Agentic DOM audit.
 *
 * Browser agents read a page through the accessibility tree (roles, names,
 * states). Visual agents such as Computer Use click coordinates on a
 * screenshot. Both fail on the same things: controls with no name, links
 * that all say "Learn more", divs pretending to be buttons, menus that only
 * open on hover, tiny targets, and pages with no landmarks to orient by.
 *
 * For each URL this captures Chromium's full accessibility tree over CDP (the
 * same tree assistive tech and DOM-based agents consume), runs agent-specific
 * checks on it and on the DOM, and runs axe-core for WCAG 2.2 A/AA rules.
 */
import AxeBuilder from "@axe-core/playwright";
import type { Browser, CDPSession, Page } from "playwright";

export type Severity = "error" | "warning" | "notice";

export interface Finding {
  id: string;
  severity: Severity;
  title: string;
  count: number;
  examples: string[];
  why: string;
  fix: string;
}

export interface PageAudit {
  url: string;
  title: string;
  score: number;
  landmarks: Record<string, number>;
  headings: { level: number; name: string }[];
  interactive: { total: number; unnamed: number };
  findings: Finding[];
  axe: { id: string; impact: string; help: string; nodes: number; helpUrl: string }[];
  contrast?: { target: string; html: string; fg: string; bg: string; ratio: number; expected: number; fontSize: string; fontWeight: string }[];
  ariaSnapshot: string;
}

interface AXNode {
  nodeId: string;
  ignored: boolean;
  role?: { value: string };
  name?: { value: string };
  properties?: { name: string; value: { value: unknown } }[];
  backendDOMNodeId?: number;
  parentId?: string;
}

const INTERACTIVE = new Set(["link", "button", "textbox", "searchbox", "combobox", "checkbox", "radio", "switch", "slider", "menuitem", "tab", "listbox", "spinbutton"]);
const LANDMARKS = ["banner", "navigation", "main", "contentinfo", "complementary", "search", "form", "region"];
const VAGUE = new Set(["learn more", "read more", "more", "click here", "here", "details", "view", "view more", "see more", "go", "link", "→", "->", "↑", "↓", "»", "...", "continue", "explore"]);

const WEIGHT: Record<Severity, number> = { error: 12, warning: 5, notice: 0 };
const AXE_WEIGHT: Record<string, number> = { critical: 8, serious: 5, moderate: 2, minor: 1 };

export async function auditPage(browser: Browser, url: string, opts: { viewport?: { width: number; height: number } } = {}): Promise<PageAudit> {
  const context = await browser.newContext({ viewport: opts.viewport ?? { width: 1366, height: 900 }, userAgent: undefined });
  const page = await context.newPage();
  try {
    await page.goto(url, { waitUntil: "load", timeout: 45_000 });
    // Let Webflow interactions and lazy content settle without waiting on analytics beacons.
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});
    const cdp = await context.newCDPSession(page);
    const nodes = ((await cdp.send("Accessibility.getFullAXTree")) as { nodes: AXNode[] }).nodes.filter((n) => !n.ignored);
    const findings: Finding[] = [];

    // ---- landmarks
    const landmarks = Object.fromEntries(LANDMARKS.map((r) => [r, nodes.filter((n) => n.role?.value === r).length]));
    if (landmarks.main !== 1) {
      findings.push({
        id: "landmark-main",
        severity: "error",
        title: landmarks.main === 0 ? "No main landmark" : `${landmarks.main} main landmarks`,
        count: landmarks.main === 0 ? 1 : landmarks.main,
        examples: [],
        why: "Agents and screen readers jump to the main landmark to skip navigation. Without exactly one, an agent has to read the whole page, header and footer included, to find the content.",
        fix: "Wrap the primary content of every template in a single <main> element (in Webflow: select the content wrapper, Element settings > Tag > main).",
      });
    }
    for (const r of ["banner", "contentinfo"] as const) {
      if (!landmarks[r]) {
        findings.push({ id: `landmark-${r}`, severity: "warning", title: `No ${r === "banner" ? "header (banner)" : "footer (contentinfo)"} landmark`, count: 1, examples: [], why: "Landmarks let agents separate site chrome from page content.", fix: `Use a top-level <${r === "banner" ? "header" : "footer"}> element for the site ${r === "banner" ? "header" : "footer"}.` });
      }
    }
    const navs = nodes.filter((n) => n.role?.value === "navigation");
    const unlabeledNavs = navs.filter((n) => !n.name?.value);
    if (navs.length > 1 && unlabeledNavs.length > 1) {
      findings.push({ id: "nav-labels", severity: "warning", title: `${unlabeledNavs.length} navigation regions share no label`, count: unlabeledNavs.length, examples: [], why: "When a page has several nav regions, an agent cannot tell the main menu from the footer menu or breadcrumbs.", fix: 'Give each <nav> an aria-label, e.g. "Main", "Footer", "Breadcrumb".' });
    }

    // ---- headings
    const headings = nodes
      .filter((n) => n.role?.value === "heading")
      .map((n) => ({ level: Number(prop(n, "level") ?? 0), name: (n.name?.value ?? "").trim() }));
    const h1s = headings.filter((h) => h.level === 1);
    if (h1s.length !== 1) {
      findings.push({ id: "single-h1", severity: h1s.length ? "warning" : "error", title: h1s.length ? `${h1s.length} h1 headings` : "No h1 heading", count: Math.max(1, h1s.length), examples: h1s.map((h) => h.name).slice(0, 3), why: "The h1 is the strongest signal of what a page is about, for agents and answer engines alike.", fix: "Use exactly one h1 that states the page topic." });
    }
    const skips = headings.flatMap((h, i) => (i > 0 && h.level > headings[i - 1].level + 1 ? [`h${headings[i - 1].level} "${clip(headings[i - 1].name)}" -> h${h.level} "${clip(h.name)}"`] : []));
    if (skips.length) findings.push({ id: "heading-order", severity: "warning", title: "Heading levels skip", count: skips.length, examples: skips.slice(0, 4), why: "Agents build an outline from heading levels. Skipped levels break the parent-child structure an agent uses to scope sections.", fix: "Step heading levels down one at a time (h2 then h3), styling them with classes instead of picking tags for size." });
    const emptyHeadings = headings.filter((h) => !h.name);
    if (emptyHeadings.length) findings.push({ id: "empty-heading", severity: "warning", title: "Empty headings", count: emptyHeadings.length, examples: [], why: "An empty heading adds a node to the outline that says nothing.", fix: "Remove empty heading elements or give them text." });

    // ---- interactive names
    const interactive = nodes.filter((n) => INTERACTIVE.has(n.role?.value ?? ""));
    const unnamed = interactive.filter((n) => !(n.name?.value ?? "").trim());
    if (unnamed.length) {
      findings.push({ id: "unnamed-control", severity: "error", title: "Controls with no accessible name", count: unnamed.length, examples: await describe(cdp, unnamed.slice(0, 5)), why: "An agent sees these as 'link' or 'button' with nothing to say what they do, so it cannot choose them on purpose. Icon-only buttons and image links without alt text are the usual cause.", fix: "Add visible text, or an aria-label that says what the control does (e.g. aria-label=\"Open menu\")." });
    }
    const links = interactive.filter((n) => n.role?.value === "link" && n.name?.value);
    const vague = links.filter((n) => VAGUE.has(normalizeName(n.name!.value)));
    if (vague.length) {
      findings.push({ id: "vague-link-text", severity: "warning", title: "Links with non-descriptive names", count: vague.length, examples: [...new Set(vague.map((n) => `"${n.name!.value.trim()}"`))].slice(0, 5), why: "A list of links that all read \"Learn more\" gives an agent nothing to choose between.", fix: "Write link text that names the destination, or add an aria-label such as \"Learn more about technical SEO\"." });
    }
    const dupNames = duplicateNamesDifferentTargets(await linkTargets(page));
    if (dupNames.length) {
      findings.push({ id: "ambiguous-links", severity: "notice", title: "Same link name, different destinations", count: dupNames.length, examples: dupNames.slice(0, 5), why: "Two links with the same name that go to different places force an agent to guess.", fix: "Make the names distinct or add context with aria-label." });
    }

    // ---- DOM-level checks
    // tsx/esbuild wrap named functions in __name(); define it so serialized checks run in the page.
    await page.evaluate("window.__name = window.__name || ((f) => f)");
    const dom = await page.evaluate(domChecks);
    const add = (id: string, severity: Severity, title: string, list: string[], why: string, fix: string) => {
      if (list.length) findings.push({ id, severity, title, count: list.length, examples: list.slice(0, 5), why, fix });
    };
    add("fake-button", "error", "Clickable elements that are not buttons or links", dom.fakeButtons, "A div with a click handler has no role, is not in the tab order, and does not appear as a control in the accessibility tree. DOM agents miss it; keyboard users cannot reach it.", "Use <button> for actions and <a href> for navigation, or add role=\"button\", tabindex=\"0\" and key handlers.");
    add("anchor-no-href", "warning", "Links without an href", dom.anchorsNoHref, "Without an href an anchor is not focusable and agents do not treat it as a link.", "Give the link a real URL, or make it a <button> if it performs an action.");
    add("hover-only-menu", "warning", "Menu items hidden until hover", dom.hoverMenus, "Links inside a closed dropdown are display:none, so they are absent from the accessibility tree until something opens the menu. A toggle without aria-expanded gives no hint that more items exist.", "Make toggles real buttons with aria-expanded and aria-controls, and make sure each dropdown target is also linked from a visible hub page.");
    add("img-missing-alt", "warning", "Images with no alt attribute", dom.imgNoAlt, "Agents read alt text to understand images. A missing alt (as opposed to alt=\"\") leaves them with a file name.", "Add descriptive alt text, or alt=\"\" for decorative images.");
    add("input-no-label", "error", "Form fields without a label", dom.inputsNoLabel, "An agent filling a form matches fields by their label. Placeholder text disappears on input and is not a reliable name.", "Connect a <label for> to every field, or add aria-label.");
    add("duplicate-id", "warning", "Duplicate id attributes", dom.duplicateIds, "aria-labelledby, aria-controls and anchor links resolve by id. Duplicates point agents at the wrong element.", "Make every id unique on the page.");
    add("positive-tabindex", "warning", "Positive tabindex", dom.positiveTabindex, "tabindex greater than 0 reorders keyboard focus away from visual order.", "Use tabindex=\"0\" or remove it and fix the DOM order.");
    add("small-target", "notice", "Click targets smaller than 24x24 px", dom.smallTargets, "Visual agents click coordinates from screenshots. Small, tightly packed targets get mis-clicked (WCAG 2.5.8).", "Give links and buttons at least 24x24 px of hit area with padding.");
    add("focusable-aria-hidden", "error", "Focusable elements inside aria-hidden", dom.focusableHidden, "Keyboard focus lands on something the accessibility tree says does not exist.", "Remove aria-hidden from containers with focusable content, or make the content inert.");
    if (!dom.lang) add("html-lang", "warning", "Missing html lang", ["<html> has no lang attribute"], "Language tells agents and speech engines how to read the text.", "Set lang=\"en\" on <html> (Webflow: Site settings > General > Localization).");
    if (!dom.skipLink) add("skip-link", "notice", "No skip link", ["First focusable element is not a skip-to-content link"], "A skip link lets keyboard and agent users bypass repeated navigation in one step.", "Add a visually hidden link to #main as the first element in the body, shown on focus.");

    // ---- axe-core WCAG 2.2 A/AA
    const axeRes = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
    const axe = axeRes.violations.map((v) => ({ id: v.id, impact: v.impact ?? "minor", help: v.help, nodes: v.nodes.length, helpUrl: v.helpUrl }));
    // Keep the color pairs behind each contrast failure so fixes can be planned at the token level.
    const contrast = (axeRes.violations.find((v) => v.id === "color-contrast")?.nodes ?? []).map((n) => {
      const data = (n.any[0]?.data ?? {}) as Record<string, unknown>;
      return {
        target: String(n.target?.[0] ?? ""),
        html: n.html.slice(0, 160),
        fg: String(data.fgColor ?? ""),
        bg: String(data.bgColor ?? ""),
        ratio: Number(data.contrastRatio ?? 0),
        expected: Number(String(data.expectedContrastRatio ?? "4.5").replace(":1", "")),
        fontSize: String(data.fontSize ?? ""),
        fontWeight: String(data.fontWeight ?? ""),
      };
    });

    const penalty = findings.reduce((s, f) => s + WEIGHT[f.severity], 0) + axe.reduce((s, v) => s + (AXE_WEIGHT[v.impact] ?? 1), 0);
    return {
      url,
      title: await page.title(),
      score: Math.max(0, 100 - penalty),
      landmarks,
      headings,
      interactive: { total: interactive.length, unnamed: unnamed.length },
      findings: findings.sort((a, b) => WEIGHT[b.severity] - WEIGHT[a.severity]),
      axe,
      contrast,
      ariaSnapshot: await page.locator("body").ariaSnapshot().catch(() => ""),
    };
  } finally {
    await context.close();
  }
}

// ---------------------------------------------------------------- helpers

function prop(n: AXNode, name: string): unknown {
  return n.properties?.find((p) => p.name === name)?.value.value;
}

const clip = (s: string, n = 40) => (s.length > n ? `${s.slice(0, n)}...` : s);
const normalizeName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").replace(/[→›»]+$/, "→").trim();

async function describe(cdp: CDPSession, nodes: AXNode[]): Promise<string[]> {
  const out: string[] = [];
  for (const n of nodes) {
    if (!n.backendDOMNodeId) continue;
    try {
      const { node } = (await cdp.send("DOM.describeNode", { backendNodeId: n.backendDOMNodeId })) as { node: { nodeName: string; attributes?: string[] } };
      const attrs: Record<string, string> = {};
      for (let i = 0; i < (node.attributes?.length ?? 0); i += 2) attrs[node.attributes![i]] = node.attributes![i + 1];
      const bits = [node.nodeName.toLowerCase(), attrs.class ? `.${attrs.class.split(/\s+/).slice(0, 2).join(".")}` : "", attrs.href ? ` href="${clip(attrs.href, 60)}"` : ""];
      out.push(`${n.role?.value}: <${bits.join("")}>`);
    } catch {
      out.push(`${n.role?.value}`);
    }
  }
  return out;
}

async function linkTargets(page: Page): Promise<{ name: string; href: string }[]> {
  return page.$$eval("a[href]", (as) =>
    as
      .filter((a) => (a as HTMLElement).offsetParent !== null)
      .map((a) => ({ name: ((a as HTMLElement).innerText || a.getAttribute("aria-label") || "").trim().toLowerCase(), href: (a as HTMLAnchorElement).href.split("#")[0] })),
  );
}

function duplicateNamesDifferentTargets(links: { name: string; href: string }[]): string[] {
  const by = new Map<string, Set<string>>();
  for (const l of links) if (l.name) (by.get(l.name) ?? by.set(l.name, new Set()).get(l.name)!).add(l.href);
  return [...by.entries()].filter(([, hrefs]) => hrefs.size > 1).map(([name, hrefs]) => `"${name}" -> ${hrefs.size} destinations`);
}

/** Runs inside the page. Must be self-contained. */
function domChecks() {
  const sel = (el: Element) => {
    const id = el.id ? `#${el.id}` : "";
    const cls = el.classList.length ? `.${[...el.classList].slice(0, 2).join(".")}` : "";
    const text = (el.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 30);
    return `<${el.tagName.toLowerCase()}${id}${cls}>${text ? ` "${text}"` : ""}`;
  };
  const visible = (el: Element) => {
    const r = (el as HTMLElement).getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const isNative = (el: Element) => el.matches("a[href], button, input, select, textarea, summary, label, [role], [tabindex]") || !!el.closest("a[href], button, label, summary, details, [role=button], [role=link]");

  const fakeButtons = [...document.querySelectorAll<HTMLElement>("div, span, li, img, svg")]
    .filter((el) => visible(el) && !isNative(el))
    .filter((el) => el.hasAttribute("onclick") || (getComputedStyle(el).cursor === "pointer" && !el.closest("a, button") && (el.children.length < 4)))
    .filter((el, _, all) => !all.some((o) => o !== el && o.contains(el)))
    .map(sel);

  const anchorsNoHref = [...document.querySelectorAll("a:not([href])")].filter(visible).map(sel);

  const hoverMenus = [...document.querySelectorAll(".w-dropdown, [class*='dropdown']")]
    .map((dd) => {
      const toggle = dd.querySelector(".w-dropdown-toggle, [class*='toggle']");
      const list = dd.querySelector(".w-dropdown-list, [class*='dropdown-list'], [class*='menu']");
      if (!toggle || !list) return null;
      const hidden = getComputedStyle(list).display === "none" || getComputedStyle(list).visibility === "hidden";
      const linksInside = list.querySelectorAll("a[href]").length;
      const toggleOk = toggle.matches("button, [role=button]") && toggle.hasAttribute("aria-expanded");
      return hidden && linksInside && !toggleOk ? `${sel(toggle)} hides ${linksInside} links` : null;
    })
    .filter((x): x is string => !!x);

  const imgNoAlt = [...document.querySelectorAll("img:not([alt])")].filter(visible).map((i) => `<img src="${(i.getAttribute("src") ?? "").split("/").pop()?.slice(0, 50)}">`);

  const inputsNoLabel = [...document.querySelectorAll<HTMLInputElement>("input:not([type=hidden]):not([type=submit]):not([type=button]), select, textarea")]
    .filter((el) => visible(el) || el.offsetParent !== null)
    .filter((el) => !(el.labels && el.labels.length) && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby") && !el.closest("label"))
    .map((el) => `<${el.tagName.toLowerCase()} name="${el.name}"${el.placeholder ? ` placeholder="${el.placeholder}"` : ""}>`);

  const ids = new Map<string, number>();
  document.querySelectorAll("[id]").forEach((el) => ids.set(el.id, (ids.get(el.id) ?? 0) + 1));
  const duplicateIds = [...ids.entries()].filter(([, n]) => n > 1).map(([id, n]) => `#${id} x${n}`);

  const positiveTabindex = [...document.querySelectorAll("[tabindex]")].filter((el) => Number(el.getAttribute("tabindex")) > 0).map(sel);

  const smallTargets = [...document.querySelectorAll<HTMLElement>("a[href], button, [role=button]")]
    .filter(visible)
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const inline = getComputedStyle(el).display === "inline" && !!el.closest("p, li");
      return !inline && (r.width < 24 || r.height < 24);
    })
    .map((el) => `${sel(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);

  const focusableHidden = [...document.querySelectorAll("[aria-hidden=true] a[href], [aria-hidden=true] button, [aria-hidden=true] input, [aria-hidden=true] [tabindex]:not([tabindex='-1'])")]
    .filter((el) => !(el as HTMLElement).closest("[inert]") && el.getAttribute("tabindex") !== "-1")
    .map(sel);

  const firstFocusable = document.querySelector<HTMLElement>("a[href], button, input, [tabindex]:not([tabindex='-1'])");
  const skipLink = !!firstFocusable && firstFocusable.tagName === "A" && /^#/.test(firstFocusable.getAttribute("href") ?? "") && /skip|main|content/i.test(firstFocusable.textContent ?? "");

  return { fakeButtons, anchorsNoHref, hoverMenus, imgNoAlt, inputsNoLabel, duplicateIds, positiveTabindex, smallTargets, focusableHidden, lang: document.documentElement.lang, skipLink };
}
