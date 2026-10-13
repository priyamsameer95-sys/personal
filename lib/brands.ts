export interface BrandAsset {
  name: string;
  src: string;
  width: number;
  height: number;
  sourcePage: string;
  sourceUrl: string;
  background?: 'dark';
  label?: string;
}

/** Original artwork from the brands' own websites; provenance is in BRAND-SOURCES.md. */
export const brandAssets: Record<string, BrandAsset> = {
  cashkaro: {
    name: 'CashKaro', src: '/brands/cashkaro.svg', width: 100, height: 25,
    sourcePage: 'https://cashkaro.com/',
    sourceUrl: 'https://asset22.ckassets.com/wp/wp-content/themes/CashKaro_WP_V1/img/cashkaro_logo_v1.svg',
  },
  credflow: {
    name: 'CredFlow', src: '/brands/credflow.png', width: 462, height: 462,
    sourcePage: 'https://credflow.in/', sourceUrl: 'https://credflow.in/credflow-logo.png',
  },
  absolute: {
    name: 'Absolute', src: '/brands/absolute.svg', width: 316, height: 68, background: 'dark',
    sourcePage: 'https://www.absolute.bio/',
    sourceUrl: 'https://www.absolute.bio/assets/absolute-logo-png-1-vectorized-sad-fbpj.svg',
  },
  cept: {
    name: 'CEPT University', src: '/brands/cept.svg', width: 243, height: 77,
    sourcePage: 'https://cept.ac.in/', sourceUrl: 'https://cept.ac.in/img/icons/logos/cept-logo.svg',
  },
  bankkaro: {
    name: 'BankKaro', src: '/brands/bankkaro.png', width: 728, height: 75, background: 'dark',
    sourcePage: 'https://bankkaro.com/', sourceUrl: 'https://d2sriifpjiqv0p.cloudfront.net/bankkaro/bankkaro_logo4.png',
  },
  upaj: {
    name: 'Upaj', src: '/brands/upaj-black.svg', width: 136, height: 46,
    sourcePage: 'https://www.upaj.org/riskstac', sourceUrl: 'https://www.upaj.org/assets/images/upaj_logo_black.svg',
  },
  urbankhet: {
    name: 'UrbanKhet', src: '/brands/urbankhet.png', width: 500, height: 500,
    sourcePage: 'https://gusec.edu.in/tide/', sourceUrl: 'https://gusec.edu.in/wp-content/uploads/2022/01/5.png',
  },
  'iima-ventures': {
    name: 'IIMA Ventures', src: '/brands/iima-ventures.png', width: 505, height: 250,
    sourcePage: 'https://iimaventures.com/', sourceUrl: 'https://iimaventures.com/wp-content/uploads/2024/01/IIMA-Logo.png',
  },
  gusec: {
    name: 'GUSEC', src: '/brands/gusec.png', width: 1759, height: 539,
    sourcePage: 'https://gusec.edu.in/', sourceUrl: 'https://gusec.edu.in/wp-content/uploads/2019/02/GUSEC-Board-Meeting-20th-SEP-2025.png',
  },
  'college-money': {
    name: 'College.Money', label: 'College.Money', src: '/brands/college-money-icon.svg', width: 28, height: 28, background: 'dark',
    sourcePage: 'https://college.money/abroad', sourceUrl: 'https://college.money/assets/icons/logo-college-money.svg',
  },
  'water-farmers': {
    name: 'Water Farmers', src: '/brands/water-farmers.png', width: 1000, height: 448,
    sourcePage: 'https://waterfarmers.com/', sourceUrl: 'https://waterfarmers.com/wp-content/uploads/2018/03/PNG.png',
  },
  udemy: {
    name: 'Udemy', src: '/brands/udemy.svg', width: 102, height: 38,
    sourcePage: 'https://about.udemy.com/',
    sourceUrl: 'https://about.udemy.com/wp-content/themes/wp-about-v4/assets/images/udemy-logo.svg',
  },
  pendo: {
    name: 'Pendo', src: '/brands/pendo.svg', width: 216, height: 50,
    sourcePage: 'https://www.pendo.io/brand-guide/logo/',
    sourceUrl: 'https://cdn.builder.io/api/v1/image/assets%2F6a96e08774184353b3aa88032e406411%2Fbd51e370ecda496498d96c17e3a31034',
  },
};

export const companyBrandIds: Record<string, readonly string[]> = {
  cashkaro: ['cashkaro', 'bankkaro'],
  credflow: ['credflow'],
  absolute: ['absolute', 'upaj'],
  urbankhet: ['urbankhet'],
  'founder-programmes': ['iima-ventures', 'gusec'],
  'water-farmers': ['water-farmers'],
  cept: ['cept'],
};

export function caseBrandIds(companyId: string, slug: string): readonly string[] {
  const company = companyBrandIds[companyId] || [];
  return slug === 'cashkaro-college-money-education-loans' ? [...company, 'college-money'] : company;
}
