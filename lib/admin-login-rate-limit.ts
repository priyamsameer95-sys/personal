import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import db from '@/lib/db';

const IP_ATTEMPT_LIMIT = 5;
const GLOBAL_ATTEMPT_LIMIT = 50;
const WINDOW_SECONDS = 15 * 60;
let schemaReady: Promise<void> | undefined;

export class AdminLoginRateLimitError extends Error {
  constructor(public readonly retryAfter: number) {
    super('Too many sign-in attempts. Please try again later.');
  }
}

export class AdminLoginRateStorageError extends Error {
  constructor() { super('Sign-in is temporarily unavailable. Please try again later.'); }
}

function clientBucket(request: Pick<Request, 'headers'>): string {
  // Only trust the address set by our deployment's edge. On an unrecognized
  // host, changing arbitrary forwarding headers must not create fresh buckets.
  // https://vercel.com/docs/headers/request-headers#x-vercel-forwarded-for
  const supplied = process.env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for') : null;
  let address = 'unknown';
  if (supplied && supplied.length <= 45 && isIP(supplied)) {
    address = isIP(supplied) === 6
      ? new URL(`http://[${supplied}]/`).hostname.slice(1, -1)
      : supplied;
  }
  const secret = process.env.ADMIN_LOGIN_RATE_SECRET || process.env.POSTGRES_URL;
  if (!secret?.trim()) throw new AdminLoginRateStorageError();
  return createHmac('sha256', secret).update(`admin-login-budget-v1\0${address}`).digest('hex');
}

async function ensureSchema(): Promise<void> {
  if (!process.env.POSTGRES_URL?.trim()) throw new AdminLoginRateStorageError();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS admin_login_attempt_budgets (
        window_start TIMESTAMPTZ PRIMARY KEY,
        expires_at TIMESTAMPTZ NOT NULL,
        attempt_count INTEGER NOT NULL CHECK (attempt_count BETWEEN 1 AND 50),
        ip_counts JSONB NOT NULL CHECK (jsonb_typeof(ip_counts) = 'object')
      )`;
    })().catch(() => { schemaReady = undefined; throw new AdminLoginRateStorageError(); });
  }
  await schemaReady;
}

/** Reserve one bounded password comparison before checking the supplied password.
 * Both failed and successful comparisons consume a slot. An atomic shared row
 * bounds distributed guesses and keeps rejected attempts from incrementing it.
 */
export async function reserveAdminLoginAttempt(request: Pick<Request, 'headers'>): Promise<void> {
  try {
    const fingerprint = clientBucket(request);
    await ensureSchema();
    await db`DELETE FROM admin_login_attempt_budgets WHERE expires_at < NOW() - INTERVAL '1 day'`;
    const result = await db`WITH current_window AS (
      SELECT to_timestamp(floor(extract(epoch FROM statement_timestamp()) / ${WINDOW_SECONDS}) * ${WINDOW_SECONDS}) AS starts_at
    ), reservation AS (
      INSERT INTO admin_login_attempt_budgets (window_start, expires_at, attempt_count, ip_counts)
      SELECT starts_at, starts_at + INTERVAL '15 minutes', 1, jsonb_build_object(${fingerprint}::TEXT, 1)
      FROM current_window
      ON CONFLICT (window_start) DO UPDATE SET
        attempt_count = admin_login_attempt_budgets.attempt_count + 1,
        ip_counts = jsonb_set(admin_login_attempt_budgets.ip_counts, ARRAY[${fingerprint}]::TEXT[],
          to_jsonb(COALESCE((admin_login_attempt_budgets.ip_counts ->> ${fingerprint})::INTEGER, 0) + 1), true)
      WHERE admin_login_attempt_budgets.attempt_count < ${GLOBAL_ATTEMPT_LIMIT}
        AND COALESCE((admin_login_attempt_budgets.ip_counts ->> ${fingerprint})::INTEGER, 0) < ${IP_ATTEMPT_LIMIT}
      RETURNING attempt_count
    ) SELECT EXISTS (SELECT 1 FROM reservation) AS allowed,
      GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
        (SELECT starts_at + INTERVAL '15 minutes' FROM current_window) - statement_timestamp()
      ))))::INTEGER AS retry_after`;
    const row = result.rows[0];
    if (typeof row?.allowed !== 'boolean' || !Number.isSafeInteger(row.retry_after) ||
      row.retry_after < 1 || row.retry_after > WINDOW_SECONDS) throw new AdminLoginRateStorageError();
    if (!row.allowed) throw new AdminLoginRateLimitError(row.retry_after);
  } catch (error) {
    if (error instanceof AdminLoginRateLimitError || error instanceof AdminLoginRateStorageError) throw error;
    // Database and transport diagnostics can contain server configuration.
    throw new AdminLoginRateStorageError();
  }
}
