# GitHub visual showcase — 18 October 2026

The public repository catalogue now groups 17 repositories into 12 product stages and three supporting records. EduLoans combines `mcp-el`, `V1.03-Chat-eduloans` and `edulaons` once, retaining each original source, maturity and documentation link. Public discovery, outage fallback, private/foreign exclusion and all five category anchors remain.

## Visual coverage

| Product stage | Original visual / available interaction |
| --- | --- |
| EduLoans | Existing original V1.03 student intake, partner pipeline, reviewer queue and inspector; sample records/scripted responses. Authored MCP contract flow accurately labelled. |
| THEYA.Audio | Original two-voice RAG studio rendered from pinned public frontend; synthetic text, services disabled. |
| Conversational screening | Original React campaign dashboard; synthetic draft campaigns, zero completed calls. Static monthly performance copy replaced with “Synthetic preview.” |
| Rocket Card Finder | Original spending questionnaire with illustrative input; financial API disconnected. No claim of LLM integration or MoneyControl employment/client relationship. |
| EquitySim | Original inputs/payout/chart; interactive preference-first illustration, conversion/dilution/tax excluded. |
| JSON Atlas | Original JSON/code panels; interactive TypeScript, Python and Go generation. |
| Magic Text Matcher | Original pattern/text/highlight UI; interactive regex matching. |
| StreamCSV | Original file/progress/export UI; local sample CSV and export. Input is chunked, output retained in memory; quoted CSV unsupported. |
| Colour palette | Original five swatches; generate/copy with keyboard access. |
| TV Surf | Original channel controls; external playback explicitly disabled in the isolated preview. |
| Scrambl | Original timed letter interface; reproducible local-calendar daily game. |
| Portfolio | Current original landing interface, with original painting. |

`daily-build-log` remains documentation. `small-tools-` and `gpttest` contain no published implementation; no screens or AI capability are invented for them. Unknown future public repositories remain visible with source descriptions until reviewed.

Screens were captured from original interfaces in isolated local previews through the in-app browser, then encoded as WebP without altering their layouts. Main and supporting images reserve dimensions; supporting images load lazily. Click/keyboard enlargement uses the existing accessible media dialog. No initial iframes, backend connections, autoplay or inference are introduced.

## Browser demos

Seven original static tools are copied under `public/github-demos`, with licences, pinned source provenance and exact published HTML hashes. CSS/JS and Chart.js are local/inline. CSP blocks network connections, frames and media. Iframes are mounted only after explicit launch, without same-origin, popup or top-navigation permissions. Escape requests carry only a close intent; the parent verifies the sending iframe before closing and restoring focus.

Demo-only corrections are recorded per tool: honest scope copy, accessible labels/keyboard controls, clipboard fallback, and the CSV first-header flag so later input chunks retain rows. Source repository code is unchanged. THEYA/HR/Rocket are screenshot previews, not functioning live financial, telephony or model services.

THEYA’s retrieval is hybrid BM25/TF-IDF/bigram scoring over SQLite chunks, not a claimed embedding/vector-database deployment. Its evaluation functions are heuristic diagnostics. HR’s code maps recommendations into candidate statuses; no human-approval boundary or hiring accuracy is claimed. EduLoans’ archived 145 assertions remain recorded software validation with mocks, not fresh model or end-to-end accuracy.

## Validation

Automated grouping, route preservation, provenance, isolation, image coverage and meaningful CSV/palette behavior checks are included in `tests/github-*.test.cjs`. Browser checks cover actual tool interaction, enlargement, modal focus restoration and responsive reading at phone, tablet and desktop widths. The content/route audit retains all 25 professional case URLs, media and exact uploaded CV.
