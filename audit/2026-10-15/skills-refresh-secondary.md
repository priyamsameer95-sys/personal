# Secondary pages: skills refresh

Reviewed 15 October 2026. Scope: Experience/CV, Art and Writing. The homepage, shared chrome, media dialog and Work pages are handled in the parent review.

## Applied guidance and design decision

- Read `frontend-design`, `spartan-ui-ux-pro-max` and its Codex review reference, and `web-design-guidelines`.
- Fetched the current [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) during the review.
- Ran the Spartan design-system search for a product-leadership portfolio and painting gallery. Its generic motion-heavy palette and type recommendations do not override the approved cream, ink and colour-underneath identity. Applied its relevant readability, touch, focus, image stability and responsive guidance.
- Preserve existing cream paper and black ink tokens, existing editorial/body typefaces, actual paintings and original marks. No new fonts, animation system or decorative card treatment. Art remains a quiet gallery; Experience remains an open CV; Writing remains honest about its current collection.

## Findings fixed

| Location | Finding | Change |
|---|---|---|
| `components/art/art-gallery.module.css:24` | A fixed detail-image column squeezed artist notes into a very narrow text measure on phones. | Notes now span the full phone width; the small, optional detail sits beneath. Full paintings retain their aspect ratio and enlargement. |
| `app/art/art.module.css:7` | The closing artist note used a two-column grid with no second item. | Removed the empty grid and obsolete cover rules; retained a controlled reading width. |
| `app/art/page.tsx:90` | Legacy CMS artwork without stored dimensions reserved no space before loading. | Added a reserved containing frame. Stored dimensions determine the frame when available. Unknown dimensions use a 4:3 frame and `object-fit: contain`; no source size is invented and no painting is cropped. |
| `components/art/ArtGallery.tsx:48` | Painting and collection hash destinations were not focusable. | Native fragment destinations receive `tabIndex=-1` and a visible keyboard focus indicator, without adding stops to the normal Tab order. |
| `app/cv/cv.module.css:86` | Phone CV dates, proof links and company metadata were 13–15px. | Phone metadata, dates, proof links and navigation use 16px; existing 44px interaction targets remain. |
| `app/cv/cv.module.css:37` | CV responsibility lines could extend to 85 characters. | Responsibility measure limited to 70ch; company/intro copy limited to 65ch. |
| `app/cv/page.tsx:22` | Section and company fragment targets could scroll without carrying keyboard focus. | Added native focusable section, company and legacy proof destinations, with visible keyboard focus. |
| `app/blog/page.tsx:69` | The empty collection heading did not state that no essays were published. | Explicit “No essays published yet” with existing relevant case-study links. Connection failure still offers a retry. Published articles get an introduction that does not imply an empty collection. |
| `app/blog/blog.module.css:18` | Writing links relied on shared rather than local focus styling; phone link/date text remained small. | Added explicit focus styling and 16px phone links/dates. |

## Preserved coverage

- All 25 on-site CV proof destinations remain present once; all seven dated roles, promotions, responsibilities, original dates, education, recognition and both certification verification links remain.
- Prominent original CV PDF action and source content are unchanged.
- All six paintings, their supplied public notes, preserved original notes, dimensions and six detail thumbnails remain. No invented artwork or new facts.
- Existing Art/CV section and company IDs remain; no new disclosure controls.
- Empty, failed and published Writing responses are distinct; unconfigured publishing does not query a database or invent writing.
- No changes to source claims, databases, authentication, routes, deployment or publication.

## Validation

- Targeted secondary-page/render/recovery suite: **12 tests passed**, 0 failures. Covers the preserved CV record/proof links, credentials, all artwork and detail media, focusable jump destinations, additional artwork dimensions/fallback, Writing empty/failed/published states, and public route recovery.
- ESLint on the four owned TSX files: **passed**, no warnings.
- `git diff --check`: **passed**.
- Browser verification is pending the parent’s combined desktop/phone pass. These render checks are not a substitute for browser layout and focus observations.
