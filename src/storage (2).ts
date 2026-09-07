import type { Book, Lead } from './types';
import { BOOKS_STORAGE_KEY, LEADS_STORAGE_KEY } from './types';

export function loadBooks(): Book[] {
  try {
    const raw = localStorage.getItem(BOOKS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveBooks(books: Book[]) {
  try { localStorage.setItem(BOOKS_STORAGE_KEY, JSON.stringify(books)); } catch { /* */ }
}

export function loadLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(LEADS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveLeads(leads: Lead[]) {
  try { localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(leads)); } catch { /* */ }
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
}

export function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 40);
}

export function normalizePhoneForWA(v: string) {
  const digits = v.replace(/[\s\-\(\)\.\+]/g, '');
  if (digits.startsWith('0') && digits.length >= 10) return '234' + digits.substring(1);
  if (digits.startsWith('234')) return digits;
  if (digits.length === 10) return '234' + digits;
  return digits;
}

export function isValidPhone(v: string) {
  const cleaned = v.replace(/[\s\-\(\)\.]/g, '');
  if (cleaned.startsWith('+')) return /^\+[0-9]{7,15}$/.test(cleaned);
  return /^[0-9]{10,15}$/.test(cleaned) || /^0[0-9]{9,13}$/.test(cleaned);
}

export function buildGuidePdf(recipientName: string, book: Book): Blob {
  const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const ops: string[] = [];
  const line = (t: string, y: number, size: number, bold = false, x = 72) =>
    ops.push(`BT /${bold ? 'F1' : 'F2'} ${size} Tf ${x} ${y} Td (${esc(t)}) Tj ET`);

  ops.push('0.97 0.96 0.94 rg'); ops.push('0 0 612 792 re f');
  ops.push('0.08 0.14 0.28 rg'); ops.push('0 652 612 140 re f');
  ops.push('0.79 0.64 0.15 rg'); ops.push('0 636 612 6 re f');

  line(book.kicker.split('·')[0].trim(), 752, 15, false, 72);
  line(book.title, 726, 22, true, 72);
  line(book.type === 'free' ? 'FREE GUIDE' : `PRICE: ${book.currency || '₦'}${book.price}`, 692, 9, false, 72);

  line("WHAT'S INSIDE", 600, 13, true, 72);
  let y = 568;
  for (const b of book.whatsInside.slice(0, 6)) {
    line(`• ${b}`, y, 10, false, 72);
    y -= 22;
  }

  line(`PREPARED FOR: ${recipientName.toUpperCase()}`, 360, 10, true, 72);
  ops.push('0.08 0.14 0.28 rg'); ops.push('40 270 532 70 re f');
  line('Enjoy the read — put it to work!', 302, 13, true, 72);
  line('Build a brand your customers remember.', 280, 10, false, 72);
  line(`${book.author} — ${book.authorRole}`, 130, 9, false, 72);

  const body = ops.join('\n');
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
    `6 0 obj\n<< /Length ${body.length} >>\nstream\n${body}\nendstream\nendobj\n`,
  ];
  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (const obj of objects) { offsets.push(out.length); out += obj; }
  const xrefPos = out.length;
  out += 'xref\n0 7\n0000000000 65535 f \n';
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}

export function downloadGuidePdf(recipientName: string, book: Book) {
  if (book.customPdf) {
    // customPdf may be an https:// link (hosted PDF) or a data: URL (uploaded file)
    if (/^https?:\/\//i.test(book.customPdf)) {
      window.open(book.customPdf, '_blank', 'noopener');
      return;
    }
    const a = document.createElement('a');
    a.href = book.customPdf;
    a.download = `${book.slug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    const blob = buildGuidePdf(recipientName, book);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${book.slug}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/* ── Image helpers: compress uploads so they fit localStorage + cloud ── */

export function isRemoteUrl(v?: string): boolean {
  return !!v && /^https?:\/\//i.test(v);
}

export function approxDataUrlKB(dataUrl: string): number {
  // base64 ≈ 4/3 of bytes
  const b64 = dataUrl.split(',')[1] || '';
  return Math.round((b64.length * 3) / 4 / 1024);
}

/** Resize + recompress an image file. Returns a data URL (JPEG unless PNG with transparency is small). */
export function compressImageFile(file: File, maxDim = 900, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image. Use JPG or PNG.'));
      img.onload = () => {
        try {
          let { width, height } = img;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas not supported in this browser.');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          // Prefer JPEG for photos (much smaller); keep PNG only for tiny graphics
          const out = canvas.toDataURL('image/jpeg', quality);
          resolve(out);
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Image processing failed.'));
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error('Could not read file.'));
    r.onload = () => resolve(r.result as string);
    r.readAsDataURL(file);
  });
}
