---
title: "Klaviyo Flows for Shopify: What to Build First"
url: https://www.nativecode.ai/post/klaviyo-flows-shopify
description: "The six Klaviyo flows every Shopify store needs, the exact trigger for each, the order to build them, and the filters that stop flows misfiring."
last_modified: 2026-11-03T16:14:20.781Z
converted_at: 2026-11-16T19:40:26.827Z
---

[← All insights](https://www.nativecode.ai/blog)

[

Email and Lifecycle

](https://www.nativecode.ai/blog-categories/email-marketing)

# The Klaviyo Flows Every Shopify Store Needs, in the Order to Build Them

Chris I

November 3, 2026

**Every Shopify store on Klaviyo needs six core flows: a welcome series, abandoned checkout, abandoned cart, browse abandonment, post-purchase and win-back. Build them in that order, then add back in stock and a sunset flow once your catalog and list call for them.** The order matters because each flow reaches people at a different distance from buying, and the ones closest to a purchase or a first impression pay back first.

This guide covers what each flow is for, the exact Klaviyo trigger it runs on, how many messages to start with, and the filters that stop flows from emailing the wrong people. It assumes Shopify is connected to Klaviyo and you have a signup form collecting subscribers.

## What is a Klaviyo flow?

A Klaviyo flow is an automated sequence of emails or text messages that starts when a shopper does something, joins a list or segment, or reaches a date. Unlike a campaign, which you send once to a list, a flow runs on its own for every person who meets its trigger.

Klaviyo flows use four kinds of triggers:

- **List:** someone joins a list, such as the newsletter list your signup form feeds.
- **Metric:** someone does something tracked as an event, such as Checkout Started or Placed Order.
- **Segment:** someone enters a segment, such as customers who have not ordered in 120 days.
- **Date:** a date on the profile arrives, such as a birthday or a subscription renewal.

Campaigns and flows do different jobs. Campaigns carry news, launches and sales to everyone at once. Flows meet each shopper at the moment their behavior says they are interested. A store that only sends campaigns misses the highest-intent moments, because those happen at a different time for every customer.

## Which flows does a Shopify store need?

A Shopify store needs flows for the six moments that come up for every shopper: first signup, an unfinished checkout, an abandoned cart, a product viewed without buying, a first order and a lapsed customer. The table lists each one with the Klaviyo event it runs on.

| Flow | Klaviyo trigger | Job | Messages to start |
| --- | --- | --- | --- |
| Welcome series | Added to your newsletter list | Turn a new subscriber into a first order | 3 |
| Abandoned checkout | Checkout Started | Recover buyers who reached checkout | 2 to 3 |
| Abandoned cart | Added to Cart | Bring back shoppers who added items but did not check out | 2 |
| Browse abandonment | Viewed Product | Follow up on a product someone looked at | 1 to 2 |
| Post-purchase | Placed Order | Set expectations, cut returns, earn the second order | 3 |
| Win-back | A lapsed customer segment, or Placed Order with a long delay | Reactivate past buyers before they forget you | 2 to 3 |
| Back in stock | Klaviyo back in stock subscription | Tell waiting shoppers an item returned | 1 |
| Sunset | Segment of long-unengaged subscribers | Protect deliverability by removing dead weight | 1 to 2 |

The metric names matter when you build. Klaviyo's [Shopify data reference](https://help.klaviyo.com/hc/en-us/articles/115005080447-Shopify-data-reference) lists the order events it syncs from Shopify, including Checkout Started, Placed Order, Ordered Product and Fulfilled Order, and the onsite events it tracks, including Active on Site, Viewed Product and Added to Cart. The onsite events only arrive if onsite tracking is set up and "Track behavioral events" is turned on in the Shopify integration settings. If your browse abandonment or cart flow has no one in it, check that setting first.

## In what order should you build Klaviyo flows?

Build the welcome series first, then abandoned checkout, abandoned cart, browse abandonment, post-purchase and win-back. That order starts with the people closest to a first purchase and moves outward to people who need more time.

1. **Welcome series.** Every new subscriber passes through it, and first impressions set whether they open anything you send later.
2. **Abandoned checkout.** These shoppers chose products and started paying. They are the highest-intent group you can email.
3. **Abandoned cart.** One step earlier than checkout, so more people and less intent.
4. **Browse abandonment.** Many more people and the least intent. Worth it once the first three are running well.
5. **Post-purchase.** It does not recover lost revenue, but it shapes reviews, returns and repeat orders.
6. **Win-back.** It needs order history before it has anyone to reach, so it naturally comes last for a newer store.

Resist building all six in one week with placeholder copy. A flow that runs with weak messages keeps running with weak messages, because nobody revisits automation that "works". Launch each one properly, check it after two weeks, then move to the next.

## What do you need in place before building flows?

Before the first flow goes live, connect Shopify with onsite tracking turned on, authenticate your sending domain, and make sure unsubscribes work in one click. Without those, flows either never trigger or land in spam.

- **Shopify integration with behavioral events.** As noted above, Viewed Product and Added to Cart depend on onsite tracking and the "Track behavioral events" setting.
- **Consent synced both ways.** Make sure email and SMS consent collected at Shopify checkout reaches Klaviyo, and that unsubscribes flow back.
- **A branded sending domain.** Send from your own domain with SPF, DKIM and DMARC records in place, not from a shared default.
- **Inbox provider rules.** Gmail's [sender guidelines](https://support.google.com/a/answer/14229414?hl=en) require anyone sending about 5,000 or more messages a day to Gmail accounts to authenticate with SPF, DKIM and DMARC, offer one-click unsubscribe on marketing mail, honor unsubscribes within 48 hours and keep the user-reported spam rate below 0.3%. Gmail recommends staying below 0.1%.

Shopify's own abandoned checkout email can also run alongside Klaviyo's. Decide which one sends, and turn the other off, so shoppers do not get two reminders for the same checkout.

## How to build each core flow

Each flow below has a clear job, a small number of messages, and filters that keep it focused on the people it is meant for. Start with these structures and adjust timing once you have a few weeks of results.

### Welcome series

The welcome series introduces the brand and earns the first order. A good starting structure is three emails over about a week. The first arrives right after signup and delivers whatever the form promised, whether that is a discount, a guide or early access. The second explains what makes the products different, using your best-selling categories and real reviews. The third gives a clear reason to order now. Add a flow filter so anyone who places an order leaves the series, and split the path if you collect a preference on the form, such as product category.

### Abandoned checkout

The abandoned checkout flow runs on Checkout Started. Send the first message within a few hours, while the decision is fresh, and show the exact items with images and a link back to the saved checkout. A second message a day later can answer the common objections for your store: shipping times, returns, sizing or payment options. Hold any discount for the last message, if you use one at all, so you do not train shoppers to abandon checkouts on purpose. Filter out anyone who has placed an order since the flow started.

### Abandoned cart

The abandoned cart flow runs on Added to Cart and catches people who never reached checkout. Because the same shopper can trigger both flows, add a filter so people who started a checkout leave the cart flow. Two messages are usually enough: a reminder of the items, then a nudge with social proof or a product benefit.

### Browse abandonment

Browse abandonment runs on Viewed Product and reaches the largest group with the lowest intent. Keep it to one or two messages and keep them light. Show the viewed product and two or three related items rather than pushing hard on one. Exclude anyone who added to cart or started checkout, and limit how often one person can enter the flow, so a shopper who browses daily does not get a daily email.

### Post-purchase

The post-purchase flow runs on Placed Order and should split first-time buyers from repeat customers. First-time buyers need reassurance: what happens next, when to expect delivery and how to get help. For products that need setup, sizing or care, a short how-to email reduces returns and support tickets. Later messages can ask for a review once the product has arrived, which Klaviyo can time from Fulfilled Order or Delivered Shipment when Shopify provides those events, and suggest a natural next product.

### Win-back

The win-back flow reaches customers who have not ordered in longer than your normal repurchase gap. Base that gap on your own order data, not a generic number: a consumables store and a furniture store have very different cycles. Lead with what is new since their last order, then give a reason to come back. If someone does not engage after the series, move them toward your sunset flow instead of emailing them forever.

## Which filters and settings stop flows from misfiring?

Flow filters, exclusions and Smart Sending decide who actually receives each message. Most embarrassing sends, such as a cart reminder to someone who already paid, come from a missing filter rather than bad copy.

- **Exit when they buy.** On welcome, cart, checkout and browse flows, add a filter for Placed Order zero times since starting the flow.
- **Stop overlap.** A shopper who views, adds to cart and starts checkout can qualify for three flows. Filter the browse and cart flows so the closest-to-purchase flow wins.
- **Limit re-entry.** Set how often one profile can enter browse and cart flows, so frequent browsers are not emailed every visit.
- **Use Smart Sending on purpose.** Klaviyo's [Smart Sending](https://help.klaviyo.com/hc/en-us/articles/115002779311) skips marketing messages to anyone emailed recently, with a default window of 16 hours for email and 24 hours for SMS. Messages marked as transactional are never skipped. Decide message by message: keep it on for browse abandonment, and consider turning it off for the first abandoned checkout message, where timing matters more.

## How do you measure whether flows are working?

Judge flows on placed orders and revenue per recipient, not on open rates. Apple Mail Privacy Protection loads images automatically for many recipients, so opens overstate real attention, while clicks and orders reflect what shoppers actually did.

Check three things every month. First, revenue per recipient for each flow, compared with the month before. Second, the unsubscribe and spam complaint rate on each message, because a single aggressive email can damage the whole program. Third, whether each flow still gets enough people entering it. A sudden drop in entries usually means a tracking or integration problem, not a change in shopper behavior.

Remember that Klaviyo credits an order to a flow when the order follows a message within the account's attribution window. Some of those orders would have happened anyway. When a flow is big enough, use Klaviyo's built-in A/B testing to compare versions, or hold out a small share of recipients, to see how much the flow really adds.

## Frequently asked questions

### How many emails should a Klaviyo welcome series have?

Three emails over about a week is a solid starting point: deliver what the signup promised, explain what makes the brand different, then give a clear reason to order. Add more only when you have something useful to say, such as category guides for a large catalog, and always remove people from the series once they place an order.

### What is the difference between abandoned cart and abandoned checkout in Klaviyo?

Abandoned checkout runs on the Checkout Started event from Shopify, so it reaches shoppers who began paying. Abandoned cart runs on the Added to Cart event from Klaviyo onsite tracking, so it reaches people who added items but never started checkout. Run both, with a filter so a shopper who started checkout only gets the checkout flow.

### Should my welcome series include a discount?

Only if a discount is part of your pricing strategy. A signup discount lifts first orders, but it also trains subscribers to wait for codes. Many stores do better with a smaller offer, free shipping, or a useful guide. Whatever you choose, the first email must deliver exactly what the signup form promised.

### Do flows and campaigns conflict in Klaviyo?

They can if both send on the same day. Smart Sending prevents some overlap by skipping marketing messages to people emailed recently. Plan big campaigns around high-volume flows, and exclude people currently in abandoned checkout from promotional sends, so a sale email does not undercut a recovery message.

## Where to start

Open Klaviyo and list which of the six core flows are live, when each was last edited, and whether Viewed Product and Added to Cart events are arriving. That list usually shows the gap worth fixing first.

If you want help building or rebuilding your flows, our [Klaviyo agency](https://www.nativecode.ai/services/klaviyo-agency) team sets up the integration, flows and filters for Shopify stores, as part of our wider [email marketing](https://www.nativecode.ai/services/email-marketing) work. [Talk to us](https://www.nativecode.ai/company/contact) and we will review your current flows.

Related reading: [how to set up Google Ads conversion tracking](https://www.nativecode.ai/post/google-ads-conversion-tracking-setup) and [what EDI is and when a Shopify store needs it](https://www.nativecode.ai/post/what-is-edi-guide-for-shopify-stores).

Work with NativeCode

## Want this applied to your site?

We run SEO, AI search, web, paid media, email and creative programs for growing and enterprise brands.

[Start a project](https://www.nativecode.ai/company/contact) [More insights](https://www.nativecode.ai/blog)
