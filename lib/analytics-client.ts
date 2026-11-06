'use client';

/** No rendered text, form fields, email identities or arbitrary URLs enter this collector. */
export const CLIENT_ANALYTICS_TYPES = [
  'navigation_clicked', 'outbound_clicked', 'cv_opened', 'cv_submitted', 'cv_request_rejected',
  'cv_download_initiated', 'contact_opened', 'contact_clicked', 'email_copied', 'media_opened',
  'video_started', 'video_progress', 'video_completed', 'filter_changed', 'menu_opened',
  'cta_viewed', 'section_viewed', 'scroll_depth_reached', 'demo_started',
] as const;
export type ClientAnalyticsType = typeof CLIENT_ANALYTICS_TYPES[number];
export type ClientAnalyticsAction = { type: ClientAnalyticsType; target?: string; control?: string; value?: number };
type Payload = ClientAnalyticsAction | { type: 'page_view' | 'engagement'; activeMs?: number };
export type ClientAnalyticsEnvelope = Payload & {
  version: 2; eventId: string; path: string; referrer: string; pageViewId: string; tabId: string; sequence: number; campaign?: string;
};
type VisitContext = { pageViewId: string; accepted: boolean };
let currentVisit: VisitContext | null = null;
const safeId = /^[a-z0-9][a-z0-9_.:-]{0,95}$/;
const fixedTargets = new Set(['cv', 'email', 'phone', 'whatsapp', 'linkedin', 'image', 'video', 'gallery', 'work', 'github',
  'menu', 'company_website', 'live_product', 'external', 'filter', 'invalid', 'blocked_domain', 'domain_unavailable', 'rate_limited', 'storage_error']);
const CONTROL_SELECTOR = '[data-analytics], a[href], button[aria-pressed], button[role="tab"]';
const EXPOSURE_SELECTOR = 'section[id], article[id], [data-analytics-section], [data-analytics="cv_opened"], [data-analytics="contact_opened"], a[href^="/product/"]';
const TAB_KEY = 'portfolio-analytics-tab-v2';
const SEQUENCE_KEY = 'portfolio-analytics-sequence-v2';
let documentTabId: string | null = null;
let sequence = 0, cancelGeneration = 0;
let queue: Array<{ envelope: ClientAnalyticsEnvelope; accepted?: () => void }> = [];
let pumping = false;
const activeRequests = new Set<AbortController>();

export function publicAnalyticsPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 512 || !value.startsWith('/')) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/+$/, '') || '/';
  return path.length <= 240 && /^\/(?:$|(?:product|art|blog)(?:\/[a-z0-9_-]+(?:\/references)?)?$|cv$|github$)/.test(path) ? path : null;
}
export function normalizeClientAction(type: unknown, target?: unknown, control?: unknown, value?: unknown): ClientAnalyticsAction | null {
  if (typeof type !== 'string' || !(CLIENT_ANALYTICS_TYPES as readonly string[]).includes(type)) return null;
  if (target !== undefined && target !== null && (typeof target !== 'string' ||
    !(type === 'navigation_clicked' ? publicAnalyticsPath(target) : fixedTargets.has(target) || safeId.test(target)))) return null;
  if (control !== undefined && control !== null && (typeof control !== 'string' || !safeId.test(control))) return null;
  if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) return null;
  return { type: type as ClientAnalyticsType, ...(typeof target === 'string' ? { target: type === 'navigation_clicked' ? publicAnalyticsPath(target)! : target } : {}),
    ...(typeof control === 'string' ? { control } : {}), ...(typeof value === 'number' ? { value } : {}) };
}
export function analyticsPermitted(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined' || typeof navigator === 'undefined') return false;
  const privacy = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (navigator.doNotTrack === '1' || privacy.globalPrivacyControl || /(?:^|;\s*)ps_analytics_disabled=1(?:;|$)/.test(document.cookie)) return false;
  const production = ['www.priyamsameer.com', 'priyamsameer.com'].includes(window.location.hostname);
  return !!window.crypto?.randomUUID && (production || process.env.NEXT_PUBLIC_ANALYTICS_ALLOW_LOCAL === '1');
}
/** CV receives only an accepted page reference, never the browser identity. */
export function getAnalyticsContext(): { pageViewId: string } | null {
  return analyticsPermitted() && currentVisit?.accepted ? { pageViewId: currentVisit.pageViewId } : null;
}
export function emitAnalyticsAction(type: ClientAnalyticsType, target?: string, control?: string, value?: number): void {
  if (!analyticsPermitted()) return;
  const action = normalizeClientAction(type, target, control, value);
  if (action) document.dispatchEvent(new CustomEvent('portfolio:analytics', { detail: action }));
}
/** Explicit campaign vocabulary prevents personal/free-form query values being stored. */
export function analyticsCampaign(search: string): string | undefined {
  const query = new URLSearchParams(search), source = query.get('utm_source')?.toLowerCase();
  const medium = query.get('utm_medium')?.toLowerCase(), campaign = query.get('utm_campaign')?.toLowerCase();
  if (!source || !['linkedin', 'google', 'github', 'newsletter', 'email', 'whatsapp', 'portfolio'].includes(source)) return undefined;
  if (!medium || !['social', 'organic', 'referral', 'email', 'profile', 'cpc'].includes(medium) ||
    !campaign || !['portfolio', 'featured', 'cv', 'job-search', 'product-leadership', 'linkedin-featured'].includes(campaign)) return undefined;
  return `${source}:${medium}:${campaign}`;
}
/** Local 1-second sampler. Suspended long ticks receive no invented engagement. */
export function createEngagementClock(start: number) {
  let tick = start, activity = start, total = 0;
  return {
    sample(now: number, eligible: boolean, foregroundVideo = false) {
      const elapsed = Math.max(0, now - tick);
      if (eligible && elapsed <= 5_000) total += foregroundVideo ? elapsed : Math.min(elapsed, Math.max(0, activity + 60_000 - tick));
      tick = now;
      return Math.min(8 * 60 * 60_000, Math.round(total));
    },
    activity(now: number) { activity = now; },
    total() { return Math.min(8 * 60 * 60_000, Math.round(total)); },
  };
}
export function watchedPercent(ranges: Array<[number, number]>, duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 0;
  const ordered = ranges.filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b > a)
    .map(([a, b]) => [Math.max(0, a), Math.min(duration, b)]).sort((a, b) => a[0] - b[0]);
  let end = 0, total = 0;
  for (const [a, b] of ordered) { total += Math.max(0, b - Math.max(a, end)); end = Math.max(end, b); }
  return Math.min(100, Math.floor(total / duration * 100));
}
function uuid() { return window.crypto.randomUUID(); }
function tabId() {
  if (documentTabId) return documentTabId;
  try {
    const stored = sessionStorage.getItem(TAB_KEY);
    documentTabId = !window.opener && stored && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(stored) ? stored : uuid();
    const savedSequence = Number(sessionStorage.getItem(SEQUENCE_KEY));
    sequence = documentTabId === stored && Number.isSafeInteger(savedSequence) && savedSequence >= 0 && savedSequence < 999_000 ? savedSequence : 0;
    sessionStorage.setItem(TAB_KEY, documentTabId);
    sessionStorage.setItem(SEQUENCE_KEY, String(sequence));
  } catch { documentTabId = uuid(); }
  return documentTabId;
}
function nextSequence() {
  tabId(); sequence++;
  try { sessionStorage.setItem(SEQUENCE_KEY, String(sequence)); } catch { /* Current document retains its in-memory ordering. */ }
  return sequence;
}
function clearQueue() { queue = []; cancelGeneration++; currentVisit = null; for (const controller of activeRequests) controller.abort(); }
async function deliver(envelope: ClientAnalyticsEnvelope): Promise<boolean> {
  const request = async () => {
    if (!analyticsPermitted()) return false;
    const controller = new AbortController(); activeRequests.add(controller);
    const timer = window.setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch('/api/analytics', { method: 'POST', credentials: 'same-origin', mode: 'same-origin', keepalive: true,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope), signal: controller.signal });
      if (response.ok) return true;
      if (response.status < 500 && response.status !== 429) return false;
      throw new Error('Measurement unavailable');
    } finally { window.clearTimeout(timer); activeRequests.delete(controller); }
  };
  return envelope.type === 'page_view' && navigator.locks?.request
    ? navigator.locks.request('portfolio-analytics-identity', request) : request();
}
async function pump() {
  if (pumping) return;
  pumping = true;
  try {
    while (queue.length) {
      const task = queue.shift()!, generation = cancelGeneration;
      for (let attempt = 0; attempt < 3; attempt++) {
        if (!analyticsPermitted() || generation !== cancelGeneration) break;
        try { if (await deliver(task.envelope)) task.accepted?.(); break; }
        catch { if (attempt < 2) await new Promise<void>(resolve => window.setTimeout(resolve, attempt ? 1500 : 300)); }
      }
    }
  } finally { pumping = false; }
}
function enqueue(envelope: ClientAnalyticsEnvelope, accepted?: () => void) {
  if (!analyticsPermitted() || queue.length >= 100) return;
  queue.push({ envelope, accepted }); void pump();
}
export function analyticsLinkAction(element: Element): ClientAnalyticsAction | null {
  const href = element.getAttribute('href'); if (!href) return null;
  if (/^mailto:/i.test(href)) return { type: 'contact_clicked', target: 'email' };
  if (/^tel:/i.test(href)) return { type: 'contact_clicked', target: 'phone' };
  let url: URL; try { url = new URL(href, window.location.href); } catch { return null; }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
  if (url.origin === window.location.origin) {
    if (/^\/cv\/Priyam_Sameer_Zero_to_One_Product_Manager_CV\.pdf$/.test(url.pathname)) return { type: 'cv_download_initiated', target: 'cv' };
    const target = publicAnalyticsPath(url.pathname); return target ? { type: 'navigation_clicked', target } : null;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'linkedin.com') return { type: 'contact_clicked', target: 'linkedin' };
  if (host === 'wa.me' || host === 'api.whatsapp.com') return { type: 'contact_clicked', target: 'whatsapp' };
  if (host === 'github.com') return { type: 'outbound_clicked', target: 'github' };
  if (host === 'college.money' || host === 'upaj.org') return { type: 'outbound_clicked', target: 'live_product' };
  return { type: 'outbound_clicked', target: 'external' };
}
function actionFor(element: Element): ClientAnalyticsAction | null {
  const explicit = element.getAttribute('data-analytics');
  if (explicit === 'cv_download_clicked') return element.tagName === 'A' ? { type: 'cv_download_initiated', target: 'cv' } : null;
  const action = explicit ? normalizeClientAction(explicit, element.getAttribute('data-analytics-target')) : analyticsLinkAction(element);
  return action?.type === 'media_opened' && action.target === 'github' ? { type: 'demo_started', target: 'github' } : action;
}
function controlFor(element: Element, action?: ClientAnalyticsAction): string {
  const explicit = element.getAttribute('data-analytics-id'); if (explicit && safeId.test(explicit)) return explicit;
  const section = element.closest('section[id], article[id], [data-analytics-section]');
  const sectionId = section?.getAttribute('data-analytics-section') || section?.id;
  const region = element.closest('footer') ? 'footer' : element.closest('header') && !section ? 'header'
    : sectionId && safeId.test(sectionId) ? sectionId.slice(0, 42) : element.closest('dialog') ? 'dialog' : 'main';
  const candidates = Array.from(document.querySelectorAll(element.tagName === 'VIDEO' ? 'video' : CONTROL_SELECTOR));
  return `${region}:${action?.target?.startsWith('/') ? 'page-link' : action?.target || 'video'}:${Math.max(0, candidates.indexOf(element))}`.slice(0, 96);
}

/** Mount one public-page instance without changing the visible website. */
export function startAnalyticsVisit(pathValue: unknown): () => void {
  const path = publicAnalyticsPath(pathValue);
  if (!path || typeof window === 'undefined' || !window.crypto?.randomUUID) return () => {};
  let disposed = false, context: VisitContext | null = null, clock = createEngagementClock(performance.now());
  let focused = document.visibilityState === 'visible' && document.hasFocus(), lastActivityAt = Date.now(), lastFlushedActiveMs = -1, lastPointerAt = -Infinity;
  let referrer = '';
  try { referrer = document.referrer ? new URL(document.referrer).hostname : ''; } catch { /* Referrer unavailable. */ }
  const campaign = analyticsCampaign(window.location.search);
  const milestones = new Set<number>(), pendingExposures = new Map<Element, number>();
  let seen = new WeakSet<Element>();
  const observed = new WeakSet<Element>(), videos = new Map<HTMLVideoElement, {
    started: boolean; milestones: Set<number>; completed: boolean; ranges: Array<[number, number]>; lastPosition: number; lastTime: number;
  }>();
  let lastMediaGestureAt = -Infinity;
  let observer: IntersectionObserver | undefined, mutation: MutationObserver | undefined, scanTimer: number | undefined;
  let channel: BroadcastChannel | undefined;

  function envelope(action: Payload): ClientAnalyticsEnvelope | null {
    if (!context || !analyticsPermitted()) return null;
    return { version: 2, eventId: action.type === 'page_view' ? context.pageViewId : uuid(), pageViewId: context.pageViewId,
      tabId: tabId(), sequence: nextSequence(), path: path!, referrer, ...(campaign && action.type === 'page_view' ? { campaign } : {}), ...action };
  }
  function begin() {
    if (disposed || context || !analyticsPermitted() || document.visibilityState !== 'visible') return;
    context = { pageViewId: uuid(), accepted: false }; currentVisit = context;
    seen = new WeakSet<Element>(); lastFlushedActiveMs = -1; stopExposureTimers();
    clock = createEngagementClock(performance.now()); focused = document.visibilityState === 'visible' && document.hasFocus();
    lastActivityAt = Date.now();
    const owned = context, entry = envelope({ type: 'page_view' });
    if (entry) enqueue(entry, () => { owned.accepted = true; });
    if (observer) { observer.disconnect(); for (const element of document.querySelectorAll(EXPOSURE_SELECTOR)) observer.observe(element); }
  }
  function playing() { return [...videos.entries()].some(([video, state]) => state.started && !video.paused && !video.ended); }
  function sample() { return clock.sample(performance.now(), focused && analyticsPermitted(), playing()); }
  function action(value: ClientAnalyticsAction) {
    if (!analyticsPermitted() || document.visibilityState !== 'visible') return;
    begin(); const item = envelope(value); if (item) enqueue(item);
  }
  function flush(terminal = false) {
    if (!context || !analyticsPermitted()) return;
    const activeMs = sample();
    if (!terminal && activeMs === lastFlushedActiveMs) return;
    const item = envelope({ type: 'engagement', activeMs }); if (!item) return;
    lastFlushedActiveMs = activeMs;
    // This terminal flush must work after the page becomes hidden: the duration
    // itself was measured only while visible/focused, before this transition.
    if (terminal && context.accepted && navigator.sendBeacon) {
      try { if (navigator.sendBeacon('/api/analytics', new Blob([JSON.stringify(item)], { type: 'application/json' }))) return; } catch { /* keepalive fallback */ }
    }
    enqueue(item);
  }
  function active() {
    if (!analyticsPermitted() || document.visibilityState !== 'visible') return;
    begin();
    const now = Date.now();
    if (context && now - lastActivityAt >= 30 * 60_000) {
      // An idle tab must not attach resumed activity to the previous session.
      flush(); context = null; milestones.clear(); begin();
    }
    sample(); clock.activity(performance.now()); lastActivityAt = now;
  }
  function trustedActivity(event: Event) {
    if (event.isTrusted && analyticsPermitted() && document.visibilityState === 'visible') {
      if (event.type === 'pointermove') { if (Date.now() - lastPointerAt < 1000) return; lastPointerAt = Date.now(); }
      else if (event.target instanceof Element && event.target.closest('video')) lastMediaGestureAt = Date.now();
      begin(); active();
    }
  }
  function stopExposureTimers() { for (const timeout of pendingExposures.values()) window.clearTimeout(timeout); pendingExposures.clear(); }
  function refreshEligibility() {
    sample(); focused = document.visibilityState === 'visible' && document.hasFocus();
    if (!focused) { flush(true); stopExposureTimers(); }
    else { active(); begin(); if (observer) { observer.disconnect(); for (const element of document.querySelectorAll(EXPOSURE_SELECTOR)) observer.observe(element); } }
  }
  function isCTA(element: Element, value: ClientAnalyticsAction | null) {
    return !!value && (value.type === 'cv_opened' || value.type === 'contact_opened' || (value.type === 'navigation_clicked' && value.target?.startsWith('/product/')));
  }
  function onClick(event: MouseEvent) {
    const middleLink = event.type === 'auxclick' && event.button === 1;
    if (!event.isTrusted || (event.type === 'auxclick' ? !middleLink : event.button !== 0) || !analyticsPermitted() || document.visibilityState !== 'visible' || !(event.target instanceof Element)) return;
    if (event.target.closest('video')) lastMediaGestureAt = Date.now();
    const element = event.target.closest(CONTROL_SELECTOR);
    if (!element || element.hasAttribute('disabled') || element.getAttribute('aria-disabled') === 'true' || (middleLink && element.tagName !== 'A')) return;
    const value = actionFor(element); if (!value) return;
    active(); const control = controlFor(element, value);
    if (isCTA(element, value) && !seen.has(element)) { seen.add(element); action({ type: 'cta_viewed', target: value.target, control }); }
    action({ ...value, control });
  }
  function onCustom(event: Event) {
    const detail: unknown = (event as CustomEvent).detail;
    if (!detail || typeof detail !== 'object') return;
    const fields = detail as Record<string, unknown>;
    const value = normalizeClientAction(fields.type, fields.target, fields.control, typeof fields.value === 'number' ? fields.value : undefined);
    if (!value || !['cv_submitted', 'cv_request_rejected', 'cv_download_initiated', 'email_copied', 'filter_changed', 'demo_started'].includes(value.type)) return;
    active(); action(value);
  }
  function onScroll(event: Event) {
    if (!event.isTrusted || !analyticsPermitted() || !focused) return;
    active(); const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0 || window.scrollY <= 0) return;
    const depth = Math.min(100, window.scrollY / total * 100);
    for (const milestone of [25, 50, 75, 90]) if (depth >= milestone && !milestones.has(milestone)) {
      milestones.add(milestone); action({ type: 'scroll_depth_reached', target: 'page', value: milestone });
    }
  }
  function onPlay(event: Event) {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement) || video.hasAttribute('autoplay') || !analyticsPermitted() || !focused || Date.now() - lastMediaGestureAt > 5000) return;
    const state = videos.get(video) || { started: false, milestones: new Set<number>(), completed: false, ranges: [], lastPosition: video.currentTime, lastTime: performance.now() };
    videos.set(video, state);
    if (!state.started) { state.started = true; active(); action({ type: 'video_started', target: 'video', control: controlFor(video) }); }
  }
  function onVideoProgress(event: Event) {
    const video = event.target;
    if (!(video instanceof HTMLVideoElement) || !analyticsPermitted()) return;
    const state = videos.get(video); if (!state?.started) return;
    const now = performance.now(), elapsed = (now - state.lastTime) / 1000, travelled = video.currentTime - state.lastPosition;
    if (focused && elapsed > 0 && elapsed <= 5 && travelled > 0 && travelled <= elapsed * video.playbackRate + 0.5) {
      const previous = state.ranges[state.ranges.length - 1];
      if (previous && Math.abs(previous[1] - state.lastPosition) < 0.2) previous[1] = video.currentTime;
      else if (state.ranges.length < 1000) state.ranges.push([state.lastPosition, video.currentTime]);
    }
    state.lastPosition = video.currentTime; state.lastTime = now;
    if (!focused) return;
    const percent = watchedPercent(state.ranges, video.duration);
    for (const mark of [25, 50, 75, 90]) if (percent >= mark && !state.milestones.has(mark)) {
      state.milestones.add(mark); action({ type: 'video_progress', target: 'video', control: controlFor(video), value: mark });
    }
    if (event.type === 'ended' && percent >= 95 && !state.completed) {
      state.completed = true; action({ type: 'video_completed', target: 'video', control: controlFor(video), value: 100 });
    }
  }
  function scan() {
    if (!observer) return;
    for (const element of document.querySelectorAll(EXPOSURE_SELECTOR)) if (!observed.has(element)) { observed.add(element); observer.observe(element); }
  }
  if (typeof IntersectionObserver !== 'undefined') observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target, value = actionFor(element), cta = isCTA(element, value);
      const visible = entry.isIntersecting && (cta ? entry.intersectionRatio >= 0.5 : entry.intersectionRect.height > 0);
      if (!visible || !focused || !analyticsPermitted()) {
        const timer = pendingExposures.get(element); if (timer !== undefined) window.clearTimeout(timer); pendingExposures.delete(element); continue;
      }
      if (seen.has(element) || pendingExposures.has(element)) continue;
      pendingExposures.set(element, window.setTimeout(() => {
        pendingExposures.delete(element);
        if (!focused || !analyticsPermitted() || seen.has(element)) return;
        seen.add(element);
        if (cta && value) action({ type: 'cta_viewed', target: value.target, control: controlFor(element, value) });
        else { const id = element.getAttribute('data-analytics-section') || element.id; if (id && safeId.test(id)) action({ type: 'section_viewed', target: id, control: id }); }
      }, 1000));
    }
  }, { threshold: [0, 0.5] });
  if (typeof MutationObserver !== 'undefined' && document.body) {
    mutation = new MutationObserver(() => {
      if (scanTimer !== undefined) return;
      scanTimer = window.setTimeout(() => { scanTimer = undefined; scan(); }, 200);
    });
    mutation.observe(document.body, { childList: true, subtree: true });
  }
  // Duplicating a tab copies sessionStorage. Announce before entry collection
  // so an already-open tab can make the duplicate choose its own journey ID.
  if (typeof BroadcastChannel !== 'undefined' && analyticsPermitted()) {
    channel = new BroadcastChannel('portfolio-analytics-tabs');
    const instance = uuid(), opened = Date.now();
    channel.onmessage = event => {
      const value = event.data;
      if (!value || value.tab !== tabId() || value.instance === instance) return;
      if (value.type === 'hello') channel?.postMessage({ type: 'present', tab: tabId(), instance, opened });
      if (value.type === 'present' && (value.opened < opened || value.opened === opened && value.instance < instance) && !context) {
        documentTabId = uuid(); sequence = 0;
        try { sessionStorage.setItem(TAB_KEY, documentTabId); sessionStorage.setItem(SEQUENCE_KEY, '0'); } catch { /* Memory identity remains available. */ }
      }
    };
    channel.postMessage({ type: 'hello', tab: tabId(), instance, opened });
  }
  const entryTimer = window.setTimeout(() => { begin(); scan(); }, 100);
  const clockTimer = window.setInterval(() => { sample(); if (focused && playing()) lastActivityAt = Date.now(); }, 1000);
  const reportTimer = window.setInterval(() => { if (focused && analyticsPermitted()) flush(); }, 15_000);
  function onPreference() {
    if (!analyticsPermitted()) { clearQueue(); context = null; stopExposureTimers(); }
    else { context = null; begin(); scan(); }
  }
  function onPageHide() { flush(true); focused = false; stopExposureTimers(); }
  function onPageShow(event: PageTransitionEvent) { if (event.persisted) { context = null; begin(); scan(); } }
  document.addEventListener('click', onClick, true); document.addEventListener('auxclick', onClick, true);
  document.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('pointerdown', trustedActivity, { passive: true });
  document.addEventListener('pointermove', trustedActivity, { passive: true });
  document.addEventListener('keydown', trustedActivity); document.addEventListener('touchstart', trustedActivity, { passive: true });
  document.addEventListener('visibilitychange', refreshEligibility); document.addEventListener('play', onPlay, true);
  document.addEventListener('timeupdate', onVideoProgress, true); document.addEventListener('ended', onVideoProgress, true);
  document.addEventListener('portfolio:analytics', onCustom);
  window.addEventListener('focus', refreshEligibility); window.addEventListener('blur', refreshEligibility);
  window.addEventListener('pagehide', onPageHide); window.addEventListener('pageshow', onPageShow);
  window.addEventListener('portfolio:analytics-preference', onPreference);
  return () => {
    if (disposed) return;
    flush(true); disposed = true;
    if (currentVisit === context) currentVisit = null;
    window.clearTimeout(entryTimer); window.clearInterval(clockTimer); window.clearInterval(reportTimer);
    if (scanTimer !== undefined) window.clearTimeout(scanTimer);
    stopExposureTimers(); observer?.disconnect(); mutation?.disconnect(); channel?.close();
    document.removeEventListener('click', onClick, true); document.removeEventListener('auxclick', onClick, true);
    document.removeEventListener('scroll', onScroll); document.removeEventListener('pointerdown', trustedActivity);
    document.removeEventListener('pointermove', trustedActivity);
    document.removeEventListener('keydown', trustedActivity); document.removeEventListener('touchstart', trustedActivity);
    document.removeEventListener('visibilitychange', refreshEligibility); document.removeEventListener('play', onPlay, true);
    document.removeEventListener('timeupdate', onVideoProgress, true); document.removeEventListener('ended', onVideoProgress, true);
    document.removeEventListener('portfolio:analytics', onCustom); window.removeEventListener('focus', refreshEligibility);
    window.removeEventListener('blur', refreshEligibility); window.removeEventListener('pagehide', onPageHide);
    window.removeEventListener('pageshow', onPageShow); window.removeEventListener('portfolio:analytics-preference', onPreference);
  };
}
