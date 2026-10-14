export interface CompanyContextFact {
  label: string;
  value: string;
  detail: string;
  sourceId: string;
}

export interface CompanyContextData {
  id: string;
  name: string;
  brandIds: readonly string[];
  about: string;
  abstract?: readonly { text: string; sourceId?: string }[];
  facts: readonly CompanyContextFact[];
  websites: readonly { label: string; href: string }[];
  sources: readonly { id: string; label: string; href: string; date?: string }[];
  scopeNote: string;
  reviewedAt: string;
}

/** Company context is distinct from Priyam's role, tenure and personal project outcomes. */
export const companyContexts: Readonly<Record<string, CompanyContextData>> = {
  cashkaro: {
    id: 'cashkaro', name: 'CashKaro / BankKaro', brandIds: ['cashkaro'],
    about: 'CashKaro connects online shoppers with retailers through cashback and savings. BankKaro is its financial-products marketplace, helping customers compare credit cards and loans from partner lenders.',
    facts: [
      { label: 'Shopping network', value: '1,500+ sites', detail: 'Listed on CashKaro’s official about page.', sourceId: 'cashkaro-about' },
      { label: 'Company milestone', value: '20M users', detail: 'User milestone reported in its 2023 timeline.', sourceId: 'cashkaro-about' },
      { label: 'Backing', value: 'Ratan Tata · Kalaari · Affle', detail: 'Investors named by CashKaro.', sourceId: 'cashkaro-about' },
    ],
    websites: [{ label: 'CashKaro website', href: 'https://cashkaro.com/' }, { label: 'BankKaro website', href: 'https://bankkaro.com/' }],
    sources: [
      { id: 'cashkaro-about', label: 'CashKaro overview', href: 'https://cashkaro.com/about-us' },
      { id: 'bankkaro-about', label: 'BankKaro overview', href: 'https://bankkaro.com/about-us' },
    ],
    scopeNote: 'Company-reported scale and dated milestones; my lending results follow separately.', reviewedAt: '14 October 2026',
  },
  credflow: {
    id: 'credflow', name: 'CredFlow', brandIds: ['credflow'],
    about: 'CredFlow builds finance software and lending infrastructure for MSMEs. The group combines cash-flow tools, partner distribution and access to working capital.',
    facts: [
      { label: 'CredFloat SaaS', value: '200K+ businesses', detail: 'Current homepage reports businesses onboarded.', sourceId: 'credflow-home' },
      { label: 'Lending ecosystem', value: '50+ partners', detail: 'Reported for CredFund and CashFloat.', sourceId: 'credflow-home' },
    ],
    websites: [{ label: 'CredFlow website', href: 'https://credflow.in/' }],
    sources: [
      { id: 'credflow-home', label: 'CredFlow ecosystem and scale', href: 'https://credflow.in/' },
      { id: 'credflow-about', label: 'Company overview', href: 'https://credflow.in/about/' },
    ],
    scopeNote: 'Current company-reported scope, after my December 2024–March 2025 role.', reviewedAt: '14 October 2026',
  },
  absolute: {
    id: 'absolute', name: 'Absolute / Upaj', brandIds: ['absolute'],
    about: 'Absolute is a bioscience business applying biology and technology across agriculture, food and other industries. Its Upaj platform connects agricultural data with farm advisory, risk information and insurance.',
    abstract: [
      { text: 'A bioscience company whose farm business reports ' },
      { text: '3M+ farmers', sourceId: 'absolute-home' },
      { text: '. ' },
      { text: '$100 million in funding', sourceId: 'absolute-funding' },
      { text: ' was announced in May 2022, from Sequoia Capital India, Alpha Wave Global and Tiger Global.' },
    ],
    facts: [
      { label: 'Farm biosolutions', value: '3M+ farmers', detail: 'Current Absolute site reports reach of its farm business.', sourceId: 'absolute-home' },
      { label: 'Company recognition', value: 'Deloitte Fast 50', detail: '2023 listing reported on Absolute’s website.', sourceId: 'absolute-home' },
    ],
    websites: [{ label: 'Absolute website', href: 'https://www.absolute.bio/' }, { label: 'Upaj website', href: 'https://www.upaj.org/' }],
    sources: [
      { id: 'absolute-home', label: 'Absolute business and recognition', href: 'https://www.absolute.bio/' },
      { id: 'absolute-funding', label: 'Absolute funding announcement — May 2022', href: 'https://economictimes.indiatimes.com/tech/funding/absolute-foods-raises-100-million-in-funding-led-by-sequoia-capital-alpha-wave-tiger-global/articleshow/91349742.cms', date: '5 May 2022' },
      { id: 'upaj-home', label: 'Upaj product reference', href: 'https://www.upaj.org/' },
    ],
    scopeNote: 'Current company context; farmer reach is distinct from Upaj users and my 2021–2024 results.', reviewedAt: '14 October 2026',
  },
  urbankhet: {
    id: 'urbankhet', name: 'UrbanKhet', brandIds: ['urbankhet'],
    about: 'UrbanKhet was a farm-to-customer venture connecting growers with urban households and business buyers. It grew from a microfarm idea into produce sourcing, delivery and a digital storefront.',
    abstract: [
      { text: 'A farm-to-customer venture with ' },
      { text: '3,600+ reported customers', sourceId: 'urbankhet-customers' },
      { text: '. ' },
      { text: 'Seed backing from IIMA Ventures (then CIIE.CO)', sourceId: 'urbankhet-funding' },
      { text: ', plus TIDE 2.0 and Gujarat SSIP grant support through GUSEC.' },
    ],
    facts: [
      { label: 'June 2020 snapshot', value: '~100 customers/day', detail: 'GUSEC described its Ahmedabad service with municipal coordination.', sourceId: 'gusec-story' },
      { label: 'Venture recognition', value: 'GUSEC Rise Award', detail: '2021 award to founder Priyam Sameer.', sourceId: 'gusec-award' },
    ],
    websites: [],
    sources: [
      { id: 'urbankhet-customers', label: 'UrbanKhet customer record', href: '/product/urbankhet-farm-to-fork#results' },
      { id: 'urbankhet-funding', label: 'IIMA Ventures investment portfolio', href: 'https://iimaventures.com/portfolio/' },
      { id: 'gusec-story', label: 'GUSEC venture history', href: 'https://gusec.edu.in/2020/06/03/urbankhet/', date: '3 June 2020' },
      { id: 'gusec-award', label: 'GUSEC 2021 awards', href: 'https://gusec.edu.in/2021/03/10/gusec-annual-awards-2021/', date: '10 March 2021' },
    ],
    scopeNote: 'Historical snapshots; later customer totals cover different periods.', reviewedAt: '14 October 2026',
  },
};

export function getCompanyContext(companyId: string): CompanyContextData | undefined {
  return companyContexts[companyId];
}
