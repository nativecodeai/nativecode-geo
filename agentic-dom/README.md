# Agentic DOM audit

Audits a site the way AI web agents experience it. DOM-based agents and screen readers read the accessibility tree; visual agents such as computer use click coordinates on a screenshot. Both break on the same things.

For each URL, the audit loads the page in Chromium, pulls the full accessibility tree over the DevTools protocol, and checks:

- Landmarks: exactly one `main`, a banner and contentinfo, labeled navigation regions
- Headings: one h1, no skipped levels, no empty headings
- Controls: links and buttons with no accessible name, vague link text ("Learn more"), the same link name pointing to different places
- DOM: clickable divs that are not buttons, anchors without href, dropdown menus hidden until hover with no `aria-expanded`, images without alt, form fields without labels, duplicate ids, positive tabindex, focusable content inside `aria-hidden`, click targets under 24x24 px, `lang`, skip link
- axe-core WCAG 2.2 A and AA rules

Each page gets a 0 to 100 agent-readiness score. The report groups issues by how many templates share them, since a fix in a shared Webflow component fixes every page built from it, and saves each page's ARIA snapshot.

```bash
npm install
npx playwright install chromium
npm test
npm run audit -- --urls nativecode-urls.txt --out ../public/agentic-dom
npm run audit -- --urls nativecode-urls.txt --out ../public/agentic-dom/mobile --mobile
```

Latest report on nativecode.ai: https://nativecodeai.github.io/nativecode-geo/agentic-dom/report.md
