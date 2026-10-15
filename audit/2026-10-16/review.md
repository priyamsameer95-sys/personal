# Work, Experience and Art — completed local version

## What changed

Work is now ordered by company: CashKaro, Absolute, UrbanKhet. Company context and Priyam's remit precede each group's projects. Themes identify individual projects within that group. The linked company name is the company website action; UrbanKhet has no external company link.

An optional thumbnail browser shows the selected projects and scrolls manually through them. Its native links reach the open project accounts below; it does not filter, autoplay or conceal the accounts. All eight use the same title/status → visual evidence → decision/contribution → case/product actions. College.money, RiskStac and GrowStac have explicitly named official product links. Upaj and Farm OS supporting previews now sit within Absolute, before UrbanKhet.

RiskStac's missing image was caused by an explicit empty primary-media selection. Work now selects its reviewed monitoring capture locally without changing the case registry's evidence model. Integration and SilkRoute show existing authored reference diagrams, labelled System design. Current public screenshots retain dated provenance; no historical interface, deployed protocol, model accuracy or individual GMV attribution is newly claimed.

Experience now uses a consistent logo/date rail and a single reading column for company context, roles, responsibilities and named proof links. Linked company/institution names replace duplicate website actions. The supported chronology, promotions, responsibilities, learning credentials and all 25 case links remain. The only removed summary sentence was a generic restatement of the responsibilities already shown.

Art opens with six original painting thumbnails in consistent 4:3 mats. Each full painting has its own open entry, artist note and close-up. Artwork remains uncropped inside the overview mats. Full enlargement, original source images and detail images remain available.

Shared logo slots align the original brands across the pages. Their colours and aspect ratios remain intact; square and wide marks are optically balanced rather than distorted into one shape. Motion uses small CSS transforms/opacity and native manual scrolling, with reduced-motion support.

## Version preservation

- Baseline: `codex/before-work-experience-art-2026-10-16`, commit `5fd4474`.
- New local branch: `codex/work-experience-art`.
- The accepted homepage structure/copy was not changed. Shared logo sizing was checked against its phone layout and a case page.
- No push, deployment, dependency addition, authentication or database change.

## Evidence and checks

| Check | Observed result |
|---|---|
| Full suite | 102 passing tests, 0 failures |
| Focused Work checks | Company grouping, visible RiskStac media, named links, legacy anchors, evidence/status distinctions and strip lifecycle all pass |
| Type checking | Passed |
| Lint | Passed; four existing admin native-image warnings remain |
| Production build | Passed |
| Preservation script | 0 failures: 5 public pages, 25 cases, 25 reference pages, 20 permanent aliases, 240 asset URLs |
| Original CV | Served binary matches local CV; SHA-256 `2a8e04a88736df3f7db72d2a198d0ae9f38bd8975ef2d55477ae08dcd28a59c9` |
| Desktop / phone | Production renders reviewed at 1440 × 1000 and 390 × 844; no page overflow |
| Narrow phone | Work, Experience, Art, College.money case and Home checked at 320 × 844; no page overflow |
| Company navigation | Keyboard Enter reaches the correct section and transfers focus |
| Manual project browser | Desktop next control advances to the second group and disables at the end; phone advances one preview. Unit checks also cover previous/start, resize and reduced-motion behaviour |
| Image enlargement | RiskStac and Art open with Enter; Escape closes and restores trigger focus |
| Video | UrbanKhet initially paused with autoplay off; keyboard playback reached readyState 4 and advanced beyond six seconds with no media error |
| Art alignment | All six overview frames measured 145px high on desktop and 77px on phone |
| Homepage compatibility | Selected work remains below the 844px opening screen on a 320px phone |
| Console | No new production console errors captured during the review |

An independent reviewer inspected all eight saved desktop/phone images and found no material layout or attribution issue. This is an implementation review, not a claim of validated reader comprehension or conversion.

The original product destinations were checked by read-only requests and returned HTTP 200: `https://college.money/abroad`, `https://www.upaj.org/riskstac`, `https://www.upaj.org/growstac`. Existing CashKaro, BankKaro and Absolute destinations were also checked. No visitor details were submitted.

## Artifacts

Folder: `/Users/rajveerbhullar/Downloads/priyam-work-art-experience-20261016/`

- `work-desktop.jpg`, `work-project-browser.jpg`, `work-riskstac-desktop.jpg`, `work-phone.jpg`
- `experience-desktop.jpg`, `experience-phone.jpg`
- `art-desktop.jpg`, `art-phone.jpg`
- `tests.log`, `typecheck.log`, `lint.log`, `build.log`, `routes.log`

The design contract and complete preservation report are in this audit folder. Case registry records and original artwork/media bytes are unchanged.
