# Agentic DOM audit

14 pages audited. Average agent-readiness score: **97/100**.

Scores start at 100 and lose 12 points per error, 5 per warning, and 1 to 8 per axe-core WCAG violation by impact. Findings come from Chromium's accessibility tree (the tree DOM-based agents and screen readers read) and from DOM checks aimed at agents that click from screenshots.

| Page | Score | main | h1 | Unnamed controls | axe rules |
|---|---|---|---|---|---|
| / | 95 | 1 | 1 | 0 of 179 | 1 |
| /digital-marketing-services | 100 | 1 | 1 | 0 of 149 | 0 |
| /services/seo | 95 | 1 | 1 | 0 of 138 | 1 |
| /services/ai-seo | 95 | 1 | 1 | 0 of 110 | 1 |
| /industries/saas-seo | 95 | 1 | 1 | 0 of 107 | 1 |
| /locations/atlanta-seo-agency | 95 | 1 | 1 | 0 of 117 | 1 |
| /local-seo/georgia-seo-company | 95 | 1 | 1 | 0 of 124 | 1 |
| /constant-contact-case-study | 95 | 1 | 1 | 0 of 89 | 1 |
| /blog | 95 | 1 | 1 | 0 of 107 | 1 |
| /post/how-to-measure-ai-visibility | 100 | 1 | 1 | 0 of 86 | 0 |
| /products/tdee | 100 | 1 | 1 | 0 of 104 | 0 |
| /company/about | 100 | 1 | 1 | 0 of 89 | 0 |
| /company/contact | 100 | 1 | 1 | 0 of 129 | 0 |
| /company/career | 100 | 1 | 1 | 0 of 89 | 0 |

## Site-wide issues

Issues that repeat across pages live in shared components and templates, so one fix in Webflow resolves them everywhere.

### Click targets smaller than 24x24 px (notice, 14 of 14 pages, 941 instances)

Visual agents click coordinates from screenshots. Small, tightly packed targets get mis-clicked (WCAG 2.5.8).

**Fix:** Give links and buttons at least 24x24 px of hit area with padding.

Examples:

- `<a.nf-contact> "(800) 618-6053" 210x23`
- `<a.nf-contact> "hello@nativecode.ai" 210x23`
- `<a.nf-link> "SEO services" 92x20`
- `<a.nf-link> "AI SEO" 48x20`
- `<a.nf-link> "Technical SEO" 99x20`

### No skip link (notice, 14 of 14 pages, 14 instances)

A skip link lets keyboard and agent users bypass repeated navigation in one step.

**Fix:** Add a visually hidden link to #main as the first element in the body, shown on focus.

Examples:

- `First focusable element is not a skip-to-content link`

### Same link name, different destinations (notice, 6 of 14 pages, 6 instances)

Two links with the same name that go to different places force an agent to guess.

**Fix:** Make the names distinct or add context with aria-label.

Examples:

- `"case study →" -> 4 destinations`

## axe-core WCAG 2.2 AA violations

| Rule | Impact | Pages | Elements |
|---|---|---|---|
| [color-contrast](https://dequeuniversity.com/rules/axe/4.14/color-contrast?application=playwright): Elements must meet minimum color contrast ratio thresholds | serious | 8 | 51 |

## Heading outlines

**/**

- h1 The digital marketing agency that turns search into revenue.
  - h2 What do you need to grow?
  - h2 See what is holding your growth back.
    - h3 Get your free audit
  - h2 What does a full-service digital marketing agency cover?
  - h2 How can you work with us?
    - h3 Growth program
    - h3 Projects
    - h3 Advisory
    - h3 How a program runs
    - h3 Is the audit really free?
    - h3 Who does the work?
    - h3 Do you work outside Atlanta?
    - h3 Can you work with our in-house team?
    - h3 How is pricing set?
  - h2 Why work with NativeCode?
    - h3 Senior people only
    - h3 Search is our core
    - h3 One plan, every channel
    - h3 Enterprise-ready
  - h2 Start with your industry or your market.
  - h2 Ads, films and content, made in house.
  - h2 Find out what to fix first.
    - h3 Get found on Google and in AI answers
    - h3 A website that turns visitors into leads

**/digital-marketing-services**

- h1 Digital marketing services, from search to sales.
  - h2 What digital marketing services does NativeCode offer?
    - h3 SEO and AI search
    - h3 Websites
    - h3 Shopify and ecommerce
    - h3 Paid media
    - h3 Email, data and growth
    - h3 Local SEO
  - h2 Programs we have run.
    - h3 Constant Contact
    - h3 HauteFlair
    - h3 Spooky Costumes
    - h3 ThirdLust
    - h3 What digital marketing services does NativeCode offer?
    - h3 Do I need more than one service?
    - h3 Do you work with businesses outside Atlanta?
    - h3 How do I choose where to start?
  - h2 Not sure which service you need?
  - h2 Digital marketing services: common questions

**/services/seo**

- h1 SEO services that turn search into revenue.
  - h2 What do our SEO services include?
  - h2 How does an SEO engagement work?
  - h2 Which SEO service do you need?
    - h3 How long does SEO take to work?
    - h3 What is the difference between SEO and AEO?
    - h3 Do you work with in-house teams and developers?
    - h3 How do you report on SEO results?
    - h3 Are you an Atlanta SEO company or a national agency?
  - h2 Related services
  - h2 Find out what to fix first.
  - h2 See what is holding your rankings back
    - h3 Technical SEO
    - h3 SEO architecture
    - h3 Content and topic clusters
    - h3 AI search and AEO
    - h3 Link building and digital PR
    - h3 Local, national and international SEO
    - h3 Technical SEO
    - h3 SEO audit
    - h3 SEO consulting
    - h3 Enterprise SEO
    - h3 Local SEO
    - h3 National SEO
    - h3 Multi-location SEO

**/services/ai-seo**

- h1 AI SEO services: visibility where the answers happen.
  - h2 How does AI search optimization work?
    - h3 AI visibility audit
    - h3 Entity optimization
    - h3 Structured data systems
    - h3 Answer-ready formats
    - h3 Authority programs
    - h3 Citation tracking
  - h2 How does an AI search program run?
    - h3 Audit
    - h3 Structure
    - h3 Format
    - h3 Track
    - h3 What is Answer Engine Optimization?
    - h3 How is AEO different from SEO?
    - h3 Can you prove this works?
    - h3 Do you work alongside existing SEO teams?
    - h3 How do you measure AI visibility?
  - h2 Works best with
  - h2 Find out what to fix first.
  - h2 See how AI answers describe your brand
  - h2 Trusted where search drives revenue.
    - h3 Constant Contact
    - h3 Online retailer with a large catalog
    - h3 Product page CRO

**/industries/saas-seo**

- h1 SaaS SEO and AEO for software companies.
  - h2 Why do SaaS buyers decide before talking to sales?
    - h3 Traffic that never converts
    - h3 Comparisons owned by others
    - h3 Docs left out
  - h2 Programs we have run.
    - h3 Constant Contact
    - h3 HauteFlair
    - h3 Spooky Costumes
    - h3 ThirdLust
  - h2 What does SaaS SEO include?
    - h3 Use-case and solution pages
    - h3 Comparison pages
    - h3 Integration pages
    - h3 Documentation SEO
    - h3 Template pages, done carefully
    - h3 Product-led content
  - h2 How does a SaaS product get onto AI shortlists?
    - h3 Category questions
    - h3 Consistent signals
    - h3 Developer assistants
    - h3 Prompt tracking
    - h3 What should a SaaS company publish first?
    - h3 Are comparison pages worth it?
    - h3 Should docs live on a subdomain?

**/locations/atlanta-seo-agency**

- h1 Atlanta SEO agency for local search and AI answers.
  - h2 How do Atlanta customers search for local businesses?
    - h3 Neighborhood searches
    - h3 Inside and outside the Perimeter
    - h3 Close competition
  - h2 What does NativeCode do for Atlanta businesses?
    - h3 Local SEO and AEO
    - h3 AI search
    - h3 Websites
    - h3 Ecommerce
    - h3 Paid media
    - h3 Email marketing
  - h2 Programs we have run.
    - h3 Constant Contact
    - h3 HauteFlair
    - h3 Spooky Costumes
    - h3 ThirdLust
    - h3 Is NativeCode based in Atlanta?
    - h3 How do I rank in Google Maps in Atlanta?
    - h3 Can you help us rank across the metro?
    - h3 What does local SEO cost in Atlanta?
  - h2 Other areas we serve
  - h2 Rank where Atlanta searches.
  - h2 Free SEO audit for Atlanta businesses
  - h2 Trusted where search drives revenue.

**/local-seo/georgia-seo-company**

- h1 Georgia SEO company for local businesses.
  - h2 How do Georgia customers search for local businesses?
    - h3 Metro Atlanta's many cities
    - h3 Augusta, Columbus and Chattanooga
    - h3 Coast and mountain tourism
  - h2 Everything that decides who ranks nearby.
    - h3 Google Business Profile
    - h3 Location and service area pages
    - h3 Reviews and citations
    - h3 AI local answers
    - h3 Local ads
    - h3 Reaching further
  - h2 Programs we have run.
    - h3 Constant Contact
    - h3 HauteFlair
    - h3 Spooky Costumes
    - h3 ThirdLust
  - h2 Explore Georgia and nearby
    - h3 CITIES IN METRO ATLANTA
    - h3 NEIGHBORING STATES
    - h3 Does NativeCode work with businesses in Georgia?
    - h3 Can an intown Atlanta business rank in Alpharetta or Marietta?
    - h3 Should Gwinnett businesses publish Spanish or Korean content?
    - h3 How do Savannah tourism businesses show up in AI answers?
  - h2 Work with an Atlanta agency on Georgia search.

**/constant-contact-case-study**

- h1 An SEO, AEO and GEO program for Constant Contact.
  - h2 Program results on request
  - h2 Keep exploring
  - h2 What did Constant Contact need?
  - h2 How is the program structured?
  - h2 How is each page built to be quoted?
  - h2 Growth programs
    - h3 Six products we build and run
    - h3 HauteFlair

**/blog**

- h1 Notes on search, AI answers and growth.
  - h2 The Klaviyo Flows Every Shopify Store Needs, in the Order to Build Them
  - h2 Google Ads Conversion Tracking Setup: GA4, Enhanced Conversions and Offline Leads
  - h2 What Is EDI? A Plain-English Guide for Shopify Stores
  - h2 How to Measure AI Visibility Without a Rank Tracker
  - h2 Wikipedia, Wikidata, and Entity Grounding
  - h2 llms.txt: What It Is, What It Isn't, and Whether You Need One
  - h2 Robots.txt and the AI Crawlers
  - h2 Schema Markup for AI Citation: Which Types Actually Matter
  - h2 Why Your FAQ Isn't Getting Quoted
  - h2 How to Structure a Page So an Answer Engine Can Quote It
  - h2 What Answer Engine Optimization Actually Is
  - h2 Prompt Methodology for AI Visibility Optimization: Complete Guide
  - h2 How AI Overviews Choose Sources: Signal Breakdown for AI Search Visibility
  - h2 AI Search vs Traditional SEO: The Complete Structural Breakdown
  - h2 The Evolution from SEO to AI Discovery Strategy
  - h2 The New Era of Digital Discovery: Growth Architecture and AI Search Visibility Explained
  - h2 Scaling Categories Without Killing Search Performance
  - h2 How AI Search Is Changing What “Ranking” Really Means
  - h2 Why Most Websites Stop Growing After Year One

**/post/how-to-measure-ai-visibility**

- h1 How to Measure AI Visibility Without a Rank Tracker
  - h2 Why doesn't rank tracking work for AI answers?
  - h2 How do you build a prompt panel?
  - h2 How should AI visibility be scored?
  - h2 The controls that make it valid
  - h2 What to report
  - h2 Three metrics that will mislead you
  - h2 Frequently asked questions
    - h3 Can I track AI visibility with a tool?
    - h3 How many prompts do I need?
    - h3 Why does the same prompt give different answers?
    - h3 What is a good citation rate?
  - h2 Where to start
  - h2 Want this applied to your site?

**/products/tdee**

- h1 TDEE.co One instrument for your whole energy plan.
  - h2 What TDEE.co is
  - h2 The elements a visitor actually uses
  - h2 8 tools, one engine
  - h2 The math, stated plainly
  - h2 Three readers, one page
    - h3 People starting a cut or a bulk
    - h3 Coaches and trainers
    - h3 Answer engines
  - h2 Why it can be cited
    - h3 Medically reviewed
    - h3 Evidence-based
    - h3 Honest about limits
  - h2 This is what AI-visible looks like.
  - h2 Questions about TDEE.co
  - h2 Related products
    - h3 The energy readout
    - h3 Goal table
    - h3 Suggested macros
    - h3 Accuracy band
    - h3 Estimate resting burn
    - h3 Scale by activity
    - h3 Refine with body fat
    - h3 Steer to a goal

**/company/about**

- h1 One senior team for search, web, creative and growth.
  - h2 How does NativeCode work?
    - h3 Senior-led
    - h3 One program
    - h3 An extension of your team
  - h2 What services does NativeCode offer?
    - h3 SEO and AI search
    - h3 Design and development
    - h3 Paid, email and CRO
    - h3 Creative and video
  - h2 Our products are our case studies.
    - h3 TDEE.co
    - h3 BraSize.ai
    - h3 SizeGuide.ai
    - h3 DueDateCalculator.ai
    - h3 PeriodCalculator.ai
    - h3 TimeCalculator.ai
  - h2 Where is NativeCode based?

**/company/contact**

- h1 Tell us what you need to grow.
  - h2 What happens after you contact us?
    - h3 We review your note
    - h3 Discovery call
    - h3 Written proposal
    - h3 Kickoff
  - h2 Built for the whole buying team.
    - h3 One plan, measured on revenue
    - h3 A store that ranks and converts
    - h3 Work inside your guardrails
    - h3 Clear terms, nothing hidden
  - h2 Programs we have run.
    - h3 Constant Contact
    - h3 HauteFlair
    - h3 Spooky Costumes
    - h3 ThirdLust
  - h2 Doing your homework first?
    - h3 How much does it cost to work with NativeCode?
    - h3 Do you work with companies outside Atlanta?
    - h3 What should I include in my message?
    - h3 Can you work inside our existing accounts?
    - h3 I am an existing client. Where do I go?
  - h2 Looking for someone specific?
    - h3 Digital marketing RFP template and scorecard
    - h3 AI search optimization checklist

**/company/career**

- h1 Careers at NativeCode: help us grow the agency.
  - h2 What is it like to work at NativeCode?
    - h3 Work that moves the business
    - h3 Clear scopes, fair rates
    - h3 Remote and async-friendly
  - h2 What roles are open?
    - h3 Are NativeCode jobs remote?
    - h3 Are these full-time jobs?
    - h3 How do I apply?
    - h3 What happens after I apply?
    - h3 What if none of the roles fit?
    - h3 Client Strategy Lead, Digital Marketing
    - h3 Business Development Manager, Digital Marketing
    - h3 Paid Media Specialist, Google, Meta and LinkedIn Ads
    - h3 Email Marketing and Klaviyo Specialist
    - h3 Technical SEO and AI Search Specialist
    - h3 Webflow and Shopify Developer
  - h2 Questions about working with NativeCode
