# Historical CV test entries

The email-domain check added for new CV requests does not retroactively rewrite older records. The local dashboard and hosted reports previously counted historical test domains as audience interest.

A shared deterministic domain policy now excludes reserved/test and known disposable domains before SQL grouping, limits, aggregate totals, dated event counts and CSV export. Original database records are retained. Reports expose excludedCVContacts and excludedCVRequests separately so exclusions remain visible and auditable. Historical reports do not send email or make DNS lookups.

The dashboard labels successful email form submissions as CV requests, and client submit/fallback actions as download attempts. These are not proof that a PDF was opened or saved. Direct access to the public PDF has no corresponding email record, so past file downloads cannot be reconstructed from the email-request table.

260 automated tests, type checking and the production build pass. Live read-only report and export checks verify that excluded records do not inflate totals or leak into CSV, while original stored records are untouched. The private local service keeps its existing owner-only connection and automatic startup.
