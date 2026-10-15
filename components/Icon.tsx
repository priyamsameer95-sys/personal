export type IconName = 'arrow-up-right' | 'arrow-right' | 'arrow-left' | 'arrow-down' | 'arrow-up' | 'plus' | 'minus' | 'close' | 'download' | 'upload' | 'trash' | 'check' | 'info' | 'warning' | 'image' | 'file' | 'edit' | 'eye' | 'eye-off';

const paths: Record<IconName, string> = {
  'arrow-up-right': 'M7 17 17 7M7 7h10v10',
  'arrow-right': 'M5 12h14m-6-6 6 6-6 6',
  'arrow-left': 'M19 12H5m6-6-6 6 6 6',
  'arrow-down': 'M12 5v14m-6-6 6 6 6-6',
  'arrow-up': 'M12 19V5m-6 6 6-6 6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  close: 'm6 6 12 12M6 18 18 6',
  download: 'M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5',
  upload: 'M12 16V3m-5 5 5-5 5 5M5 16v5h14v-5',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
  check: 'm5 12 4 4L19 6',
  info: 'M12 11v6m0-10v.1M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
  warning: 'M12 3 2 21h20L12 3Zm0 6v5m0 3v.1',
  image: 'M3 3h18v18H3V3Zm0 13 6-6 12 11M15 7h.01',
  file: 'M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8m-8 4h8',
  edit: 'm15 4 5 5M4 20l5-1L21 7l-5-5L4 14v6Z',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
  'eye-off': 'm3 3 18 18M10 5a11 11 0 0 1 2 0c6 0 10 7 10 7a19 19 0 0 1-4 4M6 6a19 19 0 0 0-4 6s4 7 10 7a12 12 0 0 0 5-1M9 9a4 4 0 0 0 6 6',
};

/** Decorative by default: the containing link or button supplies the accessible name. */
export default function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`ui-icon ${className}`.trim()} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" data-icon={name}><path d={paths[name]} /></svg>;
}
