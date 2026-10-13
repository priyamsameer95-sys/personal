import { brandAssets, companyBrandIds } from '@/lib/brands';
import styles from './brand-marks.module.css';

export default function BrandMarks({ companyId, brandIds, small = false, className = '' }: {
  companyId?: string;
  brandIds?: readonly string[];
  small?: boolean;
  className?: string;
}) {
  const brands = Array.from(new Set(brandIds || (companyId && companyBrandIds[companyId]) || []))
    .flatMap(id => brandAssets[id] ? [{ id, ...brandAssets[id] }] : []);
  if (!brands.length) return null;

  return <div className={`${styles.marks}${small ? ` ${styles.small}` : ''}${className ? ` ${className}` : ''}`}>
    {brands.map(brand => <span key={brand.id} className={`${styles.mark}${brand.background === 'dark' ? ` ${styles.dark}` : ''}${brand.label ? ` ${styles.withLabel}` : brand.width / brand.height < 1.5 ? ` ${styles.square}` : ''}`}>
      {/* Original logo artwork retains its colours and aspect ratio. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={brand.src} alt={`${brand.name} logo`} width={brand.width} height={brand.height} style={{ aspectRatio: `${brand.width} / ${brand.height}` }} loading="lazy" decoding="async" />
      {brand.label && <span>{brand.label}</span>}
    </span>)}
  </div>;
}
