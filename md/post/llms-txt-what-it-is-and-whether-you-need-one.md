---
title: "llms.txt: What It Is and Do You Need One?"
url: https://www.nativecode.ai/post/llms-txt-what-it-is-and-whether-you-need-one
description: "No major AI provider has committed to reading llms.txt. What the file does, where it helps, who should ship it and how to test if anything reads it."
last_modified: 2026-11-02T03:45:34.325Z
converted_at: 2026-11-16T19:40:26.827Z
---

[← All insights](https://www.nativecode.ai/blog)

[

AI Search & AEO

](https://www.nativecode.ai/blog-categories/ai-search-aeo)

# llms.txt: What It Is, What It Isn't, and Whether You Need One

Chris I

August 31, 2026

**llms.txt is a community proposal for a markdown file at your site root that lists your most important content for AI systems. It is not a standard, no major AI provider has committed to using it, and the available data shows no measurable citation benefit.** It does real work in one place, developer tooling, and shipping it costs almost nothing. Those two facts together are the honest answer.

This piece takes the position the evidence supports rather than the one that would be convenient, including for us.

## What is llms.txt?

llms.txt is a plain markdown file served at `/llms.txt`. It contains a short description of your site and a curated list of links to your most valuable pages, optionally with one-line summaries.

The reasoning behind it is sound. Language models work within limited context windows, and HTML is noisy: navigation, scripts, styling, and boilerplate consume tokens that carry no meaning. A clean markdown index gives a system a direct route to your canonical content instead of making it parse a rendered page.

A companion format, `llms-full.txt`, contains full page content in one markdown document rather than links to it.

Note what this is not: llms.txt does not control access. It is the opposite of robots.txt: an invitation to specific content rather than a restriction. The two files do unrelated jobs and neither substitutes for the other.

## The format

```
# NativeCode

> Senior-led SEO, AEO, and GEO consultancy.

## Services

- [Search Architecture](https://www.nativecode.ai/services/search-architecture): Technical SEO and crawl governance
- [AI Discovery Systems](https://www.nativecode.ai/services/ai-discovery): Entity modelling and structured data

## Products

- [TDEE.co](https://tdee.co): Energy expenditure calculator

## Optional

- [Blog](https://www.nativecode.ai/blog): Articles on search and AI discovery
```

An H1 with the site name, a blockquote summary, H2 sections grouping links, and an optional section for lower-priority material. That is the whole specification.

## What the evidence shows

Three findings are worth knowing before you decide how much effort this deserves.

**Adoption is around one site in ten, and inversely related to citation.** An SE Ranking study of roughly 300,000 domains found an adoption rate near 10%. Among the fifty domains most frequently cited by AI systems, only one carried the file at all. Whatever is driving citation for the most-cited sites, it is not this.

**Crawlers barely request it.** A monitoring analysis by Limy.ai covering more than 500 million AI bot events across ninety days found only a few hundred requests to `/llms.txt`. The major agents (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) overwhelmingly fetch HTML instead.

**Google has declined it explicitly.** Gary Illyes has confirmed Google does not support llms.txt and has no plans to; John Mueller compared it to the keywords meta tag, noting that AI services have not said they use it and do not appear to request it in server logs. No major provider (OpenAI, Anthropic, Google, Meta) has publicly committed to reading or acting on the file in production.

The claim that adding llms.txt produces a near-term lift in AI citations is not supported. Anyone selling that outcome is ahead of the evidence.

## Where it genuinely works

The file does work reliably in one layer, and it is the layer the original proposal described: developer tooling.

AI coding assistants (Cursor, GitHub Copilot, Claude Code and similar tools) routinely fetch `/llms.txt` and `/llms-full.txt` when pointed at a documentation site. For a company whose product is used by developers, that is a real and immediate benefit: it determines whether an assistant reads your current documentation or reconstructs your API from memory.

If you ship developer documentation, llms.txt is worth maintaining properly. If you run a marketing site, the honest expectation is that almost nothing will read it today.

## Who should publish an llms.txt file?

| Site type | Recommendation | Why |
| --- | --- | --- |
| Developer docs / API | Yes, and maintain it | Coding assistants actively fetch it |
| Technical SaaS | Yes | Overlaps with the tooling use case |
| Marketing site | Optional, low priority | Cheap to add, no demonstrated benefit |
| Ecommerce | Skip for now | Product data belongs in feeds and schema |

## The one way to get it wrong

A common implementation generates a separate markdown copy of every page on the site. If those markdown files are indexable, you have created duplicate content at scale, diluting crawl budget and potentially suppressing the original pages.

If you generate per-page markdown, exclude it from indexing. The upside of the file is modest; the downside of duplicating an entire site is not.

## How can you test whether anything reads your llms.txt?

Do not guess. Two methods, both quick.

**Check your logs.** Filter for requests to `/llms.txt` and `/llms-full.txt` by known AI user agents. Most sites find single-digit hits over months.

```
grep -iE "llms(-full)?\.txt" access.log | grep -oiE "GPTBot|ClaudeBot|PerplexityBot|OAI-SearchBot|Google-Extended" | sort | uniq -c
```

**Plant a honeypot.** Include a unique URL inside the file that appears nowhere else on your site. Any request to that URL came from something that read llms.txt and followed a link: unambiguous evidence rather than inference.

## Frequently asked questions

### Is llms.txt an official standard?

No. llms.txt is a community proposal with no backing from the W3C, the IETF or any recognised standards body, and it has no enforcement mechanism. Each AI provider decides on its own terms whether to read the file, and so far no major provider has publicly committed to doing so.

### Does llms.txt improve AI citations?

The available evidence says no. An SE Ranking study across roughly 300,000 domains found no correlation between having the file and how often a site is cited, and only one of the fifty most-cited domains carried it. Crawl access, page structure and original content are the better places to spend time.

### Does Google use llms.txt?

No. Google has stated that it does not support the file and is not planning to, and its guidance on generative AI search lists it among unnecessary tactics. To appear in Google AI Overviews, focus on crawlable pages, clear structure and accurate structured data instead of an llms.txt file.

### Should I add llms.txt to my site anyway?

Yes, if you publish developer documentation, because coding assistants genuinely fetch it. For a marketing site it is a cheap, low-risk addition with no demonstrated benefit. Add it if you have spare capacity, but put crawl access, page structure and original content ahead of it, because those are what the evidence supports.

## Where to start

If you have limited hours this quarter, spend them on crawl access, answer structure, and original content before you spend one on this file. That ordering reflects what the evidence supports.

If you do want one, the file takes a few minutes to write by hand, and now you know exactly what to expect from it. To see how your site scores on crawlability and AI search readiness first, run our [free SEO, AEO and GEO audit](https://app.nativecode.ai/). For help prioritising across the whole retrieval path, that is a [strategy session](https://www.nativecode.ai/company/contact).

Related reading: our guide on [robots.txt and the AI crawlers](https://www.nativecode.ai/post/robots-txt-and-the-ai-crawlers), and how our [AI search optimization and AEO services](https://www.nativecode.ai/services/ai-seo) put this into practice.

Work with NativeCode

## Want this applied to your site?

We run SEO, AI search, web, paid media, email and creative programs for growing and enterprise brands.

[Start a project](https://www.nativecode.ai/company/contact) [More insights](https://www.nativecode.ai/blog)
