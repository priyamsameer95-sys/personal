# Taste iteration: implementation and comparison

## Versions

- Version A: `codex/homepage-before-taste-2026-10-15`, commit `c9a5006`. This preserves the previously reviewed portfolio in Git.
- Version B: `codex/homepage-taste`. Product changes are confined to the homepage and its scoped styles. The supporting test and audit records document the change.
- Both versions remain local. Nothing was pushed or deployed in this iteration.

## What the supplied writing changed

The visitor's immediate task determines the order: establish current responsibility, choose relevant evidence, understand a consequential decision, then inspect the case or reach CV/contact. This is the application of the supplied taste material; the material itself has not been published as Priyam's writing.

The opening retains the original painting, cream paper, black ink and colour beneath the page. It states the current General Manager remit and supported P&L responsibility. Selected work still begins below the opening screen.

The lending sequence now connects College.money's delivered journey, EduLoans' visible missing-policy restrictions, and MCP's proposed separation of evaluation from approved policy changes. Each preview identifies ownership and a concrete decision. Optional native links reach lending, agriculture or founder work without hiding the other accounts. Agriculture and UrbanKhet keep separate visual boundaries. A concise Experience link replaces the repeated career grid.

The trade-off is more lending evidence before agriculture and founder work. Those readers have direct context links, while all work stays visible. Prototype, proposal, current public reference and programme-scale qualifications remain beside the relevant material. No new outcome, deployed AI capability or completed checkout is claimed.

## Verification

| Check | Observed result |
|---|---|
| Full automated suite | 94 passing, 0 failing |
| Standalone TypeScript check | Passed |
| Lint | Passed with four existing admin-image warnings |
| Production build | Passed |
| Production content/route preservation | 0 failures: 5 public pages, 25 canonical cases, 25 reference pages, 20 aliases, 179 asset URLs |
| Original CV | Served binary matches current local binary; SHA-256 `2a8e04a88736df3f7db72d2a198d0ae9f38bd8975ef2d55477ae08dcd28a59c9` |
| Desktop, 1440 × 900 | No horizontal overflow; selected work begins at y=905.20 |
| Phone, 390 × 844 | No horizontal overflow; selected work begins at y=845.40 |
| Narrow phone, 320 × 844 | No horizontal overflow in the development review |
| Context navigation | Native anchors reach the correct article and transfer focus; phone Enter verified |
| Image enlargement | Keyboard Enter opens the prototype; Escape closes it and restores focus |
| UrbanKhet video | Initially paused with autoplay disabled; keyboard playback reached readyState 4 and advanced past nine seconds without a media error |
| Browser errors | No new console errors captured during production review |

Fresh production desktop, phone and lending screenshots were inspected. An independent review found no material factual or visual issue in those views. These checks establish implementation behaviour, not hiring-reader comprehension or conversion. The predictions and conditions for revising the decision are recorded in `taste-version-design.md`; real reader testing remains unperformed.

## Comparison artifacts

Folder: `/Users/rajveerbhullar/Downloads/priyam-taste-iteration-20261015/`

- `before-desktop.jpg`, `before-phone.jpg`, `before-companies.jpg`: preserved Version A browser captures.
- `after-desktop.jpg`, `after-phone.jpg`, `after-lending.jpg`: fresh Version B production captures.
- `tests.log`, `lint.log`, `typecheck.log`, `build.log`, `routes.log`: verification output.
- The complete preservation report is `taste-version-check-report.json` beside this document.

No asset bytes, case registry records, authentication, database or backend integrations changed in this pass.
