export interface SitemapEntry {
  url: string;
  lastmod?: string;
}

export interface SectionRule {
  /** Heading in llms.txt, e.g. "Services". */
  title: string;
  /** Regex tested against the URL path. First matching section wins. */
  match: string;
  /** Put the section under "## Optional" (secondary content agents can skip). */
  optional?: boolean;
  /** Collapse the whole section into one summary line instead of listing every page. */
  collapse?: { label: string; url: string; description: string };
}

export interface SiteConfig {
  name: string;
  /** Canonical origin, e.g. https://www.nativecode.ai */
  origin: string;
  /** One-paragraph summary used as the llms.txt blockquote. */
  summary: string;
  /** Extra facts listed under the summary (location, contact, disambiguation). */
  facts: string[];
  sections: SectionRule[];
  /** Regexes for paths to leave out entirely (thank-you pages, ad landing pages, utility pages). */
  exclude: string[];
  /** CSS selectors removed before conversion (site chrome, forms, widgets). */
  stripSelectors: string[];
  /** Regexes (multiline) whose matches are removed from the converted Markdown, e.g. logo strips. */
  dropPatterns?: string[];
  /** Selector for the main content when the page has no <main>. */
  contentSelector?: string;
}

export interface PageDoc {
  url: string;
  path: string;
  lastmod?: string;
  title: string;
  description: string;
  h1: string;
  markdown: string;
  wordCount: number;
  section: string | null;
  optional: boolean;
  status: number;
  noindex: boolean;
}
