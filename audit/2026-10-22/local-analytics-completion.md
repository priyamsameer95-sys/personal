# Local analytics: reliable startup

The analytics dashboard stays at `http://127.0.0.1:4310/`. A per-user macOS LaunchAgent starts the local server when this account signs in and restarts it if it stops. It uses the installed Node executable and an independent runtime under `~/Library/Application Support/Priyam Analytics/`. It does not launch a browser, request a dashboard password, alter the website's authentication, or expose the server to the network.

## Review and installation

`scripts/install-local-analytics.cjs` defaults to a read-only dry run. Run it with `--dry-run` to review the exact executable, script, local URL, log directory and LaunchAgent destination. `--install` enables startup. The actual installation writes this account's `~/Library/LaunchAgents/com.priyamsameer.analytics.plist` and registers it with `launchctl` in the signed-in user's GUI session. Stop any manually started copy of this same dashboard before enabling the service.

The plist contains only paths and startup settings. It contains no passwords, tokens, database URLs or session cookies. The runtime copies only two explicit server modules, four dashboard assets and the existing `@vercel/postgres` dependency closure. It excludes repository `.env` files, existing state and package `.env` files. It does not use Downloads as its working directory or refer to Downloads from its plist: macOS privacy rules can prevent `launchd` from starting a service there even when an interactive terminal can start it.

Production data access remains a separate server-side connection at `~/Library/Application Support/Priyam Analytics/data/local-analytics.connection.json`. Installing startup does not create or bypass that connection. The existing server reads this file relative to its installed modules, retaining its strict owner and file-permission checks.

## Private files and restart behaviour

The runtime, data directory and log folder have owner-only permissions (`0700`); server modules, assets, empty log files and the LaunchAgent plist use `0600`. The installer rejects symlinked runtime, log, state or plist destinations and refuses a server whose startup is not bound to `127.0.0.1` on port `4310`.

The service uses `RunAtLoad`, `KeepAlive`, a ten-second restart throttle, and a restrictive `077` umask. Reinstalling an identical loaded service leaves it running. Changing the server, dashboard assets, package manifests or plist updates the installed copy and restarts only this service. The Mac must be awake and this account signed in for the loopback URL to respond; it is not a public website. The installed runtime survives moving or deleting the source repository. A changed Node runtime path requires reinstalling startup.

The existing `~/Downloads/Open Priyam Analytics.command` shortcut opens this installed service. If needed it registers the installed plist and requests that `launchd` start it, then checks the dashboard before opening the URL. It does not start another foreground server, depend on a Downloads working directory, or stop the dashboard when its terminal closes.

## Verification

`tests/local-analytics-install.test.cjs` covers XML escaping, fixed installed script invocation, restart settings, absence of secrets in the plist, explicit runtime and dependency copying, exclusion of `.env` files, the no-write dry run, private file permissions, initial installation, idempotence, changed configuration, missing runtimes, unsafe binds, unsupported options, non-macOS execution, symlink destinations and service inspection failures. Tests use isolated temporary folders and a simulated service command; they never register a real LaunchAgent.

## Completed on this Mac

The owner approved reading the existing database connection and saving it privately. It is installed only in the owner-only runtime data file; no credential, report records or contact addresses belong in the repository. The temporary source copy was removed after verifying the installed copy.

Live read-only reporting and CSV export both returned successful responses. The 7-day and 90-day filters retained all-time CV totals. Production has lead counters and first/latest request timestamps, but no per-request CV event table. The adapter therefore exposes dated request history as unavailable, preserves recorded totals, and omits its chart line. Reserved test-domain addresses are identified in the report.

The actual LaunchAgent was verified running and restarted automatically after its process was terminated. The listener stayed on 127.0.0.1:4310. An untrusted Origin received HTTP 403. The connection file permissions are 0600. All 236 automated tests passed, including production authentication and local read-only access protections.
