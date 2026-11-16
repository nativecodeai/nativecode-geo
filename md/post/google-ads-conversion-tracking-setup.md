---
title: "Google Ads Conversion Tracking Setup Guide"
url: https://www.nativecode.ai/post/google-ads-conversion-tracking-setup
description: "How to set up Google Ads conversion tracking: what to count, the tag vs GA4 key events, enhanced conversions, and importing offline leads and sales."
last_modified: 2026-11-03T16:14:20.792Z
converted_at: 2026-11-16T19:40:26.827Z
---

[← All insights](https://www.nativecode.ai/blog)

[

Paid Media

](https://www.nativecode.ai/blog-categories/paid-media)

# Google Ads Conversion Tracking Setup: GA4, Enhanced Conversions and Offline Leads

Chris I

November 3, 2026

**Google Ads conversion tracking setup comes down to four jobs: decide which actions count as conversions, fire the Google Ads tag when those actions happen, turn on enhanced conversions so Google can still match people when cookies fail, and import the outcomes that happen after the form, such as qualified leads and closed sales.** Do all four before you spend, because Smart Bidding learns from whatever you tell it a conversion is. If you count the wrong thing, Google gets very good at buying more of the wrong thing.

This guide walks through each job in the order we set them up on a new account, including the checks we run before a campaign goes live. It is written for lead generation and ecommerce accounts that want reporting they can trust and bidding that optimizes for revenue, not form fills.

## Why set up conversion tracking before you spend?

Conversion tracking has to be in place before the first click, because Google Ads bidding strategies learn from the conversions you record from day one. Maximize Conversions, Target CPA and Target ROAS all read the same signal. With no signal, the system bids blind. With a bad signal, it optimizes toward the bad signal with real money.

There are three practical reasons to do it first:

- **Learning starts on the first click.** Every click without a recorded outcome is data the bidding model cannot use, and you cannot add it back later.
- **Reporting is only as good as the definition.** If a newsletter signup and a sales enquiry both count as a "conversion", your cost per conversion looks great while your sales team sees nothing.
- **Fixing tracking mid-campaign resets judgment.** When you change what counts as a primary conversion, past performance stops being comparable, and bidding has to relearn.

On our own site we wired up and tested the lead conversion, the hidden attribution fields and the exclusions for download forms before the first campaign was enabled, and that is the order this guide follows.

## What should count as a conversion?

A conversion should be an action that a real buyer takes on the way to paying you, counted the way your business actually earns from it. For a service business that is usually a qualified enquiry. For a store it is a purchase with its order value.

Google Ads lets you mark each conversion action as **primary** or **secondary**. Primary actions feed the Conversions column and bidding. Secondary actions are recorded for reporting only. Use that split on purpose.

| Action | Primary or secondary | Count setting | Value |
| --- | --- | --- | --- |
| Purchase (ecommerce) | Primary | Every | Order value, passed by the tag |
| Lead form submit (services) | Primary | One | A fixed value per lead, or none |
| Qualified lead or closed sale (imported) | Primary once volume allows | One | Expected or actual deal value |
| Phone calls from ads | Primary if calls are a main channel | One | Same as a form lead |
| Newsletter signup or guide download | Secondary | One | None |
| Imported GA4 key events | Secondary | Matches the GA4 setting | Matches GA4 |

Two settings matter more than they look. **Count** should be "One" for leads, so a person who submits the same form twice is counted once, and "Every" for purchases, since each order is real revenue. The **click-through window** should match how long your buyers take to decide. A short window undercounts slow B2B decisions, and a long one gives ads credit for sales they did not drive.

Content downloads deserve a special note. A checklist or template download is a useful signal of interest, but if it sits next to sales enquiries as a primary action, bidding will chase the cheaper download. Keep those actions secondary, or exclude them from your conversion tag entirely.

## Google Ads tag or GA4 key events: which should you use?

Use the Google Ads tag as your primary source of conversions and import GA4 key events only as secondary actions for comparison. The Google Ads tag supports enhanced conversions and view-through measurement, while imported GA4 key events do not, and the two systems attribute credit differently.

GA4 now calls its conversions "key events". You can import them into Google Ads, which is tempting because it means one setup instead of two. The trade-offs are worth knowing before you choose.

|  | Google Ads tag | Imported GA4 key events |
| --- | --- | --- |
| Enhanced conversions | Supported | Not supported |
| Attribution | Google Ads clicks and views | GA4's own model, across paid and organic by default |
| Best use | Primary actions for bidding | Secondary comparison and cross-channel reporting |
| Main risk | Firing on the wrong event | Different numbers from Google Ads, and double counting if both are primary |

The specialists at [Adswerve](https://adswerve.com/blog/google-ads-ga4-conversions-best-practices-recommendations) recommend the same split: Google Ads conversion tags as the primary method, GA4 key events as a supplemental view. The one mistake to avoid is setting the same real-world action as primary in both systems. If a form submit is tracked by the Google Ads tag and also imported from GA4, and both are primary, every lead counts twice and bidding overvalues every click.

GA4 still earns its place. It shows what visitors did before and after the ad click, how paid traffic compares with organic, and which landing pages convert. Set it up properly, link it to Google Ads, and use it to understand the numbers rather than to drive the bids.

## How do you install the Google Ads conversion tag?

Install the Google tag on every page, then fire a conversion event only at the moment the conversion is confirmed: on the thank-you page, or when the form's success message appears. Never fire it on a button click, because clicks also happen when a form fails validation.

1. **Create the conversion action in Google Ads.** Go to Goals, then Conversions, and create a website conversion. Name it for what it measures, such as "Lead form submit", set the category, count, value and windows, and choose primary.
2. **Install the Google tag site-wide.** Add it in your site's head code, or deploy it through Google Tag Manager. If you use Tag Manager, add a Conversion Linker tag on all pages so click identifiers are stored correctly.
3. **Fire the event at the confirmed moment.** If the form redirects to a thank-you page, fire on that page only. If the form shows an inline success message, fire when that message becomes visible. On Webflow, for example, that is when the form's success block is displayed.
4. **Exclude what should not count.** If several forms share the same success behavior, filter by form name so newsletter and download forms do not trigger the lead conversion.
5. **Capture attribution with the lead.** Add hidden fields for the GCLID and UTM parameters to every lead form, so each enquiry in your inbox or CRM carries the click that produced it. You need this for offline imports later.
6. **Test with a real submission.** Use Google Tag Assistant to confirm the tag fires once, with the right conversion label, and only after a successful submit. Then check that the conversion action status moves to recording.

Thank-you pages are the simplest option because the URL itself proves success. Make sure they are not indexed and not linked from navigation, or people will land on them without converting. If a visitor can refresh the page and fire the tag again, the "One" count setting stops that from inflating lead numbers.

## What are enhanced conversions, and do you need them?

Enhanced conversions send hashed details that a customer typed into your form, such as an email address or phone number, alongside the conversion, so Google can match it to a signed-in Google account when cookies are missing. You almost certainly want them, because they recover conversions that browsers and privacy settings would otherwise hide.

The data is hashed before it leaves the browser, and Google [matches it with Google account data inside a confidential computing environment](https://support.google.com/google-ads/answer/15713840?hl=en). You do not send raw personal data, and you must accept Google's customer data terms before the feature works.

The setup got simpler in 2026. Google merged enhanced conversions for web and enhanced conversions for leads into a [single on/off setting](https://support.google.com/google-ads/answer/16884284?hl=en), and Google Ads now accepts user-provided data from website tags, Data Manager and API connections at the same time. Accounts that had already accepted the customer data terms were migrated automatically, so check the setting rather than assuming.

To turn it on for a new account:

1. In Google Ads, open Goals, then Settings, and accept the customer data terms.
2. Turn on enhanced conversions at the account level, or on the specific conversion actions you want.
3. Make sure your form passes the email field to the Google tag, either automatically or by pointing the tag at the right field.
4. Check the enhanced conversions diagnostics a few days later to confirm matches are coming through.

One caution: enhanced conversions only help if the email or phone captured is the customer's real one. Validate the email field on your forms, and do not prefill it with placeholder text that looks like a value.

## How do you track leads that turn into sales offline?

Capture the click identifier with every lead, record what happens to that lead in your CRM, and send the outcome back to Google Ads as an offline conversion. That lets bidding learn from qualified leads and closed deals, not just form fills.

For service businesses this is where tracking stops being a vanity number. A campaign that produces ten leads with one real buyer and a campaign that produces five leads with three real buyers look backwards in Google Ads until outcomes are imported.

The rules that matter, from Google's [offline conversion import FAQ](https://support.google.com/google-ads/answer/10029210):

- Conversions with a GCLID can be uploaded up to 90 days after the click. Uploads that match on hashed customer data instead have a 63 day limit.
- A conversion cannot be dated before its click. If you see that error, check the time zone in your upload.
- Google recommends uploading at least daily, and waiting about six hours after a click before a scheduled upload, so the click has been processed.

How you upload has changed. Google now steers offline imports through **Data Manager**, which connects to common CRMs and spreadsheets without code, and the **Data Manager API** for custom systems. Starting June 15, 2026, [offline conversion and enhanced conversions for leads uploads moved to the Data Manager API](https://support.google.com/google-ads/answer/16884284?hl=en) and were blocked in the Google Ads API for anyone not already using it. If you are building a new integration, build it on Data Manager.

A simple stage model works for most lead-generation accounts:

| Stage | When it is recorded | Role in Google Ads |
| --- | --- | --- |
| Lead | Form submit or call, tracked by the tag | Primary at launch |
| Qualified lead | Your team confirms fit and budget | Primary once you record enough each month |
| Closed sale | Contract signed or invoice paid | Secondary, with value, for reporting |

Start with the form lead as primary, because new accounts rarely have enough qualified leads for bidding to learn from. Once qualified leads come in steadily, switch the primary goal to that stage. Bidding then stops rewarding cheap, low-intent enquiries.

## How do you check that tracking is working?

Submit a real test lead or order, confirm it appears once in Google Ads and once in your CRM, and then compare the two every week. Tracking breaks quietly when a form, theme or plugin changes, so a recurring check is the only real safeguard.

- **On launch day:** one test conversion from each landing page, checked in Tag Assistant and in the conversion action's status.
- **After a few days:** the enhanced conversions diagnostics show whether customer data is being received and matched.
- **Every week:** Google Ads conversions against the leads or orders your business actually received. Small gaps are normal because of attribution windows and consent. A sudden gap means something broke.
- **After any site change:** retest the forms. A redesigned form or a new success message is the most common way tracking stops without anyone noticing.

## Common conversion tracking mistakes

Most broken setups fail in one of a few predictable ways, and each one makes the account look better or worse than it really is.

- **Counting button clicks instead of confirmed submits.** Failed submissions and double clicks all become conversions.
- **Two primary actions for one event.** Usually a Google Ads tag and an imported GA4 key event for the same form, which doubles every lead.
- **Soft actions set as primary.** Page views, scroll depth or downloads teach bidding to buy curiosity.
- **No attribution fields on the form.** Without the GCLID and UTMs on the lead, you cannot import outcomes or trace a sale back to a keyword.
- **Ignoring phone calls.** If people call from your ads, add a call conversion with a minimum call length so short misdials do not count.
- **Spam leads counted as wins.** Add spam protection to forms, and exclude obvious junk before you import qualified stages.

## Frequently asked questions

### Do I need Google Tag Manager for Google Ads conversion tracking?

No. You can install the Google tag directly in your site's head code and fire conversion events from there. Tag Manager helps when several people manage tags, when you run many conversion actions, or when you want version history and testing. For a small site with one or two conversions, the direct Google tag is simpler and has fewer moving parts.

### Should I import GA4 key events into Google Ads?

Yes, as secondary actions. They are useful for comparing GA4's view of performance with Google Ads reporting. Keep the Google Ads tag as the primary source for bidding, because it supports enhanced conversions, and never set the same action as primary in both systems, or each conversion will be counted twice.

### What is a GCLID?

The GCLID, or Google click identifier, is a unique code Google Ads adds to your landing page URL when someone clicks an ad. Saving it in a hidden form field ties that lead to the exact click, campaign and keyword. It is what lets you upload offline outcomes, such as qualified leads or sales, back to Google Ads later.

### Are enhanced conversions safe for customer privacy?

The customer's details are hashed before they are sent, and Google matches them against signed-in account data in a confidential environment. You must accept Google's customer data terms and follow its policies, and you should state in your privacy policy that you share hashed data with advertising partners. Follow consent rules in every region you advertise in.

### How long until conversions show up in Google Ads?

Tag-based conversions usually appear within hours, though reports can lag. Offline imports appear after Google processes the upload, and a click may need several hours of processing before an upload can match it. That is why Google recommends uploading at least daily rather than waiting until the end of the month.

## Where to start

Write down the one action that best predicts revenue for your business, then check whether Google Ads is tracking that action, and only that action, as primary. That single check fixes more accounts than any bidding change.

If you want a second pair of eyes, we run [Google Ads management](https://www.nativecode.ai/services/google-ads-management) with tracking set up and tested before spend starts, and connect it to [GA4 and analytics](https://www.nativecode.ai/services/ga4-analytics) so paid and organic results can be compared honestly. You can also see how we approach [PPC management](https://www.nativecode.ai/services/ppc-management) across platforms. [Talk to us](https://www.nativecode.ai/company/contact) and we will review your current setup.

Related reading: [the Klaviyo flows every Shopify store needs](https://www.nativecode.ai/post/klaviyo-flows-shopify) and [how to measure AI visibility without a rank tracker](https://www.nativecode.ai/post/how-to-measure-ai-visibility).

Work with NativeCode

## Want this applied to your site?

We run SEO, AI search, web, paid media, email and creative programs for growing and enterprise brands.

[Start a project](https://www.nativecode.ai/company/contact) [More insights](https://www.nativecode.ai/blog)
