# CV email plausibility check

The CV endpoint now rejects documentation/testing domains (including example.com and subdomains), local-only domains and a small explicit list of common throwaway inbox providers. Checks happen before recording interest or returning the download. Existing syntax validation, same-origin restrictions, honeypot, body limit and durable request rate limit remain in place.

Only the domain is checked via Node DNS. Usable MX is accepted; explicit null MX and nonexistent domains are rejected. A/AAAA fallback preserves domains using implicit MX, returning as soon as either address family is usable. Temporary DNS trouble returns a retryable, sanitized error. Lookups have a 2.5-second bound, deduplication, a 16-domain concurrency bound and a 512-domain cache. No SMTP, verification email, OTP, external email-validation service or new dependency was introduced.

This establishes domain plausibility, not mailbox existence or ownership. Free providers, company mail, plus aliases and privacy aliases remain eligible. Historical records are retained. The download component, copy, styling and interaction remain unchanged.

Sources: [IANA example domains](https://www.iana.org/help/example-domains), [RFC 7505 / implicit and null MX](https://www.rfc-editor.org/info/rfc7505/), [Node DNS](https://nodejs.org/api/dns.html), [disposable domain reference](https://github.com/disposable-email-domains/disposable-email-domains).

Validation: 17 focused checks cover rejected inputs before storage, valid aliases and MX, null MX, missing domains, fallback families, cache lifetime, pending lookup coalescing, timeout, sanitized retry errors and existing CV endpoint protections. Type checking passes.
