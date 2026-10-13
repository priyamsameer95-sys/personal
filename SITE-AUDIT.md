# Priyam portfolio: critical audit and implemented corrections

13 October 2026 · Baseline: `a0ede414`

The central problem was hierarchy. The site contained substantial evidence, but too much of it had the same prominence. Small metadata, repeated chart panels, boxed summaries, duplicate introductions and long open galleries made visitors work too hard to understand Priyam's responsibility. Adding more graphics everywhere had created another layer of reading rather than simplifying the story.

This review covers the public Home, Work, case-study collection, Experience, Writing, Art, shared navigation, image/video interactions, public recovery routes and relevant private-control compatibility. It uses the six supplied screenshots, source inspection, an independent visual review, fresh browser renders, content coverage checks and the existing security/content regression suite. It does not assign an invented numerical design score.

## The revised reading journey

1. **Home:** positioning, current responsibility and two useful actions; three qualified examples; career context; painting and personal interests; contact.
2. **Work:** choose a company or another explicitly labelled context, understand responsibility, select a short case summary and its source-labelled visual preview.
3. **Case:** challenge, decision and qualified impact; relevant visual evidence; an open five-part narrative; deeper decisions and supporting sources on demand.
4. **Experience:** current role, supported dates and promotions, visible project evidence, fuller responsibilities, education, recognition and certifications. The original CV remains a key action.
5. **Art:** actual paintings first, then original artist notes and close-ups. Original colours, compositions, dimensions and the three-panel Live-life grouping remain intact.
6. **Writing:** existing published essays where available, an honest empty collection when actually empty, and a distinct recovery state when articles cannot load.

## Findings and corrections

“Major” denotes a recurring obstacle to comprehension or a broken public experience. “Refinement” denotes a local problem that weakens clarity or polish. These are prioritisation labels, not claims about security severity.

| Area | Finding | Implemented correction | Verification |
| --- | --- | --- | --- |
| Major · site frame | Very broad white surroundings enclosed a much narrower column; the supplied wide captures made content feel miniature. | A bounded 1,560px paper frame, fluid content padding and responsive type replace the nested narrow presentation. Wide-screen surroundings are warm beige. | Browser layout checks at phone, tablet, desktop and wide sizes; actual wide viewport was capped by the browser at 4,096px. |
| Major · typography | Fine print and small controls carried material qualifications; primary/secondary text had little consistent distinction. | Shared cream, ink, muted and rule tokens; readable metadata and body type; stable text contrast. | At 320px Home, visible main text/actions were at least 14px; shared ink/cream contrast 16.72:1 and muted/cream 6.03:1. |
| Major · visual language | Repetitive boxes and rainbow process accents competed with the intended paper/colour theme. | Editorial rows, quiet rules and restrained chart accents. Colour comes from the peel, source media, paintings and original brands. | Fresh rendered review plus independent critique. |
| Major · Home proof | Three miniature dashboards repeated the case format and gave metrics more prominence than the work. | Three concise selected stories with readable, qualified measures and a single case action each. Charts remain within relevant cases. | Registry-backed values retained; comparison blocks share an aligned grid. |
| Refinement · Home rhythm | Metric baselines differed and the current-role line stranded “Growth”. | Intrinsic shared proof rows and more considered text wrapping. | All three metric top positions matched in the 1,920px render. |
| Major · navigation | Small-screen navigation/actions competed for width. | Explicit Menu control, readable wrapped navigation, persistent CV and contact actions, active-page state. | 320px render, keyboard opening, Escape dismissal and focus return. |
| Refinement · menu state | Selecting the current page could leave the menu open; Escape only worked inside navigation. | Every navigation action closes the menu; Escape works across the header. | Final production check: current Home link and brand link both close the menu and return focus to its control. |
| Major · Work scanning | Every item repeated role, workflow and measurement inside a heavy report-like box. | Borderless editorial rows: existing visual preview, work classification, short title, summary, personal role and one “Read case study” action. | All 25 study links rendered in coverage tests; company filters and incoming fragments checked. |
| Major · Work responsibility | Company scope was hidden before visitors could choose relevant evidence. | Business responsibility and the first context sentence are visible. Fuller original context remains in one named optional disclosure. | CashKaro, CredFlow and CEPT views inspected; non-employment contexts stay separate. |
| Refinement · Work thumbnails | A full EduLoans technical architecture was unreadable at teaser scale. | Existing simpler authored overview diagram used for selection; the original technical sheet remains in the case. | Source provenance preserved; no replacement screenshot invented. |
| Major · media attribution | Generic preview labels could make generated diagrams look historical; an illustration was headed “Product architecture”. | Reviewed provenance labels on previews and differentiated illustration, technical diagram, current reference, proposal and generated walkthrough headings. | Systematic source-label pass and rendered UrbanKhet review. |
| Major · case hierarchy | A giant “Full case study” disclosure concealed the main argument and duplicated the overview/results. | One short orientation; five story chapters open to read; longer paragraphs in individually named disclosures. Original brief/outcomes remain in a separate record. | Exact paragraph, bullet and table preservation assertions across every published study. |
| Major · case evidence | Large reference galleries could dominate the story and make the page exceptionally long. | Named decision/reference groups; two representative assets initially; remaining evidence in a labelled, keyboard-focusable bounded gallery. | Registry coverage plus direct chapter navigation and mobile expansion. |
| Refinement · portrait reference | UrbanKhet's portrait sheet occupied a very wide empty beige frame. | Portrait evidence width bounded using supported source proportions. | Independent review finding corrected and fresh render checked. |
| Major · deep links | Restructuring could strand historic company and section fragments. | Existing IDs and aliases retained; chapter links reveal ancestors and move focus to the relevant heading/control. | Coverage tests, keyboard chapter selection and direct fragment checks. |
| Major · Experience | Roles, promotions, bullet summaries and responsibilities repeated at several levels. | One ownership statement, genuine promotion progression, selected linked evidence, then full responsibilities on demand. Single-role numbered chips removed. | Four careers, exact promotions, original responsibilities and measurement notes retained; expanded CashKaro checked on phone. |
| Major · CV action | Earlier restructuring risked losing a key visitor action. | Original supplied CV remains available in navigation, Home and Experience, with a direct download action. | SHA-256 and public-content regression test confirm unchanged PDF. |
| Refinement · Experience context | Support programmes, volunteering and independent activity could be confused with employment. | Separate career, internship and “Beyond employment” sections with explicit relationship descriptions. | Source inspection and rendered chronology. |
| Refinement · certifications | Long identifiers competed with qualification titles. | Both supplied credentials, original logos, issue dates and credential links remain; identifiers have a named expandable detail. | Full source-preserving Experience inspection. |
| Major · Writing recovery | Missing production database configuration could fail the entire public page. An indiscriminate empty fallback would be misleading. | Local empty preview, genuinely empty published collection and unavailable production connection are distinct; retry and Work recovery are available. | Five targeted recovery tests; development and production browser states. |
| Major · legacy detail recovery | Unknown detail routes could query an unconfigured database unnecessarily. | Deliberate 404 before query when no publishing connection exists; configured failures remain errors. | Controlled query tests and production HTTP checks. |
| Refinement · Art | Metadata/actions were small and used inconsistent surfaces. | Shared paper/ink tokens, readable captions, natural painting proportions, original notes and native enlargement. | Mobile render and source-image checksums. |
| Refinement · publication dates | Database record creation dates could be mistaken for painting dates. | Optional records explicitly say “Published”; supplied paintings remain undated. | Recovery/detail tests; original Art registry unchanged. |
| Refinement · image viewer | Fit mode could fail to show the complete image; fitted mobile images sat above excess blank space. | Complete-image containment centred in the available viewer; Actual size starts safely at the top/left and scrolls. | Phone viewer, Actual size/Fit controls, Escape and focus restoration. |
| Refinement · image loading | Published images did not receive existing stored dimensions; a priority-attribute workaround warned in real Next rendering. | Stored dimensions forwarded; eager/lazy loading and async decoding retained. Unsupported priority attribute removed after the native-render warning. | Targeted tests, final render and production build. |
| Refinement · videos | Clip metadata could load before a visitor chose to watch. | No autoplay; `preload="none"`, posters, native controls and existing written visual descriptions. | ULI clip played inline on phone; unplayed siblings stayed unloaded. |
| Refinement · motion | Blanket entrance effects could wash out captured content and add motion without helping comprehension. | Public blanket fade-in class is static; the bounded peel remains user-triggered, reversible and reduced-motion-aware. | Peel keyboard interaction and source review; no reduced-motion OS simulation claimed. |
| Refinement · dependency | Public pages loaded a remote icon font used only by private admin controls. | Stylesheet moved to the private admin layout; public icons remain local text/SVG. | Root/private-layout inspection and production route output. |
| Refinement · private control | Password visibility control removed keyboard focus and had a small target. | Visible focus and 44px target restored. | Existing auth/API suite remains passing; no authentication logic changed. |
| Refinement · contact/copy | Product-only closing language did not fit paintings or writing. | Human shared contact language and context-specific Art/essay prompts; consistent plain actions and recovery copy. | Public page inspection; no messages sent. |
| Refinement · social metadata | Relative social imagery lacked a configurable public origin. | Explicit public-site origin supported, with Vercel hostnames used when available. | Source/configuration review; no public domain invented. |

## Evidence and substance preserved

The work source registry is unchanged: **25 studies, nine contexts, 198 chapters, 13 tables and 45 canonical/alias routes**. All original narrative paragraphs, bullets, table contents, section aliases and source notes remain rendered and reachable. The presentation changes which layer is initially open, not the recorded substance.

There are **99 unique work-media URLs: 90 images and nine inline videos**, including **17 authored workflow diagrams**. Nine supported charts remain available where relevant; comparison baselines, actual units and implied donut remainders retain their qualifications. No percentage skill ratings, invented financial results or decorative “impact” charts were added.

Delivered work, working prototypes, proposals, community contributions and supporting context remain distinct. Programme GMV is not presented as platform revenue. Lending reach and national ULI infrastructure remain separate from personal ownership. Source disagreements about dates, units, event definitions and cohort scope remain beside their claims and in the deeper records. Current public products and generated silent walkthroughs are not presented as historical production recordings.

The supplied CV checksum remains `01978cf50d61878a4e55ad390a3c83e115779d430ddd2679f0eca0fced079176`. All **20 Art image derivatives** match the extraction manifest. Six named paintings, the separate cover photograph, original notes, medium, dimensions and three-panel grouping remain intact. No artwork dates, present availability or new artist commentary were invented. Original brand assets and both supplied certifications are retained.

MoneyLion remains removed. Public case-source PDF/ZIP/document download actions remain retired; the original CV is the explicit exception. No PDF viewer replaces website content. Public Markdown continues to reject attachment links. Private source archives and sensitive research material remain outside public hosting.

## Skill review

The morning installation comprised **3,456 skill files**. The inventory scan read every file in full, recording path, timestamps, headings, character count and checksum. It covered 30,199,851 characters. A focused ledger then reviewed **22 relevant instruction sets in full**, with **13 directly applicable workflows**; the primary review also used Accessibility Review. A programmatic full-file scan is not a claim that thousands of unrelated medical, legal, cloud or offensive-security instructions were individually applied to a portfolio.

The most useful guidance was Structure & Pitch, Anti-UI Slop, redesigning an existing project, UX Audit, frontend/editorial design, accessible native controls, honest interface states and measured performance work. The user's cream/ink/colour direction wins over generic prescriptions for glass surfaces, monochrome-only accents or excessive animation. Existing evidence wins over any suggested fabricated metrics, randomized dates or placeholder writing. No framework migration, plugin installation or new account was needed.

The detailed local skill review and machine-readable inventory are saved separately in Downloads. They are research records, not public website assets.

## Verification record

- **52 automated tests pass**, covering public content safety, original CV download, registry/media/alias coverage, chart geometry and scope, recovery behavior, PDF extraction, local preview, private authentication and upload authorization.
- Standalone **TypeScript checking and the production build pass**. The build retains four existing private-admin image-performance advisories and a non-fatal warning that the external private icon stylesheet could not be optimised; public pages no longer load that stylesheet.
- Production HTTP checks passed for **25 canonical case URLs, 20 aliases, all 198 chapter IDs, five public pages and five expected 404 routes**. All **141 work, poster, Art and brand assets** returned successful responses with the expected byte lengths. The original CV returned a PDF response and matched its source checksum.
- `git diff --check` passes.
- Browser checks covered 320px, 390px, 768px, 1,280px and 1,920px layouts, plus a wide request whose actual browser width was 4,096px. No horizontal page overflow was observed in the tested states. The paper frame remained 1,560px on wide screens.
- Keyboard checks include company filtering, mobile menu opening/Escape/focus return, chapter chooser and chapter-link reveal, image enlargement, Actual size/Fit and Escape/focus return. A representative silent ULI walkthrough played inline; unplayed sibling videos retained `preload="none"`.
- The phone evidence tables use labelled focusable overflow regions. Deep source content remains readable when opened. Exact body, table, source, media and anchor coverage is checked for every authored study.
- Shared cream/ink text contrasts are measured above 4.5:1: ink **16.72:1**, muted **6.03:1**, and blue focus/accent on cream **5.32:1**. This is token verification, not a claim that every pixel combination has been certified.
- Final production previews of Home, Work, an open founder case, Experience and Art were saved in Downloads. Temporary viewport overrides were reset after the browser checks.

## Practical limits and future work

The publishing database is not connected in this local workspace. Real remote article/upload contents and end-to-end publishing cannot be verified here; controlled tests distinguish successful, empty, unavailable and error outcomes. The authored portfolio remains usable independently. No database migration, credential change, merge or deployment was performed.

This is a detailed design/content/source and browser-interaction audit, not a WCAG certification or a measured Lighthouse/Core Web Vitals result. No actual screen-reader session, physical-phone performance run or reduced-motion OS emulation is claimed. Source-reported product outcomes still carry their original evidence limits; UI changes cannot supply missing cohort records or model evaluations.

The useful next validation is a short task-based review with a hiring leader: identify Priyam's current remit, choose relevant work, explain one consequential decision and find the CV/contact action. Art should separately be reviewed with a viewer who wants to inspect a painting and read its note. Any further layout changes should respond to observed confusion in those tasks, rather than adding another universal diagram or decorative layer.
