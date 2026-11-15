# llms.txt builder

Turns a site into the files AI crawlers and agents read best:

- `llms.txt`: a curated index in the [llmstxt.org](https://llmstxt.org) format. Name, summary, key facts, then pages grouped by section with one-line descriptions. Secondary content goes under `## Optional`, and large templated groups (140 local SEO pages) collapse to one line. Kept under 95 KB because Webflow's llms.txt upload caps at 100 KB.
- `llms-full.txt`: every included page's Markdown in one file, for agents that want the whole site in one fetch.
- `md/<path>.md`: a clean Markdown copy of every page with front matter (title, canonical URL, description, last modified).
- `manifest.json`: what was converted, what was skipped and why (excluded, noindex, HTTP errors).

Conversion strips the header, nav, footer, forms, scripts, decorative SVG and in-page CTA anchors, resolves relative links and images to absolute URLs, drops images without alt text, keeps tables as GFM, and appends FAQ pairs from FAQPage JSON-LD when they are not already in the body.

```bash
npm install
npm test
npx tsx src/cli.ts --config nativecode.config.json --out ../public --mirror-base https://nativecodeai.github.io/nativecode-geo
```

`nativecode.config.json` holds the summary, facts, section rules (regex on the URL path), exclusions and extra selectors to strip. Point the same tool at any site by writing a new config.

The weekly pipeline publishes the output at https://nativecodeai.github.io/nativecode-geo/llms.txt. How to serve it from nativecode.ai and what to tell AI crawlers: [docs/ai-crawler-access.md](../docs/ai-crawler-access.md).
