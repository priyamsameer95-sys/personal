# Help section removal and email copying

Completed at the user's request after the portfolio skills refresh. The landing page will be revisited separately; this change removes only its help section and the shared navigation entry.

- Removed “How I can help” from Home, Work and the header, including the unused shared component and stylesheet.
- Added a shared “Copy email” control beside the footer address, CV address, case-study invitations, Art contact, contact-dialog Email channel, public legacy detail invitations and recovery email. Public Markdown links addressed to Priyam also receive the option; other authors' email links remain ordinary links.
- Original mailto links and subject lines remain. Copying writes only `Priyam.Sameer.95@gmail.com`, never the subject or `mailto:` prefix. A live confirmation appears after the Clipboard API succeeds. A failed or unavailable API shows the address with an honest manual-copy message.
- Buttons are non-submit controls with keyboard focus, a 44px target and accessible status. The dialog's copy control is a sibling of its email link, keeps the dialog open and does not move focus. Escape still restores the Contact Priyam trigger.

Validation: **93 tests passed**, type checking, lint and production build passed. Four existing private-admin image optimization warnings remain. The production preservation check reports zero failures across retained pages, aliases, anchors, media and the original CV binary; see [the check report](email-copy-check-report.json).

Browser checks covered the SilkRoute case invitation, contact dialog, keyboard copying in Experience, global footer controls and removal on Home/Work. Home, Work and Experience had no horizontal overflow at 320px. The actual copied address was verified by pasting into an isolated local input; the temporary input server and browser tab were then closed. Clipboard rejection and missing-API handling are covered by focused component tests. No live contact was sent.

The preview runs at [http://127.0.0.1:3000/](http://127.0.0.1:3000/). Changes remain local; no push or deployment was performed. Browser proof: `/Users/rajveerbhullar/Downloads/priyam-skills-audit-20261015/email-copy-case.jpg`. Test and build logs are in the same folder, prefixed `email-update-`.
