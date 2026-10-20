// Shared, deliberately small event vocabulary. Never send rendered text, entered
// form values, contact addresses, query strings or arbitrary external URLs.
export const ANALYTICS_EVENT_TYPES = [
  'page_view', 'navigation_clicked', 'outbound_clicked', 'cv_opened',
  'cv_download_clicked', 'contact_opened', 'contact_clicked', 'email_copied',
  'media_opened', 'video_started', 'filter_changed', 'menu_opened',
] as const;
export const ANALYTICS_INTERACTION_TARGETS = [
  'cv', 'email', 'phone', 'whatsapp', 'linkedin', 'image', 'video', 'gallery',
  'work', 'github', 'menu', 'company_website', 'live_product', 'external', 'filter',
] as const;

export type AnalyticsEventType = typeof ANALYTICS_EVENT_TYPES[number];
export type AnalyticsInteractionType = Exclude<AnalyticsEventType, 'page_view'>;
export type AnalyticsInteractionTarget = typeof ANALYTICS_INTERACTION_TARGETS[number];
export type AnalyticsAction = { type: 'page_view'; target?: never } |
  { type: AnalyticsInteractionType; target: string };

export function normalizeAnalyticsAction(
  typeValue: unknown,
  targetValue: unknown,
  normalizeNavigationTarget: (value: unknown) => string | null,
): AnalyticsAction | null {
  const type = typeValue === undefined ? 'page_view' : typeValue;
  if (typeof type !== 'string' || !(ANALYTICS_EVENT_TYPES as readonly string[]).includes(type)) return null;
  if (type === 'page_view') return targetValue === undefined ? { type } : null;
  if (type === 'navigation_clicked') {
    const target = normalizeNavigationTarget(targetValue);
    return target ? { type, target } : null;
  }
  if (typeof targetValue !== 'string' || !(ANALYTICS_INTERACTION_TARGETS as readonly string[]).includes(targetValue)) return null;
  return { type: type as AnalyticsInteractionType, target: targetValue };
}
