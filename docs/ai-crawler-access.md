# AI crawler access for nativecode.ai

How AI crawlers and agents reach nativecode.ai today, and how the files this repo builds should be served.

## Current state (checked 15 Nov 2026)

| Item | State |
|---|---|
| DNS | Nameservers at GoDaddy (`ns05/ns06.domaincontrol.com`). `www` is a CNAME to Webflow (`cdn.webflow.com`), `app` points to Vercel. Cloudflare is not in the request path, so no Cloudflare bot rule is blocking AI crawlers. |
| robots.txt | One line, `Sitemap: https://www.nativecode.ai/sitemap.xml`. No `Disallow` rules, so every crawler below is allowed. |
| llms.txt | Not published (`/llms.txt` returns the 404 page). |
| sitemap.xml | About 280 URLs with `lastmod`. |

## The crawlers that matter

| Token | Operator | Purpose | Recommendation |
|---|---|---|---|
| `OAI-SearchBot` | OpenAI | Builds the ChatGPT search index that answers cite from | Allow |
| `ChatGPT-User` | OpenAI | Fetches a page when a user asks ChatGPT about it | Allow |
| `GPTBot` | OpenAI | Model training | Business decision; allowed today |
| `Claude-SearchBot` | Anthropic | Search index for Claude's answers | Allow |
| `Claude-User` | Anthropic | Fetches a page for a user's request | Allow |
| `ClaudeBot` | Anthropic | Model training | Business decision; allowed today |
| `PerplexityBot` | Perplexity | Perplexity search index | Allow |
| `Perplexity-User` | Perplexity | User-initiated fetches | Allow |
| `Googlebot` | Google | Search and AI Overviews (AI Overviews use the regular Search index) | Allow |
| `Google-Extended` | Google | Control token for Gemini training and grounding. Does not affect Search or AI Overviews. | Business decision |
| `Bingbot` | Microsoft | Bing index, which also feeds Copilot and parts of ChatGPT search | Allow |
| `Applebot-Extended` | Apple | Control token for Apple model training | Business decision |
| `CCBot` | Common Crawl | Open crawl used in many training sets | Business decision |

Blocking a search or user-fetch crawler removes the site from that engine's answers. Blocking a training crawler does not; it only opts the content out of future training. NativeCode Audit scores robots.txt the same way: search and live-fetch crawlers count, training crawlers are reported but not scored.

## Recommended robots.txt

Everything is allowed today, so nothing is broken. Writing the policy out explicitly documents intent and survives a future blanket `Disallow`. In Webflow: Site settings > SEO > Indexing > robots.txt, then publish.

```
# Search and answer engines: allowed
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: Claude-SearchBot
User-agent: Claude-User
User-agent: PerplexityBot
User-agent: Perplexity-User
Allow: /

# Training crawlers: allowed (change to Disallow: / to opt out)
User-agent: GPTBot
User-agent: ClaudeBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /

User-agent: *
Allow: /
Disallow: /lp/thank-you

Sitemap: https://www.nativecode.ai/sitemap.xml
```

## Serving llms.txt and the Markdown mirror

1. **llms.txt at the domain root.** Webflow serves one uploaded llms.txt from the root of the custom domain: Site settings > SEO > LLMs.txt > Upload file (UTF-8, under 100 KB), then publish. Use the file the pipeline publishes at https://nativecodeai.github.io/nativecode-geo/llms.txt. Webflow's API for this file is Enterprise only, so re-upload by hand after big content changes (the pipeline rebuilds the file every Monday).
2. **llms-full.txt and the Markdown copy of each page** live on GitHub Pages, because Webflow cannot serve arbitrary files. llms.txt links to them. To put them on the brand domain, add a CNAME such as `ai.nativecode.ai` at GoDaddy pointing to `nativecodeai.github.io`, set it as the Pages custom domain, and rebuild with `--mirror-base https://ai.nativecode.ai`.
3. **Discovery hint.** Add to the site-wide `<head>` in Webflow (Site settings > Custom code):
   ```html
   <link rel="alternate" type="text/markdown" href="https://nativecodeai.github.io/nativecode-geo/llms-full.txt" title="Full site content for LLMs">
   ```

## If DNS moves to Cloudflare

Cloudflare can block AI crawlers at the edge regardless of robots.txt (Security > Bots, and the AI Crawl Control settings), and these controls may be switched on for newly added zones. If nativecode.ai ever moves its DNS to Cloudflare, check those settings first: an edge block is invisible in robots.txt and NativeCode Audit's robots check would not catch it. Cloudflare would also make it possible to serve the Markdown mirror at `nativecode.ai/<path>.md` with a Worker in front of Webflow.
