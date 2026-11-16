---
title: "Robots.txt and AI Crawlers: 2026 Reference"
url: https://www.nativecode.ai/post/robots-txt-and-the-ai-crawlers
description: "AI crawlers fall into training, search and user-triggered families. A user-agent reference, four robots.txt templates and how to verify access."
last_modified: 2026-11-02T03:45:34.325Z
converted_at: 2026-11-16T19:40:26.827Z
---

[← All insights](https://www.nativecode.ai/blog)

[

AI Search & AEO

](https://www.nativecode.ai/blog-categories/ai-search-aeo)

# Robots.txt and the AI Crawlers

Chris I

August 31, 2026

**AI crawlers fall into three families (training, search and user-triggered), and blocking one does not do the job of blocking another.** The single most consequential misconception in this area is that opting out of model training also removes you from AI answers. It does not, and the reverse mistake is more expensive: blocking a search crawler removes you from citation entirely while leaving your content in training data already collected.

This is a reference for deciding which agents to allow, with the configurations and the verification method.

## What are the three families of AI crawlers?

### Training crawlers

These collect content that may be used to develop future models. They crawl in bulk and are not time-sensitive. The main agents are `GPTBot` (OpenAI), `ClaudeBot` (Anthropic), `CCBot` (Common Crawl), `Google-Extended`, and `Applebot-Extended`.

Blocking these keeps your content out of future training corpora. It does not remove you from live AI answers, because those are served by different agents.

### Search crawlers

These build and refresh the indexes that answer engines query in real time. The main agents are `OAI-SearchBot` (ChatGPT search), `Claude-SearchBot`, and `PerplexityBot`.

This is the family that determines citation eligibility. Blocking these removes your content from AI answers.

### User-triggered fetchers

These fetch a specific page because a person asked an assistant to read it. The main agents are `ChatGPT-User`, `Claude-User`, and `Perplexity-User`.

Blocking these means a user who explicitly asks an assistant to summarise your page gets nothing back. For most businesses that is a poor trade, since the request originated with a real person interested in your content.

## The reference table

| User agent | Operator | Family | Effect of blocking |
| --- | --- | --- | --- |
| `GPTBot` | OpenAI | Training | Excluded from future training data |
| `OAI-SearchBot` | OpenAI | Search | Removed from ChatGPT search results |
| `ChatGPT-User` | OpenAI | User-triggered | Users cannot have your page read |
| `ClaudeBot` | Anthropic | Training | Excluded from future training data |
| `Claude-SearchBot` | Anthropic | Search | Removed from Claude search results |
| `Claude-User` | Anthropic | User-triggered | Users cannot have your page read |
| `PerplexityBot` | Perplexity | Search | Removed from Perplexity answers |
| `Google-Extended` | Google | Training / grounding | Opted out of Gemini training. Does *not* affect Google Search ranking |
| `Applebot-Extended` | Apple | Training | Excluded from Apple generative training |
| `CCBot` | Common Crawl | Training | Excluded from the Common Crawl corpus |
| `Bytespider` | ByteDance | Training | Has a documented history of ignoring robots.txt |

The `Google-Extended` row deserves emphasis, because it is the most commonly misunderstood directive here. It governs Gemini training and grounding only. Traditional Google Search crawling, indexing, and ranking are handled by `Googlebot` and are entirely unaffected.

## Four configurations

**Maximum visibility.** Allow everything. Appropriate for most businesses whose content is marketing rather than a product.

```
User-agent: *
Allow: /
```

**Citation without training.** The most common posture among publishers. Opts out of model development while staying eligible to be quoted.

```
User-agent: GPTBot
Disallow: /
User-agent: ClaudeBot
Disallow: /
User-agent: CCBot
Disallow: /
User-agent: Google-Extended
Disallow: /

User-agent: OAI-SearchBot
Allow: /
User-agent: Claude-SearchBot
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: Claude-User
Allow: /
```

**Selective paths.** Allow crawling but protect specific areas.

```
User-agent: GPTBot
Allow: /
Disallow: /admin/
Disallow: /account/
Disallow: /checkout/
```

**Full opt-out.** Defensible where content is the product: paid research, licensed data. Understand that it forfeits AI discovery entirely.

## What can robots.txt not do?

Three limits worth being clear about, because the file is routinely treated as something stronger than it is.

**Compliance is voluntary.** Robots.txt is a request. The major operators publish their agents and generally honour it, but the file has no enforcement mechanism. Agents with documented non-compliance histories, such as `Bytespider`, require server-level or WAF rules.

**User agents can be spoofed.** Anything can claim to be `GPTBot`. For verification, check the requesting IP against the operator's published ranges rather than trusting the string.

**It is not access control.** A disallowed URL remains publicly reachable. Anything that genuinely must not be public needs authentication, not a directive.

## How do you verify which AI crawlers visit your site?

Write rules for the crawlers that reach your site, not the ones in a template. Check your access logs first:

```
grep -oiE "GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|Claude-User|PerplexityBot|CCBot|Google-Extended|Bytespider" access.log | sort | uniq -c | sort -rn
```

Then confirm your file does what you think. Fetch it as each agent and read the response rather than assuming the CMS or CDN has not injected defaults: platform-level blocking of AI crawlers is common and frequently unintentional.

Set a quarterly review. Operators launch new agents and occasionally rename existing ones, and a robots.txt written eighteen months ago is likely addressing a landscape that has moved.

## Frequently asked questions

### Does blocking Google-Extended hurt my Google rankings?

No. Google-Extended only controls whether your content is used for Gemini training and grounding. Classic Search crawling and ranking are handled by Googlebot, which is a separate agent governed by separate rules. Blocking Google-Extended does not change how Googlebot crawls or ranks your pages.

### Can I block AI training but still appear in AI answers?

Yes. Disallow the training agents, such as GPTBot, ClaudeBot, CCBot and Google-Extended, while allowing the search agents, such as OAI-SearchBot, Claude-SearchBot and PerplexityBot. This split is the main reason the difference between training, search and user-triggered crawlers matters for anyone who wants AI citations.

### Do AI crawlers actually obey robots.txt?

The major documented AI crawler operators generally obey robots.txt, and you can confirm it in your own server logs. Compliance is voluntary rather than enforced, some agents have documented histories of ignoring directives, and user agent strings can be spoofed. Treat the file as a norm that reputable crawlers follow, not as a guarantee.

### Should I block AI crawlers to protect my content?

It depends on whether your content is marketing or product. If it exists to attract customers, blocking AI crawlers removes you from a growing discovery channel. If the content itself is what you sell, blocking is defensible. Either way, it should be a deliberate decision rather than a default inherited from a template or plugin.

## Where to start

Fetch your own robots.txt and read it. A surprising number of sites are blocking AI crawlers because a platform default, security plugin, or CDN rule added directives nobody reviewed, and the site owner discovers it while investigating why they never appear in AI answers.

Our [free SEO, AEO and GEO audit](https://app.nativecode.ai/) scores crawlability and AI search readiness, a quick first check on whether your directives are getting in the way. For a full crawl-access review across a large or multi-domain estate, that is a [strategy session](https://www.nativecode.ai/company/contact).

Related reading: our guide on [what llms.txt is and whether you need one](https://www.nativecode.ai/post/llms-txt-what-it-is-and-whether-you-need-one), and how our [AI search optimization and AEO services](https://www.nativecode.ai/services/ai-seo) put this into practice.

Work with NativeCode

## Want this applied to your site?

We run SEO, AI search, web, paid media, email and creative programs for growing and enterprise brands.

[Start a project](https://www.nativecode.ai/company/contact) [More insights](https://www.nativecode.ai/blog)
