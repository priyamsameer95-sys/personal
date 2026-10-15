# Applying UI/UX Pro Max to Priyam's existing portfolio

## Source and baseline

The requested skill is already installed at `/Users/rajveerbhullar/.codex/skills/ui-ux-pro-max/SKILL.md`. Its complete instructions were read, the required `--design-system` search was run, and UX, chart and Next.js searches supplemented it. The requested upstream is `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`; no global reinstall was necessary.

Baseline commit: `4164d09`, retained on `codex/before-ui-ux-pro-max-2026-10-16`. Implementation is isolated on `codex/ui-ux-pro-max-platform`.

## Adaptation to the actual product

This is a product leader's portfolio for a hiring reader, not a generic creative template. The user's cream paper, black ink, colour underneath, original company identities, personal opening, company-grouped work, open media, complete CV and original paintings remain the design contract.

The raw search output is a heuristic, not a specification or accessibility certificate. Its hover-only information, Caveat/Quicksand pairing, metric pulses, credential carousel and generic authority badges are not adopted. They would obscure supported work or replace choices the user has already reviewed. No library, font, outcome, badge or testimonial was added to fulfil a template.

## Shared implementation rules

| Area | Applied rule |
|---|---|
| Colour | Retain `--paper`, `--ink`, `--muted`, original brands and existing underlay colours. Check contrast and reflow in the rendered interface. |
| Typography | Keep locally hosted Geist and the existing hierarchy. Mobile reading/contact/action text uses 16px; short metadata remains secondary. |
| Controls | Shared 44px target, 8px target-gap, 2px ink focus and 160ms motion tokens. Enabled buttons have a pointer; disabled states remain explicit. |
| Icons | One decorative SVG component with a 24px viewBox and consistent stroke. Native labelled controls supply accessible names. |
| Navigation | Company groups and the manual visual browser remain intact. Short main-navigation actions gain minimum touch width. |
| Motion | Existing small CSS feedback and reduced-motion support remain. No automatic carousel or hidden primary information. |
| Media | Named product references in full-case openings; image fit/actual-size state, captions, scroll regions and keyboard controls are explicit. Originals remain available. |
| Charts | Comparison and donut labels become native tabular data using the existing exact values. Notes and measurement limits stay adjacent. No new dataset or reported result. |
| Art performance | Small close-up previews use the existing Next.js optimizer; original full-resolution image URLs remain the enlargement source and hash-verified source assets. |
| Published text | Long CMS titles/URLs can wrap safely; code and tables keep their own horizontal scroll regions. |
| Metadata | Controlled PNG social previews use the existing identity, with a stable known public-domain fallback. |
| Private editing | Bound labels, keyboard-reachable upload inputs, named image actions, readable inputs, explicit progress/notification states and responsive editor layout. Data/action handlers and authentication are unchanged. |

## Scope and validation

Public Home, Work, Experience, Art, Writing, recovery/legacy routes, case studies and shared media were included. Private editor changes are UI-only and tested with rendered fixtures; no production admin record was uploaded, saved, deleted or published. No database, authentication, deployment or dependency change is included.

Check the actual site at phone, tablet and desktop widths, including keyboard dialog/menu actions, source captions, manual project navigation, CV downloads and media preservation. A passing build and an automated skill recommendation do not establish visitor comprehension or formal conformance.
