# Independent portfolio review — 15 October 2026

Scope: the current Next.js public pages, shared navigation/media/contact patterns, recovery pages and the protected admin interface. Initial read-only review followed by an explicitly delegated fix to the shared private-admin confirmation dialog. No secrets, live data, form submissions, publishing or infrastructure were changed.

Methods: read `frontend-design`, `web-design-guidelines`, `spartan-ui-ux-pro-max` and `code-simplifier`; fetched the current [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md); ran the Spartan design-system search without persistence and checked its advice against the actual brief. The requested cream paper, black ink, original brands and colour beneath the paper take precedence over the search database's generic palette/font suggestions.

## Five priority findings

1. **High — the homepage withholds its most characteristic material.** `app/page.tsx:31` and `app/home.module.css:1`: the opening screen is two text columns, followed by another heading and paragraph before the first work image. This asks the reader to learn an abstract product/operating philosophy before seeing the work. Bring a recognisable product or original artwork into the initial composition, and get to the first named project with its visual promptly. Keep the cream surface, quiet black text and a deliberately small amount of exposed colour.

2. **High — the same account is retold several times.** `app/page.tsx:33`, `app/page.tsx:35`, `app/page.tsx:39`, `components/HowICanHelp.tsx:11`, `app/page.tsx:56`: customer experience, partners, handoffs and operations recur in the hero, the selected-work introduction, each work notice, the help module, a second closing invitation and the footer. The recurring explanation consumes attention without adding new evidence. Use one short remit, visible named work with a decision and supported result/status, then a single contact close. Keep role progression as a compact factual bridge to the CV.

3. **Medium — navigation and identical visual scaffolding flatten hierarchy.** `components/Header.tsx:12`, `app/home.module.css:8`, `app/home.module.css:13`, `app/home.module.css:28`: a five-word help navigation item competes with Work/Experience, while almost every homepage section is another ruled text-and-image account. Simplify the header around visitor destinations. Give one featured case visual priority and use a quieter pair for secondary evidence; avoid multiplying decorative badges, numbers and micro-labels. Retain direct CV access and the contact choice dialog.

4. **Medium — contact modal needs scroll containment.** `components/contact-chooser.module.css:1`: the native dialog has a constrained height but no `overscroll-behavior: contain`. At phone heights the long channel list can chain scrolling into the page when reaching a boundary. Add containment to the scrollable dialog and verify it at 390 px and 320 px, including Escape, focus restoration and visible final channel. The image viewer already contains its inner scrolling region.

5. **High accessibility, private admin — destructive confirmation is only a visual overlay.** `components/admin/shared.tsx:80`: `ConfirmDialog` uses ordinary divs, with no modal semantics, focus containment, Escape dismissal, deliberate initial focus or restoration. Keyboard users can navigate behind a deletion confirmation. Replace the overlay with a native dialog (or fully implement the modal pattern), put initial focus on Cancel, preserve the invoking button and restore focus when cancelled. Related small repairs: label icon-only close/reorder/delete buttons in `shared.tsx:50`, `WorkForm.tsx:242`, `WorkForm.tsx:245`, `WorkForm.tsx:271` and equivalent Blog/CV controls; associate form labels with their inputs.

## Existing behaviour to preserve

- Public images have enlargement controls, dialog labels and focus restoration; user-initiated video uses native controls, visible posters and no autoplay.
- The root layout includes a skip link, local fonts and a consistent readable contrast palette. Global reduced-motion support is already present.
- Original company logos retain aspect ratios. CV download stays direct and prominent.
- Recovery pages give specific routes back to Home/Work and email.
- Admin authentication has no fallback password; signed cookies are verified inside API handlers as well as middleware. The review does not claim that an in-memory login limiter is durable across serverless instances.
- The public source/proposal/measurement qualifications must survive layout simplification. Move or consolidate repeated wording without deleting unique limits or promoting a proposal into delivered work.

## Validation boundaries

The shared confirmation dialog was changed after root delegated the fix. The local server at `http://127.0.0.1:3000` was unavailable (connection refused) during this pass. No desktop/phone screenshots or interactive browser checks are claimed here. Root owns the shared browser and will perform fresh desktop and phone review after integrating changes. HTTP-only checks are supplementary and do not substitute for that review.

## Implemented fix and evidence

`components/admin/shared.tsx`: replaced the plain confirmation overlay with a labelled native `<dialog>` opened by `showModal()`. Background focus is constrained by the native modal; the page scroll locks while open. Cancel receives the first focus. Escape uses the existing cancellation handler, and dismissal/unmount closes the dialog, restores the previous overflow value and restores focus to the invoking element when it still exists. Confirmation and cancellation handlers retain their original meaning. Both actions have explicit button types and 44 px targets; the action row wraps at narrow widths. The dialog's scroll is contained. The shared notification's close action is now labelled and has a 44 px target.

Focused verification: `node --test tests/admin-confirm-dialog.test.cjs` — **4 passed**. Tests exercise the actual component lifecycle with native-dialog doubles: labelled modal semantics, explicit callbacks, safe initial focus, background scroll lock, Escape cancellation without confirmation, cleanup/focus restoration, closed state, and a removed invoking element. They do not claim interactive browser testing or any deletion. Root will run the combined type/lint/test/build gates and shared browser review.
