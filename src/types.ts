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

export const MEGA_ADMIN_PASSCODE_KEY = 'nexa_mega_admin_passcode';
export const BOOKS_STORAGE_KEY = 'nexa_books_v1';
export const LEADS_STORAGE_KEY = 'nexa_leads_v1';
export const MEGA_ADMIN_DEFAULT = 'nexaadmin2024';
export const CLOUD_DB_URL_KEY = 'nexa_cloud_db_url';
export const CLOUD_SYNC_ENABLED_KEY = 'nexa_cloud_sync_enabled';
export const CLOUD_LAST_SYNC_KEY = 'nexa_cloud_last_sync';
