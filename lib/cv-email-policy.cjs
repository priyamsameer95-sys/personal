'use strict';

// Static domain policy shared by new CV requests and historical reports. Reports
// do not send mail or run DNS checks, and never alter the original records.
const blockedDomains = [
  '10minutemail.com', '10minutemail.net', '1secmail.com', '1secmail.net',
  '1secmail.org', 'dispostable.com', 'dropmail.me', 'guerrillamail.com',
  'guerrillamail.net', 'maildrop.cc', 'mailinator.com', 'sharklasers.com',
  'tempmail.io', 'throwawaymail.com', 'yopmail.com',
  'example.com', 'example.net', 'example.org',
];
const blockedSuffixes = ['example', 'invalid', 'test', 'localhost', 'local', 'internal', 'onion'];

// [.] works identically in JavaScript and PostgreSQL regular expressions. Keep
// this generated from fixed policy values; callers bind it as a SQL parameter.
const BLOCKED_CV_DOMAIN_PATTERN = `(^|[.])(${[...blockedDomains, ...blockedSuffixes].map(domain => domain.replace(/\./g, '[.]')).join('|')})$`;
const blockedDomain = new RegExp(BLOCKED_CV_DOMAIN_PATTERN, 'i');

function isBlockedCVEmailDomain(domain) {
  return blockedDomain.test(domain);
}

module.exports = { BLOCKED_CV_DOMAIN_PATTERN, isBlockedCVEmailDomain };
