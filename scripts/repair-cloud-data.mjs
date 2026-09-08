#!/usr/bin/env node
/**
 * One-time repair tool for the Nexa Growth Studio Firebase Realtime Database.
 *
 * WHY THIS EXISTS
 * ----------------
 * An earlier version of the app contained a bug that pushed an empty book
 * list to Firebase on every page load, which could leave stray fields
 * (`nexa/client`, `nexa/meta`) at the root with no `nexa/books` node at all.
 * That bug is fixed in the app code — this script is only needed if you want
 * to force-clean the database immediately instead of waiting for the next
 * browser to self-heal it.
 *
 * WHEN TO RUN THIS
 * ----------------
 * Run it ONCE, right after you have deployed the fixed build AND every
 * browser tab with the OLD site open has been closed or refreshed. If an old
 * tab is still open, it can overwrite this repair again.
 *
 * USAGE
 * -----
 *   node scripts/repair-cloud-data.mjs
 *
 * You can override the Firebase project via environment variables (the same
 * VITE_FIREBASE_* variables used by the app):
 *   VITE_FIREBASE_API_KEY=... VITE_FIREBASE_DATABASE_URL=... node scripts/repair-cloud-data.mjs
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, remove } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'AIzaSyCQZpR0XjSVTfbR4kpsT-x9KPMyr9igjMU',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'nexa-growth-studio.firebaseapp.com',
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL || 'https://nexa-growth-studio-default-rtdb.firebaseio.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'nexa-growth-studio',
};

const SEED_BOOK = {
  id: 'seed_sbsp_001',
  slug: 'small-business-sales-playbook',
  title: 'The Small Business Sales Playbook',
  subtitle: 'A practical, no-fluff guide to closing more sales and growing your business — written for Nigerian small business owners.',
  author: 'Olakunle Samuel',
  authorRole: 'Nexa Growth Studio — Ibadan, Nigeria',
  kicker: 'Free Guide · No Strings Attached',
  type: 'free',
  whatsInside: [
    'A simple framework for understanding your ideal customer and speaking directly to their needs.',
    'Proven sales conversation scripts tailored for Nigerian market dynamics — no generic templates.',
    'How to close deals confidently without being pushy — practical guidance for everyday business.',
  ],
  ctaTitle: 'Get your free copy',
  ctaSubtitle: 'Enter your details. The guide is delivered to you immediately.',
  adminWhatsapp: '+2349030192034',
  adminPasscode: 'admin123',
  published: true,
  createdAt: new Date().toISOString(),
  donation: {
    accountName: 'Olakunle Samuel',
    accountNumber: '0123456789',
    bankName: 'GTBank',
    thankYouMessage: 'Thank you for downloading The Small Business Sales Playbook! We hope it transforms your sales and helps you grow the business you deserve.',
    donationMessage: 'Support our work — donate any amount you wish.',
  },
};

async function main() {
  const app = initializeApp(firebaseConfig, 'repair-tool');
  const db = getDatabase(app);

  console.log(`Connecting to ${firebaseConfig.databaseURL} ...`);

  const before = await get(ref(db, 'nexa'));
  console.log('Current state:', JSON.stringify(before.val()));

  const existingBooks = before.val()?.books?.books;
  if (Array.isArray(existingBooks) && existingBooks.length > 0) {
    console.log(`\n✔ Found ${existingBooks.length} real book(s) already in the cloud — nothing to repair.`);
    process.exit(0);
  }

  console.log('\nNo valid books found. Cleaning stray fields and seeding one starter book...');

  await remove(ref(db, 'nexa/client'));
  await remove(ref(db, 'nexa/meta'));
  await set(ref(db, 'nexa/books'), { books: [SEED_BOOK] });
  await set(ref(db, 'nexa/leads'), { leads: [] });
  await set(ref(db, 'nexa/updatedAt'), new Date().toISOString());

  const after = await get(ref(db, 'nexa/books'));
  console.log('\n✔ Repair complete. nexa/books now contains:', after.val()?.books?.length, 'book(s).');
  process.exit(0);
}

main().catch(err => {
  console.error('Repair failed:', err);
  process.exit(1);
});
