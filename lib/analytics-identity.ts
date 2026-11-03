import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const ANALYTICS_BROWSER_COOKIE = 'ps_visitor';
export const ANALYTICS_BROWSER_MAX_AGE = 90 * 24 * 60 * 60;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

function secret(): string {
  const value = process.env.ANALYTICS_SECRET || process.env.ADMIN_PASSWORD || process.env.POSTGRES_URL;
  if (!value?.trim()) throw new Error('Visitor measurement is unavailable.');
  return value;
}

function signature(payload: string): string {
  return createHmac('sha256', secret()).update(`browser-cookie-v1\0${payload}`).digest('hex');
}

/** Random browser identity, independent of IP addresses, device details and CV emails. */
export function analyticsBrowserIdentity(value?: string, now = Date.now()) {
  const seconds = Math.floor(now / 1000);
  let id: string | undefined, issuedAt: number | undefined;
  if (typeof value === 'string' && value.length <= 160) {
    const parts = value.split('.');
    if (parts.length === 4 && parts[0] === 'v1' && UUID.test(parts[1]) && /^[1-9][0-9]{0,11}$/.test(parts[2]) && /^[a-f0-9]{64}$/.test(parts[3])) {
      const issued = Number(parts[2]);
      const payload = parts.slice(0, 3).join('.');
      const expected = signature(payload);
      if (Number.isSafeInteger(issued) && issued <= seconds && seconds - issued < ANALYTICS_BROWSER_MAX_AGE &&
        timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(parts[3], 'hex'))) {
        id = parts[1]; issuedAt = issued;
      }
    }
  }
  const isNew = !id;
  if (!id) { id = randomUUID(); issuedAt = seconds; }
  const payload = `v1.${id}.${issuedAt}`;
  return {
    browserHash: createHmac('sha256', secret()).update(`browser-measurement-v1\0${id}`).digest('hex'),
    value: `${payload}.${signature(payload)}`,
    expires: new Date((issuedAt! + ANALYTICS_BROWSER_MAX_AGE) * 1000),
    isNew,
  };
}
