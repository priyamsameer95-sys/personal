# Search metadata and crawl implementation

Implemented 16 October 2026 with the installed SEO skill from AgriciDaniel/claude-seo. This pass changes metadata and machine-readable descriptions; it does not change the approved page layouts or add search-oriented filler.

## Findings and changes

| Finding | Implemented correction |
| --- | --- |
| Root metadata could infer the canonical host from a preview deployment. | Shared production-origin helper uses the reviewed `https://www.priyamsameer.com` address by default. Only an explicit valid HTTPS `NEXT_PUBLIC_SITE_URL` can override it. Local URLs, credentials and invalid configuration fall back to the reviewed address. |
| Primary pages lacked a consistent set of canonical, Open Graph and Twitter URLs. | Home, Work, Experience, Art, Writing, all 25 curated case studies and published CMS detail records have distinct titles/descriptions and absolute canonical/social URLs. Metadata uses the concise visible case name while source titles remain intact. |
| Search engines had no explicit website-name graph. | Root JSON-LD names the WebSite **Priyam Sameer**, connects it to the supported Person and LinkedIn profile, and states the current CashKaro role. Home and Experience identify their person profile. A site-name preference is a signal, not a guarantee of Google's displayed name. |
| Curated aliases and CMS UUID routes could describe duplicate content without a preferred destination. | Existing curated alias redirects remain intact and canonicalize to the retained case slug. Published CMS records prefer their stored slug in metadata, while existing UUID URLs remain usable. |
| Case studies and paintings had no structured distinction from deployed products. | CreativeWork describes the authored case account or painting. Case work status stays explicit, including MCP's proposal status. No SoftwareApplication/Product claims, model accuracy, reviews, ratings, new awards or unsupported dates are added. Breadcrumbs follow the actual page hierarchy. |
| There was no authored sitemap or robots route. | The sitemap includes four authored destinations and all 25 canonical cases. Published CMS art, writing and work records are added only when the publishing database is configured. Aliases, retired records, source archives, admin/API routes and the CV PDF stay out. Empty Writing is omitted. |
| Build time could be mistaken for a content edit. | Authored sitemap entries omit `lastmod`. CMS entries use a valid stored `updated_at` only; invalid dates are omitted. |
| Private and thin auxiliary destinations needed explicit treatment. | Robots excludes `/minforyam` and `/api/`; the existing admin layout retains noindex. Source-reference pages remain noindex/follow. Empty Writing is noindex/follow, but a transient database failure does not introduce a new noindex directive. PDF response headers are handled separately by the parent change. |
| CMS titles can contain characters significant inside script elements. | JSON-LD escapes `<` and Unicode line separators before rendering; a hostile script terminator remains data. |

## Verification

The SEO tests exercise canonical host selection, unique per-page metadata, rendered identity/case JSON-LD, all 25 canonical case routes and aliases, proposal classification, safe CMS serialization, real publication dates, empty/published Writing, sitemap deduplication, retired routes and publishing-database failure fallback. Existing content/route tests retain their substantive assertions; their manual page loaders now include the shared SEO helper.

No local publishing database is configured, so real production CMS rows have not been queried here; their behavior is covered with published-record fixtures. No Search Console access, URL Inspection result, Rich Results Test submission or real-user Core Web Vitals dataset is available. These changes do not establish rankings, indexing, an arbitrary SEO score or performance improvements. The parent task runs the final production build and published-response verification.

## Primary references

- Canonical URLs, redirects and sitemap signals should agree: [Google Search Central — canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls).
- Sitemap modification dates must reflect real content updates: [Google Search Central — build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- Robots restrictions are separate from indexing directives: [Google Search Central — introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro).
- Website naming is a supported preference, with eligibility and display controlled by Google: [Google Search Central — site names](https://developers.google.com/search/docs/appearance/site-names).
- The authored objects use [Schema.org WebSite](https://schema.org/WebSite), [CreativeWork](https://schema.org/CreativeWork), [ProfilePage](https://schema.org/ProfilePage) and [BreadcrumbList](https://schema.org/BreadcrumbList).
