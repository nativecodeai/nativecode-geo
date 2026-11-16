---
title: "What Is EDI? A Guide for Shopify Stores"
url: https://www.nativecode.ai/post/what-is-edi-guide-for-shopify-stores
description: "EDI explained for Shopify stores: the six documents that move an order, how files travel, where Shopify fits, and how to tell if you need it."
last_modified: 2026-11-02T01:51:38.308Z
converted_at: 2026-11-16T19:40:26.827Z
---

[← All insights](https://www.nativecode.ai/blog)

[

Ecommerce Operations

](https://www.nativecode.ai/blog-categories/ecommerce-operations)

# What Is EDI? A Plain-English Guide for Shopify Stores

Chris I

October 30, 2026

**EDI (electronic data interchange) is a set of standard business documents that lets your store and your suppliers exchange inventory levels, purchase orders, shipping notices and invoices automatically, with no one retyping anything.** For a Shopify store that sells products it does not stock itself, EDI is what keeps the storefront honest: products show as available only when a supplier can ship them, orders reach the right supplier automatically, and tracking numbers flow back to customers on their own.

This guide explains what EDI is in plain terms, which documents matter for an online store, how an order moves from checkout to delivery, how the files travel, and how to tell whether your store needs it yet. It draws on the supplier connections we built for [Spooky Costumes](https://www.nativecode.ai/spooky-costumes-case-study) and [ThirdLust](https://www.nativecode.ai/thirdlust-case-study), two Shopify stores with catalogs of more than 8,000 and 11,000 products.

## What is EDI?

EDI is a shared language for business documents. Instead of a supplier emailing a PDF invoice or a spreadsheet of stock levels, both sides send structured files in an agreed format that software can read without a person in the loop.

In North America the dominant format is [X12](https://ecommerce.x12.org/industry/supply-chain), a standard chartered by ANSI and maintained for more than 40 years. X12 defines "transaction sets", each one a document type with a three-digit number. The 850 is a purchase order, the 856 is a ship notice, and so on. Outside North America the equivalent standard is EDIFACT, which uses names instead of numbers but does the same job.

The key idea is that each document has a fixed structure. A purchase order always carries the same kinds of fields in the same places: who is buying, what, how many, at what price and where to ship it. That predictability is what lets a store and a supplier automate the whole order cycle, even when they run completely different systems.

## Why would a Shopify store need EDI?

Most stores never need EDI. Three business models almost always do.

- **Dropship and large supplier catalogs.** If several suppliers hold your stock and ship directly to customers, every order has to reach the right supplier, and every stock change has to reach your store. Doing that by email and spreadsheet gets harder to keep accurate as the catalog grows.
- **Selling to big retailers.** Large retailers and marketplaces trade with suppliers over EDI. If you want to sell through them, you will be asked to send and receive their documents.
- **Buying from established distributors.** Many wholesale and distribution businesses only take orders over EDI, or charge for manual ones.

Spooky Costumes is an example of the first model. Its catalog runs to more than 8,000 products, and we built EDI connections to its suppliers for inventory and order routing, so stock levels and orders move between the store and each supplier without manual entry.

## The documents that move an online order

X12 lists more than 50 transaction sets used in the supply chain, but an online store typically needs only six. The table shows each one, who sends it, and what it does for the store.

| Document | Sent by | What it does |
| --- | --- | --- |
| 846 Inventory Inquiry/Advice | Supplier | Reports how many units of each item the supplier can ship. Your store uses it to update available quantities. |
| 850 Purchase Order | Store | Tells the supplier what to ship, to whom, at what cost. One customer order can become several POs if items sit with different suppliers. |
| 855 Purchase Order Acknowledgment | Supplier | Confirms the supplier accepted the order, or flags items it cannot fill. |
| 856 Ship Notice/Manifest | Supplier | Says what shipped, in which package, with which carrier and tracking number. Often called the ASN. |
| 810 Invoice | Supplier | Bills the store for what shipped, so costs can be matched to orders. |
| 997 Functional Acknowledgment | Both | A receipt that confirms a document arrived and could be read. It does not mean the order was accepted. |

Marketplaces with dropship programs use the same set. Amazon's Direct Fulfillment program, for example, is listed with the [846, 850, 855, 856 and 810](https://www.stacksync.com/edi/amazon/amazon-dropship-direct-fulfillment/x12-846-inventory-inquiry-advice). Each trading partner publishes its own implementation guide, which says which version, fields and rules it expects, so the same document number can still need different mapping for each supplier.

## How an order flows from checkout to delivery

Here is the full cycle for one dropship order, with the document that carries each step.

1. **Stock arrives.** Each supplier sends an 846 on an agreed schedule. Your store updates the available quantity for every mapped SKU, so products sell out when the supplier sells out.
2. **A customer checks out.** The order lands in Shopify as usual.
3. **The order is split and routed.** The integration groups the order lines by supplier and sends each supplier an 850 for its share, with the customer's shipping address.
4. **The supplier confirms.** A 997 comes back to say the file arrived. An 855 follows to accept the order or to reject or backorder specific lines.
5. **The supplier ships.** An 856 arrives with carrier and tracking details. The integration creates a fulfillment in Shopify, which sends the customer their shipping email.
6. **The supplier bills.** An 810 arrives. The integration matches it to the purchase order and the shipment, so finance only reviews the mismatches.

When this runs well, nobody on your team touches a routine order. People only step in when something does not match: a rejected line, a late shipment, an invoice for the wrong quantity.

## How the files travel: AS2, VAN, SFTP or a provider

The documents are the language. The transport is how they get from one system to the other. Walmart's supplier documentation describes the [four common options](https://developer.walmart.com/suppliers/docs/edi-connection-types) well, and most trading partners offer some mix of them.

| Connection | How it works | Best for |
| --- | --- | --- |
| AS2 | A direct, point-to-point connection. Files are encrypted and signed with digital certificates, and each side gets a delivery receipt. | High-volume partners who want a direct, secure link |
| VAN (value-added network) | A third-party network that acts as a mailbox between partners and passes documents along. | Partners who already route everything through a VAN |
| SFTP | Both sides drop and collect files on a secure server. | Smaller suppliers and simpler setups |
| Solution provider | An EDI platform handles the connection and translation for you, and exchanges data with your store through an API. | Stores that want one connection point for many suppliers |

You rarely get to pick freely. Large partners often require a specific method, and your setup has to support whatever each supplier uses.

## EDI, APIs and CSV feeds: which one when

EDI is not the only way to connect a store to a supplier. Many smaller suppliers offer a CSV inventory file or a modern API instead, and that is fine. What matters is that every supplier's data ends up in the same shape inside your store.

| Method | Strengths | Weaknesses |
| --- | --- | --- |
| X12 EDI | Standard documents, required by large retailers and distributors, built for high volume | Each partner has its own rules, setup takes testing, needs translation for Shopify |
| Supplier API | Real-time, flexible, easy to read | Every supplier's API is different, so each one is its own build |
| CSV or spreadsheet feed | Easy for any supplier to produce | No standard layout, easy to break, usually only covers inventory |

In practice, most stores with many suppliers end up with a mix. Whatever the mix, the goal is the same: every supplier's data is translated into the same inventory, order and fulfillment updates in the store.

## Where Shopify fits

Shopify does not read or write X12 documents itself. It works through its Admin API, which handles inventory levels, orders and fulfillments. An EDI integration sits between the two and translates in both directions.

- An incoming 846 becomes inventory level updates on the matching Shopify variants.
- A new Shopify order becomes one 850 per supplier.
- An incoming 856 becomes a fulfillment with carrier and tracking number attached.
- An incoming 810 is matched against the order and shipment records for reconciliation.

That layer can be an EDI app, a third-party EDI platform, or a custom integration. The right choice depends on how many suppliers you have, which connection methods they require, and how much control you need over routing rules. The constant across all of them is SKU mapping: every supplier item number has to map cleanly to a product variant in your store, or nothing else works.

## What usually goes wrong

EDI fails quietly. A document that does not process rarely causes an error a customer sees right away. It shows up later as an oversell, a missing tracking number or a billing dispute. These are the problems we check for first.

- **SKU mismatches.** A supplier renames or retires an item number and its stock stops updating. The product keeps selling on a quantity that is no longer true.
- **Old data overwriting new data.** If an older inventory file is processed after a newer one, stock goes backwards. Each update needs a timestamp check.
- **On-hand versus available.** Suppliers report different quantity types. Selling against on-hand stock that is already reserved for other retailers causes oversells.
- **Partial shipments and backorders.** One order can ship in several packages, or have lines that never ship. The integration has to handle each case and tell the customer correctly.
- **Cancellations.** A customer cancels after the purchase order went out. Each supplier handles cancellation differently, and some need a phone call.
- **Silent failures.** A 997 says a file arrived, not that the order is fine. Without monitoring for missing 855s and late 856s, problems sit unnoticed for days.

## How do you know if your store needs EDI?

You probably need EDI, or at least an automated supplier integration, if two or more of these are true.

- More than one supplier ships directly to your customers.
- Your catalog has thousands of SKUs that you do not physically stock.
- Someone on your team updates inventory or forwards orders by hand every day.
- You have sold items a supplier could not ship.
- Customers ask where their order is because tracking was never entered.
- A retailer, marketplace or distributor has asked you to trade over EDI.

If only one is true, a simpler feed or app may be enough for now. The aim is not to adopt EDI for its own sake. It is to stop selling stock you do not have and stop paying people to move data between systems.

## How we build supplier connections

Our [EDI and ecommerce operations](https://www.nativecode.ai/services/edi-integration) work follows four steps, and we go live one supplier at a time.

1. **Map.** Document every supplier, the formats and connection methods they accept, their implementation guides, and how orders move today.
2. **Connect.** Build the EDI, API or feed connection for each supplier and map its item numbers and fields to your store.
3. **Test.** Run test orders end to end with each supplier, including rejections, partial shipments and cancellations, before live orders flow.
4. **Run.** Go live supplier by supplier, with monitoring for failed documents, stock mismatches and late shipments, and a clear owner for each exception.

Because supplier data also drives product titles, attributes and collections, we tie the integration to the store's [Shopify architecture](https://www.nativecode.ai/services/shopify-seo), so new supplier products arrive ready to rank as well as ready to sell.

## Frequently asked questions

### What does EDI stand for?

EDI stands for electronic data interchange. It is the exchange of standard business documents, such as purchase orders, inventory updates, ship notices and invoices, between two company systems without anyone retyping them. Most US retail and ecommerce EDI uses the X12 standard, where each document has a number, such as the 850 purchase order or the 846 inventory update.

### Does Shopify support EDI?

Shopify does not process EDI documents natively. Stores connect to suppliers through an EDI app, a third-party EDI platform or a custom integration. The integration translates incoming EDI documents into Shopify inventory, order and fulfillment updates through the Shopify Admin API, and turns Shopify orders into purchase orders the supplier system can read.

### What is the difference between an 855 and a 997?

A 997 Functional Acknowledgment only confirms that a document arrived and could be read. An 855 Purchase Order Acknowledgment confirms whether the supplier accepted the order, and can reject or backorder individual lines. A store needs both to know an order is really on its way.

### Is EDI the same as an API?

No. EDI uses standard document formats, such as X12, that many companies share, usually sent as files in batches. An API is a direct software connection defined by one company, usually in real time. Many stores use both, depending on what each supplier offers.

## Where to start

List every supplier that ships to your customers, how each one sends you stock levels today, and how orders reach them. That one page usually shows exactly where orders and inventory are being moved by hand, and which suppliers to connect first.

If you want help mapping it, [talk to us](https://www.nativecode.ai/company/contact). We will review your suppliers and order flow and tell you plainly whether you need EDI, a simpler feed, or nothing yet.

Related reading: [how to scale ecommerce categories without losing SEO](https://www.nativecode.ai/post/scaling-categories-without-killing-search-performance).

Work with NativeCode

## Want this applied to your site?

We run SEO, AI search, web, paid media, email and creative programs for growing and enterprise brands.

[Start a project](https://www.nativecode.ai/company/contact) [More insights](https://www.nativecode.ai/blog)
