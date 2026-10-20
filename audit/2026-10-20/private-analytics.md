# Website analytics — local dashboard revision

The earlier hosted dashboard has been removed at the owner’s request. Both `/minforyam/analytics` and `/minforyam/cv-leads` return 404, even with an authenticated session or a forged local Host header. Neither page imports or queries private records, and the live content admin no longer links to them.

The report interface now runs in a separate loopback-only local application. See [local dashboard setup and security](local-analytics.md). Existing authenticated report and CV-export APIs remain as the secure data transport for that local application; public collection endpoints provide no report-reading operation.

Traffic and interaction events use anonymous daily visitor keys. Emails appear only when someone submits the CV form; there is no join between browsing events and email records. CV requests mean successful form submissions, not verified identities or confirmed PDF opens. Historic visitor activity cannot be reconstructed.

All public pages and meaningful navigation, CV, contact and media interactions are instrumented. Event targets are restricted to known public destinations or fixed action categories; entered text, email addresses, phone numbers, query strings and arbitrary labels are excluded. Do Not Track, Global Privacy Control, known bots, prefetching and authenticated owner activity remain excluded.
