import { Resolver } from 'node:dns/promises';
import { isBlockedCVEmailDomain } from './cv-email-policy.cjs';
export { isBlockedCVEmailDomain } from './cv-email-policy.cjs';

export class CVEmailRejectedError extends Error {
  constructor() { super('Please enter a valid personal or work email address.'); }
}
export class CVEmailCheckUnavailableError extends Error {
  constructor() { super('Your email could not be checked. Please try again shortly.'); }
}

type MailResolver = Pick<Resolver, 'resolveMx' | 'resolve4' | 'resolve6' | 'cancel'>;
type DomainStatus = 'allowed' | 'rejected';
const absent = (error: unknown) => ['ENODATA', 'ENOTFOUND'].includes((error as NodeJS.ErrnoException)?.code || '');

export function createCVEmailDomainCheck({
  resolverFactory = (): MailResolver => new Resolver({ timeout: 1200, tries: 1 }),
  now = Date.now,
  timeoutMs = 2500,
}: { resolverFactory?: () => MailResolver; now?: () => number; timeoutMs?: number } = {}) {
  // Cache domain results only, never addresses. Bounds also limit repeated DNS
  // work from bots; a new domain cannot grow memory or pending work indefinitely.
  const cache = new Map<string, { status: DomainStatus; expires: number }>();
  const pending = new Map<string, Promise<DomainStatus>>();

  async function lookup(domain: string): Promise<DomainStatus> {
    const resolver = resolverFactory();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        (async (): Promise<DomainStatus> => {
          let records: Awaited<ReturnType<MailResolver['resolveMx']>> = [];
          try { records = await resolver.resolveMx(domain); }
          catch (error) {
            if ((error as NodeJS.ErrnoException)?.code === 'ENOTFOUND') return 'rejected';
            if (!absent(error)) throw error;
          }
          if (records.length) {
            // A null MX ("."; Node may expose it as an empty exchange) explicitly
            // declines mail. Do not override it with the website's A/AAAA record.
            return records.some(record => record.exchange && record.exchange !== '.') ? 'allowed' : 'rejected';
          }
          // RFC 5321 permits implicit MX via A/AAAA when no MX was published.
          const usable = (addresses: string[]) => {
            if (!addresses.length) throw Object.assign(new Error(), { code: 'ENODATA' });
            return true;
          };
          try {
            // One usable family is sufficient; a slow AAAA query must not delay
            // a valid A result (or the reverse).
            await Promise.any([resolver.resolve4(domain).then(usable), resolver.resolve6(domain).then(usable)]);
            return 'allowed';
          } catch (error) {
            const failures = (error as AggregateError).errors;
            if (!Array.isArray(failures) || failures.some(failure => !absent(failure))) throw new CVEmailCheckUnavailableError();
            return 'rejected';
          }
        })(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new CVEmailCheckUnavailableError()), timeoutMs); }),
      ]);
    } catch { throw new CVEmailCheckUnavailableError(); }
    finally { if (timer) clearTimeout(timer); resolver.cancel(); }
  }

  return async (email: string): Promise<void> => {
    const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase();
    if (isBlockedCVEmailDomain(domain)) throw new CVEmailRejectedError();
    const cached = cache.get(domain);
    let status = cached && cached.expires > now() ? cached.status : undefined;
    if (!status) {
      let work = pending.get(domain);
      if (!work) {
        if (pending.size >= 16) throw new CVEmailCheckUnavailableError();
        work = lookup(domain).then(result => {
          if (cache.size >= 512) cache.delete(cache.keys().next().value!);
          cache.set(domain, { status: result, expires: now() + (result === 'allowed' ? 3600000 : 300000) });
          return result;
        }).finally(() => { pending.delete(domain); });
        pending.set(domain, work);
      }
      status = await work;
    }
    if (status === 'rejected') throw new CVEmailRejectedError();
  };
}

// Checks domain plausibility, not whether a mailbox exists or who owns it.
export const checkCVEmailDomain = createCVEmailDomainCheck();
