import type { Finding, PageAudit } from "./audit.js";

/** Site-level Markdown report: template issues first (what repeats across pages), then each page. */
export function renderReport(pages: PageAudit[]): string {
  const avg = Math.round(pages.reduce((s, p) => s + p.score, 0) / Math.max(1, pages.length));
  const byId = new Map<string, { f: Finding; pages: string[]; total: number }>();
  for (const p of pages) {
    for (const f of p.findings) {
      const e = byId.get(f.id) ?? { f, pages: [], total: 0 };
      e.pages.push(p.url);
      e.total += f.count;
      byId.set(f.id, e);
    }
  }
  const order = { error: 0, warning: 1, notice: 2 };
  const site = [...byId.values()].sort((a, b) => order[a.f.severity] - order[b.f.severity] || b.pages.length - a.pages.length);

  const axeAll = new Map<string, { help: string; impact: string; pages: number; nodes: number; url: string }>();
  for (const p of pages) for (const v of p.axe) {
    const e = axeAll.get(v.id) ?? { help: v.help, impact: v.impact, pages: 0, nodes: 0, url: v.helpUrl };
    e.pages++;
    e.nodes += v.nodes;
    axeAll.set(v.id, e);
  }

  const lines = [
    "# Agentic DOM audit",
    "",
    `${pages.length} pages audited. Average agent-readiness score: **${avg}/100**.`,
    "",
    "Scores start at 100 and lose 12 points per error, 5 per warning, and 1 to 8 per axe-core WCAG violation by impact. Findings come from Chromium's accessibility tree (the tree DOM-based agents and screen readers read) and from DOM checks aimed at agents that click from screenshots.",
    "",
    "| Page | Score | main | h1 | Unnamed controls | axe rules |",
    "|---|---|---|---|---|---|",
    ...pages.map((p) => `| ${new URL(p.url).pathname} | ${p.score} | ${p.landmarks.main} | ${p.headings.filter((h) => h.level === 1).length} | ${p.interactive.unnamed} of ${p.interactive.total} | ${p.axe.length} |`),
    "",
    "## Site-wide issues",
    "",
    "Issues that repeat across pages live in shared components and templates, so one fix in Webflow resolves them everywhere.",
    "",
  ];
  for (const { f, pages: on, total } of site) {
    lines.push(`### ${f.title} (${f.severity}, ${on.length} of ${pages.length} pages, ${total} instances)`, "", f.why, "", `**Fix:** ${f.fix}`, "");
    if (f.examples.length) lines.push("Examples:", "", ...f.examples.map((x) => `- \`${x.replace(/`/g, "'")}\``), "");
  }
  if (axeAll.size) {
    lines.push("## axe-core WCAG 2.2 AA violations", "", "| Rule | Impact | Pages | Elements |", "|---|---|---|---|");
    for (const [id, v] of [...axeAll.entries()].sort((a, b) => (AXE_ORDER[a[1].impact] ?? 9) - (AXE_ORDER[b[1].impact] ?? 9))) {
      lines.push(`| [${id}](${v.url}): ${v.help} | ${v.impact} | ${v.pages} | ${v.nodes} |`);
    }
    lines.push("");
  }
  lines.push("## Heading outlines", "");
  for (const p of pages) {
    lines.push(`**${new URL(p.url).pathname}**`, "", ...p.headings.slice(0, 25).map((h) => `${"  ".repeat(Math.max(0, h.level - 1))}- h${h.level} ${h.name || "(empty)"}`), "");
  }
  return lines.join("\n");
}

const AXE_ORDER: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
