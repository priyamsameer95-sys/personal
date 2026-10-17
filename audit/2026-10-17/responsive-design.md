# Responsive portfolio pass — 17 October 2026

## Reader task and design decisions

A visitor should be able to understand the areas of work, inspect a project, scan the career and view the paintings on the device they already have. Phone layouts should use the available width; tablet layouts should not inherit narrow desktop text columns.

- Retained cream `#faf7f0`, ink `#171717`, muted text `#625e56` and the existing blue/orange/pink/lime/yellow underlay. Original brand artwork is unchanged.
- Kept the locally hosted Geist family with a shared fluid display/title/body scale, 16px minimum mobile body text, comfortable line height and a consistent 76rem content frame. No new font requests or UI dependencies.
- Home opens with “Agriculture. AI. Fintech.” and a full original painting. Removed the self-introduction and short career pitch. Selected work remains a separate section below the opening. College.money, EduLoans and MCP previews now precede their longer responsibility text.
- Home cards have distinct boundaries, quiet colour underneath on hover/focus, complete previews, and one direct case action per account. Touch does not depend on hovering.
- Header preserves a visible CV action, a two-column phone menu, one wordmark and accessible contact choices. Existing email capture and the exact uploaded PDF remain intact.
- Experience uses employer/account columns on wide screens, company mastheads above full-width CV text on tablets, and a single column on phones.
- Work uses aligned company groups and open evidence-first project rows. It stacks the previews at 960px, before they become too narrow. Portrait UrbanKhet videos preserve the reviewed centre crop of the original landscape recording; general images remain fitted in full.
- Cases use bounded prose, visible media, fluid headings and galleries. Wide tables retain scoped scrolling and a visible cue through iPad landscape widths.
- Art shows a full-width painting before notes and close-ups on tablets. On phones the painting’s own proportions set its height; notes and detail images stack openly.

## Skill use

Used the installed UI/UX Pro Max design-system search and Next.js guidance, plus Frontend Design. The generated generic portfolio hover-overlay and animation-heavy recommendations were deliberately rejected: important evidence and actions remain visible without hover, and motion is limited to existing brief entry/interaction feedback with reduced-motion support.

## Validation

- 141 automated tests passed; TypeScript and production build passed.
- Content preservation check passed: 25 canonical cases, 25 reference pages, 20 aliases, 713 baseline section fragments, 122 media records, 10 videos, six paintings and six close-ups.
- Exact supplied CV SHA-256: `3a93c23d5b3ff90ead273b1ea1e6812e885df105bef525d638fb8fbe244ac713`.
- Browser review at 320, 375, 768, 1024 and 1440px: Home, Work, Experience and Art had no document-level horizontal overflow. Representative prototype, proposal, RiskStac and founder cases reviewed on phone/tablet.
- Keyboard image opening, Escape close and focus return verified. Mobile menu, email field focus and CV dialog fit verified. No synthetic CV lead was submitted in this pass.
- These are browser viewport checks, not claims of tests on physical iOS/Android hardware.

Screenshots and detailed test reports are saved separately in `Downloads/priyam-responsive-20261017`.
