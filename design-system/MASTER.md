# Priyam Sameer — interface standard

This portfolio uses cream paper, black ink and colour beneath the page. Extend that identity across the public site and editing tools. The UI/UX Pro Max workflow informs implementation; its generated template suggestions do not override the reader's task or the reviewed identity.

| Element | Standard |
|---|---|
| Background / surface | `--paper: #faf7f0`, `--paper-soft: #f1ede4` |
| Text | `--ink: #171717`, `--muted: #625e56` |
| Rules | `--rule: #ddd7cb`; interactive boundaries also have explicit focus/hover states |
| Colour | Existing blue, orange, pink, lime and yellow underlay tokens; original artwork and brand colours remain intact |
| Type | Locally hosted Geist, existing heading hierarchy; 16px phone reading/action text, comfortable line length and 1.5–1.75 body leading |
| Targets | `--target-size: 44px`, `--space-target: 8px`; native labelled controls, explicit available/disabled/pressed state |
| Focus | `--focus-ring: 2px solid var(--ink)` with visible offset; Escape/close returns focus appropriately |
| Icons | `components/Icon.tsx`: one 24px viewBox, consistent stroke, decorative SVG; name the containing control |
| Motion | `--motion-fast: 160ms`; small transform/opacity feedback, no autoplay carousel, respect reduced motion |
| Media | Reserve dimensions, preserve aspect ratios, user-initiated video, efficient previews with original enlargement available |

Use the same quiet Priyam Sameer wordmark on every public page; do not add a separate PS circle on inner pages. Inner content uses a shared 76rem alignment, generous page introductions and a consistent type hierarchy.

Home introduces the person and remit, then the work. Work groups projects by company, with themes inside those groups. Experience is the complete supported CV with named proof links. Art uses individual painting spreads with adjacent notes and real close-ups, rather than repeating a thumbnail grid before the originals. Product screenshots use image/text spreads; dense system diagrams use the full available width. Experience puts the current role at the start of its contribution column with compact dated promotion history. Writing/recovery pages retain clear and truthful states.

Keep essential decisions and media visible. Use quiet native company/title anchors to help someone choose an account; do not repeat the project catalogue in a second thumbnail strip, or make the story depend on filters, hover or disclosures. Product website links name their destination. Keep prototypes, proposals, current public references and historical delivery distinct.

Data visualisations retain exact labels, values and qualifications; use semantic data equivalents and avoid colour-only meaning. Never invent metrics or source evidence to complete a layout. Preserve the CV download, copy-email action, original case URLs, source assets and compatibility anchors.

Check actual rendering at 375, 768, 1024 and 1440px, plus a 320px stress check. Test menu/dialog focus, keyboard navigation, image enlargement, video controls, source captions, table/code scrolling and long text reflow. Run relevant tests, type checking, lint, production build and the route/asset preservation script. Automated checks do not establish real visitor comprehension or formal accessibility certification.
