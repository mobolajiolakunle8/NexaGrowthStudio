export type BookType = 'free' | 'paid';

export interface DonationInfo {
  accountName: string;
  accountNumber: string;
  bankName: string;
  thankYouMessage: string;
  donationMessage: string;
}

export interface PaymentInfo {
  accountName: string;
  accountNumber: string;
  bankName: string;
  price: number;
  currency: string;
  paymentNote: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  author: string;
  authorRole: string;
  kicker: string;
  type: BookType;
  price?: number;
  currency?: string;
  coverImage?: string;
  customPdf?: string;
  whatsInside: string[];
  ctaTitle: string;
  ctaSubtitle: string;
  adminWhatsapp: string;
  adminPasscode: string;
  donation?: DonationInfo;
  payment?: PaymentInfo;
  published: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  bookId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  status: 'New' | 'In Progress' | 'Contacted' | 'Qualified' | 'Unqualified';
  paid?: boolean;
  paymentConfirmedAt?: string;
  deliveredAt?: string;
  deliveryChannel?: 'WhatsApp' | 'Email';
  notes?: string;
}

export interface SiteSettings {
  studioName: string;
  studioTagline: string;
  location: string;
  navCatalogueLabel: string;
  navManifestoLabel: string;
  navFounderLabel: string;
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  heroBadgeText: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  founderName: string;
  founderRole: string;
  founderBadge: string;
  founderPhoto?: string;
  founderQuote: string;
  founderBioParagraph1: string;
  founderBioParagraph2: string;
  founderTags: string[];
  manifestoEyebrow: string;
  manifestoHeading: string;
  manifestoCards: Array<{
    number: string;
    title: string;
    description: string;
  }>;
  catalogueEyebrow: string;
  catalogueHeading: string;
  catalogueSummary: string;
  contactWhatsapp: string;
  officialEmail: string;
  otherSiteEnabled: boolean;
  otherSiteName: string;
  otherSiteUrl: string;
  otherSiteDescription: string;
  otherSiteButtonText: string;
  contactEyebrow: string;
  contactWhatsappCta: string;
  contactEmailCta: string;
  newsletterHeading: string;
  newsletterSubtitle: string;
  copyrightText: string;
}

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  studioName: 'Nexa Growth Studio',
  studioTagline: 'Independent Publishing & Growth Lab',
  location: 'Ibadan, Nigeria',
  navCatalogueLabel: 'Catalogue',
  navManifestoLabel: 'Standard',
  navFounderLabel: 'Behind Nexa',
  heroKicker: 'Ibadan · Nigeria · Est. 2024',
  heroTitle: 'Books that teach business properly.',
  heroSubtitle: 'We publish practical, field-tested books for African founders and small-business owners. No theory for theory’s sake — just clear books you can apply the same week you read them.',
  heroBadgeText: 'Field-tested business books',
  heroPrimaryCta: 'Explore Publications',
  heroSecondaryCta: 'Meet the Founder',
  founderName: 'Olakunle Samuel',
  founderRole: 'Founder & Publisher',
  founderBadge: 'The Mind Behind Nexa Growth Studio',
  founderPhoto: '',
  founderQuote: 'We write the books we wish we had when we started.',
  founderBioParagraph1: 'Nexa Growth Studio began in Ibadan with a simple frustration: most business books sold in Nigeria were written for foreign economies. The advice didn’t survive contact with our market realities.',
  founderBioParagraph2: 'So we started researching, testing, and publishing our own books — grounded in Nigerian customer behaviour, realistic cash flow cycles, and practical execution that respects your time.',
  founderTags: ['Business Strategy', 'Sales & Conversion', 'Brand Architecture', 'Operations'],
  manifestoEyebrow: 'Our Publishing Standard',
  manifestoHeading: 'Every title has to earn its place on this shelf.',
  manifestoCards: [
    {
      number: '01',
      title: 'Written from Practice',
      description: 'Every book is built on real client experiments, real failures, and verified numbers — never recycled internet advice.',
    },
    {
      number: '02',
      title: 'Built for This Market',
      description: 'Pricing in naira, Nigerian buyer psychology, local logistics and infrastructure realities. What actually works here.',
    },
    {
      number: '03',
      title: 'Readable in One Sitting',
      description: 'Short, structured and directly actionable. Designed to be finished on a Sunday and executed on Monday morning.',
    },
  ],
  catalogueEyebrow: 'Published Titles',
  catalogueHeading: 'The Library',
  catalogueSummary: 'Available now. Delivered directly on WhatsApp or immediate download.',
  contactWhatsapp: '+2349030192034',
  officialEmail: 'nexagrowthstudio.ng@gmail.com',
  otherSiteEnabled: true,
  otherSiteName: 'Nexa General Books',
  otherSiteUrl: '',
  otherSiteDescription: 'Explore our wider collection — fiction, non-fiction, children’s books, inspirational titles, and general reading.',
  otherSiteButtonText: 'Visit General Books',
  contactEyebrow: 'Direct Publisher Dispatch',
  contactWhatsappCta: 'Message on WhatsApp',
  contactEmailCta: 'Email the Studio',
  newsletterHeading: 'Be first to read every new release.',
  newsletterSubtitle: 'New books, free sample chapters, and field notes on scaling Nigerian businesses. Direct to your inbox or WhatsApp, zero spam.',
  copyrightText: 'Nexa Growth Studio. Published with pride in Ibadan, Nigeria.',
};

export const MEGA_ADMIN_PASSCODE_KEY = 'nexa_mega_admin_passcode';
export const BOOKS_STORAGE_KEY = 'nexa_books_v1';
export const LEADS_STORAGE_KEY = 'nexa_leads_v1';
export const SITE_SETTINGS_STORAGE_KEY = 'nexa_site_settings_v1';
export const MEGA_ADMIN_DEFAULT = 'nexaadmin2024';
export const CLOUD_DB_URL_KEY = 'nexa_cloud_db_url';
export const CLOUD_SYNC_ENABLED_KEY = 'nexa_cloud_sync_enabled';
export const CLOUD_LAST_SYNC_KEY = 'nexa_cloud_last_sync';
