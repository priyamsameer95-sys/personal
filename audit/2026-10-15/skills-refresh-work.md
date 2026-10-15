# Work and case-study refresh

Reviewed on 15 October 2026 using Frontend Design, Vercel React Best Practices, Web Design Guidelines and Code Simplifier. The current [Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) were fetched for this review.

## Findings resolved

- `components/work/WorkExplorer.tsx`: the entire Work index was a client component even though its only interactive responsibility was following URL fragments. Project records, company details and supporting media were crossing that client boundary unnecessarily. The page now prepares eight selected previews on the server. Only permitted anchor names go to the small fragment-navigation client; each preview receives its explicitly chosen lead media.
- `components/work/WorkFragmentNavigation.tsx`: retained company and problem anchors decode safely, cancel stale animation frames, focus the destination and then scroll. Unknown and malformed fragments do nothing. Cleanup removes the listener and pending frame.
- `components/work/Media.tsx`: compact media omitted the recorded visual descriptions even on the detailed evidence page. The detailed galleries now show those descriptions and associate them with their videos. Selected-work previews remain short, with their visible caption and provenance. Playback stays user initiated and original sources remain labelled.
- `components/work/Media.tsx`: lead images retain eager loading, while supporting images remain lazy loaded with recorded dimensions. The final browser/server pass caught a difference between standalone React 18 and Next's bundled renderer around `fetchPriority`; the extra hint was removed instead of retaining a runtime warning or changing frameworks.
- `components/work/CaseStudy.tsx`: long reference pages only offered generic navigation at their end. Named source groups now link to their visible records before the material begins. These links use the existing keyboard-safe anchor helper.
- `components/work/CaseStudy.tsx` and `work.module.css`: two-column tables no longer inherit the 38rem minimum width intended for wider data tables. Narrow tables fit the reading width; wider tables retain a keyboard-focusable horizontal scroll region. Captions wrap independently of wide table columns and long cell content can wrap.
- `components/work/work-explorer.module.css`: programmatically focusable Work destinations now retain a visible keyboard focus treatment rather than removing their outline.
- `components/work/WorkPreview.tsx`: expanded compressed JSX into readable component structure and removed unused selection code. Project status and provenance remain explicit.

## Mobile review follow-up

The root browser review found that the 320px Work opening still stacked three explanations before showing a product. This was a presentation failure despite the coverage checks passing.

- Replaced the long Work headline and introduction with “Selected work.” and a 17-word introduction. Removed generic problem-section introductions, retaining short section names and company context of fewer than 30 words.
- Phone problem navigation uses two columns. Each selected preview names the actual product and places its visible media directly after its title/status, followed by a 25–31-word ownership and evidence account. The same markup preserves that reading order for assistive technology; desktop CSS keeps the media alongside the account.
- The College.money index preview explicitly selects the inspected blue public-product introduction image (`college-money-abroad-hero-final`). Its current-public provenance remains visible. Its case-study primary media is unchanged.
- Added one shared presentation-only title helper in `lib/work-presentation.ts`, giving all 25 cases concise product names in Work previews, case headings, reference headings and related links. Original registry titles, summaries and metadata inputs remain intact.
- Case headings now use the site's Geist type, with a 2rem phone heading, less role spacing and a compact paired-logo row for College.money. Single-brand UrbanKhet marks retain their existing size.
- Consolidated duplicate Work preview and index CSS declarations into one responsive layout definition.

## Preservation

No registry facts, outcome claims, source paragraphs, media files or case URLs were changed. All 25 retained studies and their aliases remain available. The Work page retains eight selected cases and all company anchors, with career-only contexts linked to Experience. Reference coverage tests verify every public source paragraph, table cell, media source and retained anchor. Proposals, scripted prototypes, historical delivery and recorded versus proposed checks keep their explicit labels.

## Validation

Focused tests: **42 passed, 0 failed** (`tests/work-explorer.test.cjs` and `tests/work.test.cjs`). Checks cover the reduced server/client boundary, fragment focus and cleanup, all selected previews, title/evidence/account reading order, concise ownership copy, shared product names, proposal labels, native media controls, visible reference descriptions, table rendering and all retained source coverage. `git diff --check` passed.

The root task is responsible for the combined type check, lint, production build and fresh browser review across the whole website. This subtask did not publish or deploy changes.
