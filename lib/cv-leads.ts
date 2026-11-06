import { createHmac } from 'node:crypto';
import db from '@/lib/db';
import { CV_SHA256 } from '@/lib/cv-download';
import { BLOCKED_CV_DOMAIN_PATTERN } from './cv-email-policy.cjs';

export const CV_INTEREST_NOTICE = 'cv-interest-v1';
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
let schemaReady: Promise<void> | undefined;

export class CVLeadStorageError extends Error {
  constructor() { super('CV interest storage is unavailable.'); }
}
export class CVLeadRateLimitError extends Error {
  constructor(public retryAfter: number) { super('Too many CV requests.'); }
}
export class CVLeadConflictError extends Error {
  constructor() { super('Please reopen the CV form and try again.'); }
}
let receiptSchemaReady: Promise<void> | undefined;

/** A request receipt is separate from anonymous analytics: no browser or view ID. */
export async function recordCVInterestOnce(email: string, sourcePath: string, ip: string, requestId: string): Promise<boolean> {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestId)) throw new CVLeadConflictError();
  await ensureCVLeadSchema();
  if (!receiptSchemaReady) receiptSchemaReady = (async () => {
    await db`CREATE TABLE IF NOT EXISTS cv_request_receipts (
      request_id UUID PRIMARY KEY, email_hash CHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`;
  })().catch(() => { receiptSchemaReady = undefined; throw new CVLeadStorageError(); });
  await receiptSchemaReady;
  const secret = process.env.CV_LEAD_RATE_SECRET || process.env.ADMIN_PASSWORD || process.env.POSTGRES_URL!;
  const emailHash = createHmac('sha256', secret).update(`cv-receipt-v1\0${email}`).digest('hex');
  const old = await db`SELECT email_hash FROM cv_request_receipts WHERE request_id = ${requestId}`;
  if (old.rows.length) {
    if (old.rows[0].email_hash !== emailHash) throw new CVLeadConflictError();
    return false;
  }
  const bucket = Math.floor(Date.now() / RATE_WINDOW_MS), expiresAt = new Date((bucket + 1) * RATE_WINDOW_MS);
  const fingerprint = createHmac('sha256', secret).update(`${ip}\0${bucket}`).digest('hex');
  try {
    await db`DELETE FROM cv_download_rate_limits WHERE expires_at < NOW()`;
    const allowance = await db`INSERT INTO cv_download_rate_limits (fingerprint, expires_at)
      VALUES (${fingerprint}, ${expiresAt.toISOString()})
      ON CONFLICT (fingerprint) DO UPDATE SET request_count = cv_download_rate_limits.request_count + 1
      WHERE cv_download_rate_limits.request_count < ${RATE_LIMIT} RETURNING request_count`;
    if (!allowance.rows.length) throw new CVLeadRateLimitError(Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000)));
    const result = await db`WITH claimed AS (
      INSERT INTO cv_request_receipts (request_id, email_hash) VALUES (${requestId}, ${emailHash})
      ON CONFLICT (request_id) DO NOTHING RETURNING request_id
    ), saved_lead AS (
      INSERT INTO cv_download_leads (email, last_source_path, cv_sha256, notice_version)
      SELECT ${email}, ${sourcePath}, ${CV_SHA256}, ${CV_INTEREST_NOTICE} FROM claimed
      ON CONFLICT (email) DO UPDATE SET last_requested_at = NOW(), download_count = cv_download_leads.download_count + 1,
        last_source_path = EXCLUDED.last_source_path, cv_sha256 = EXCLUDED.cv_sha256, notice_version = EXCLUDED.notice_version
      RETURNING email
    ), saved_event AS (
      INSERT INTO cv_download_events (email, source_path, cv_sha256)
      SELECT email, ${sourcePath}, ${CV_SHA256} FROM saved_lead RETURNING id
    ) SELECT COUNT(*)::INTEGER AS saved FROM saved_event`;
    if (Number(result.rows[0]?.saved) > 0) return true;
    const receipt = await db`SELECT email_hash FROM cv_request_receipts WHERE request_id = ${requestId}`;
    if (receipt.rows[0]?.email_hash !== emailHash) throw new CVLeadConflictError();
    return false;
  } catch (error) {
    if (error instanceof CVLeadRateLimitError || error instanceof CVLeadConflictError) throw error;
    throw new CVLeadStorageError();
  }
}

// This schema is independent of the existing content migration, which only
// initializes a new content database. Failed initialization is safe to retry.
export async function ensureCVLeadSchema() {
  if (!process.env.POSTGRES_URL?.trim()) throw new CVLeadStorageError();
  if (!schemaReady) {
    schemaReady = (async () => {
      await db`CREATE TABLE IF NOT EXISTS cv_download_leads (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE CHECK (char_length(email) <= 254),
        first_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        download_count INTEGER NOT NULL DEFAULT 1 CHECK (download_count > 0),
        last_source_path TEXT NOT NULL,
        cv_sha256 CHAR(64) NOT NULL,
        notice_version TEXT NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS cv_download_rate_limits (
        fingerprint CHAR(64) PRIMARY KEY,
        request_count INTEGER NOT NULL DEFAULT 1,
        expires_at TIMESTAMPTZ NOT NULL
      )`;
      await db`CREATE TABLE IF NOT EXISTS cv_download_events (
        id BIGSERIAL PRIMARY KEY,
        email TEXT NOT NULL CHECK (char_length(email) <= 254),
        requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source_path TEXT NOT NULL,
        cv_sha256 CHAR(64) NOT NULL
      )`;
      await db`CREATE INDEX IF NOT EXISTS cv_download_events_time_idx ON cv_download_events (requested_at)`;
    })().catch(() => { schemaReady = undefined; throw new CVLeadStorageError(); });
  }
  await schemaReady;
}

export function normalizeCVEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+$/.test(email)) return null;
  const [local, domain] = email.split('@');
  if (local.length > 64 || local.startsWith('.') || local.endsWith('.') || local.includes('..')) return null;
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some(label => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  return email;
}

export function normalizeCVSource(value: unknown): string {
  if (typeof value !== 'string' || value.length > 240 || !/^\/(?!\/)[^?#\s\x00-\x1f]*$/.test(value)) return '/';
  return value;
}

export async function recordCVInterest(email: string, sourcePath: string, ip: string): Promise<void> {
  await ensureCVLeadSchema();
  const now = Date.now();
  const bucket = Math.floor(now / RATE_WINDOW_MS);
  const expiresAt = new Date((bucket + 1) * RATE_WINDOW_MS);
  const secret = process.env.CV_LEAD_RATE_SECRET || process.env.ADMIN_PASSWORD || process.env.POSTGRES_URL!;
  const fingerprint = createHmac('sha256', secret).update(`${ip}\0${bucket}`).digest('hex');
  try {
    await db`DELETE FROM cv_download_rate_limits WHERE expires_at < NOW()`;
    const allowance = await db`INSERT INTO cv_download_rate_limits (fingerprint, expires_at)
      VALUES (${fingerprint}, ${expiresAt.toISOString()})
      ON CONFLICT (fingerprint) DO UPDATE SET request_count = cv_download_rate_limits.request_count + 1
      WHERE cv_download_rate_limits.request_count < ${RATE_LIMIT}
      RETURNING request_count`;
    if (!allowance.rows.length) throw new CVLeadRateLimitError(Math.max(1, Math.ceil((expiresAt.getTime() - now) / 1000)));
    // One database statement commits both the contact counter and dated event.
    await db`WITH saved_lead AS (INSERT INTO cv_download_leads (email, last_source_path, cv_sha256, notice_version)
      VALUES (${email}, ${sourcePath}, ${CV_SHA256}, ${CV_INTEREST_NOTICE})
      ON CONFLICT (email) DO UPDATE SET
        last_requested_at = NOW(), download_count = cv_download_leads.download_count + 1,
        last_source_path = EXCLUDED.last_source_path, cv_sha256 = EXCLUDED.cv_sha256,
        notice_version = EXCLUDED.notice_version RETURNING email)
      INSERT INTO cv_download_events (email, source_path, cv_sha256)
      SELECT email, ${sourcePath}, ${CV_SHA256} FROM saved_lead`;
  } catch (error) {
    if (error instanceof CVLeadRateLimitError) throw error;
    throw new CVLeadStorageError();
  }
}

export interface CVLead {
  email: string;
  first_requested_at: string;
  last_requested_at: string;
  download_count: number;
  last_source_path: string;
}

export async function listCVInterests(limit = 200): Promise<{ leads: CVLead[]; total: number; excludedCVContacts: number; excludedCVRequests: number }> {
  await ensureCVLeadSchema();
  const boundedLimit = Math.max(1, Math.min(10000, Math.floor(limit)));
  try {
    const [records, count] = await Promise.all([
      db`SELECT email, first_requested_at, last_requested_at, download_count, last_source_path
        FROM cv_download_leads WHERE SPLIT_PART(LOWER(TRIM(email)), '@', 2) !~* ${BLOCKED_CV_DOMAIN_PATTERN}
        ORDER BY last_requested_at DESC LIMIT ${boundedLimit}`,
      db`SELECT COUNT(DISTINCT LOWER(TRIM(email))) FILTER (WHERE SPLIT_PART(LOWER(TRIM(email)), '@', 2) !~* ${BLOCKED_CV_DOMAIN_PATTERN})::INTEGER AS total,
        COUNT(DISTINCT LOWER(TRIM(email))) FILTER (WHERE SPLIT_PART(LOWER(TRIM(email)), '@', 2) ~* ${BLOCKED_CV_DOMAIN_PATTERN})::INTEGER AS excluded_contacts,
        COALESCE(SUM(download_count) FILTER (WHERE SPLIT_PART(LOWER(TRIM(email)), '@', 2) ~* ${BLOCKED_CV_DOMAIN_PATTERN}), 0)::INTEGER AS excluded_requests
        FROM cv_download_leads`,
    ]);
    return { leads: records.rows as CVLead[], total: Number(count.rows[0]?.total || 0),
      excludedCVContacts: Number(count.rows[0]?.excluded_contacts || 0), excludedCVRequests: Number(count.rows[0]?.excluded_requests || 0) };
  } catch { throw new CVLeadStorageError(); }
}

export function cvInterestsCSV(leads: CVLead[]): string {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    const safe = /^[\s\x00-\x1f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = [['Email', 'First request (UTC)', 'Last request (UTC)', 'Recorded requests', 'Last page'],
    ...leads.map(lead => [lead.email, lead.first_requested_at, lead.last_requested_at, lead.download_count, lead.last_source_path])];
  return rows.map(row => row.map(cell).join(',')).join('\r\n');
}
