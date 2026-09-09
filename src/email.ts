import type { Book, Lead, SiteSettings } from './types';

/**
 * Web3Forms — transactional email delivery
 * Access key is public-safe (it only authorises sending from your form).
 */
const WEB3FORMS_KEY = '4c5d930a-655a-4042-ac9b-9ee124ccaaef';
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from_name: string;
  reply_to?: string;
}

export interface SendResult {
  ok: boolean;
  message: string;
}

/** Shared brand palette for all templates. */
const BRAND = {
  ink: '#0E1420',
  paper: '#FAF7F2',
  ochre: '#C8862A',
  clay: '#F2EBDD',
  muted: '#6B6860',
  sage: '#4F6B52',
};

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const money = (book: Book) =>
  `${book.payment?.currency || '₦'}${(book.payment?.price ?? 0).toLocaleString()}`;

/** Public landing page URL for a given book (used in the CTA). */
export const bookLandingUrl = (book: Pick<Book, 'slug'>) =>
  `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}#/book/${book.slug}`;

/* ────────────────────────────────────────────────────────────────
   Base layout wrapper — premium, dark header, editorial typography
   ──────────────────────────────────────────────────────────────── */
function wrapEmail(opts: {
  preheader: string;
  heading: string;
  kicker: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaHref?: string;
  footerNote?: string;
  book?: Book;
  settings: SiteSettings;
}): string {
  const { preheader, heading, kicker, bodyHtml, ctaLabel, ctaHref, footerNote, book, settings } = opts;

  const coverCell = book?.coverImage
    ? `<td style="width:150px;padding:0 24px 0 0;vertical-align:top;">
         <img src="${book.coverImage}" alt="${escapeHtml(book.title)}" width="150" style="display:block;width:150px;height:auto;border-radius:14px;border:1px solid ${BRAND.ochre}44;" />
       </td>`
    : '';

  const ctaBlock =
    ctaLabel && ctaHref
      ? `<tr><td style="padding:6px 0 0;">
           <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center">
             <a href="${ctaHref}" style="display:inline-block;background:${BRAND.ochre};color:#0E1420;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-decoration:none;padding:15px 34px;border-radius:999px;">
               ${escapeHtml(ctaLabel)}
             </a>
           </td></tr></table>
         </td></tr>`
      : '';

  const coverRow = book
    ? `<tr><td style="padding:0 0 22px;">
         <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
           <tr>${coverCell}
             <td style="vertical-align:top;padding:4px 0;">
               <p style="margin:0 0 6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.18em;text-transform:uppercase;color:${BRAND.ochre};">Nexa Publication</p>
               <p style="margin:0 0 4px;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:21px;font-weight:700;color:${BRAND.ink};">${escapeHtml(book.title)}</p>
               <p style="margin:0;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:${BRAND.muted};">${escapeHtml(book.subtitle || '')}</p>
               ${book.type === 'paid' && book.payment
                 ? `<p style="margin:10px 0 0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:${BRAND.ink};">${escapeHtml(money(book))}</p>`
                 : `<p style="margin:10px 0 0;font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.sage};">Free edition</p>`}
             </td>
           </tr>
         </table>
       </td></tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
<div style="display:none;font-size:1px;color:${BRAND.paper};max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${BRAND.paper};padding:32px 12px;">
  <tr><td align="center">

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:620px;background:#FFFFFF;border-radius:26px;overflow:hidden;box-shadow:0 20px 48px -24px rgba(14,20,32,0.35);">

      <!-- Header -->
      <tr>
        <td style="background:${BRAND.ink};padding:30px 36px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                <td style="width:42px;">
                  <div style="width:42px;height:42px;border-radius:14px;background:${BRAND.ochre};color:#0E1420;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:19px;font-weight:800;text-align:center;line-height:42px;">N</div>
                </td>
                <td style="padding-left:12px;">
                  <p style="margin:0;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:15px;font-weight:700;color:#FFFFFF;">${escapeHtml(settings.studioName)}</p>
                  <p style="margin:2px 0 0;font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.ochre};">${escapeHtml(settings.studioTagline)}</p>
                </td>
              </tr></table>
            </td>
          </tr></table>
        </td>
      </tr>

      <!-- Gold rule -->
      <tr><td style="background:${BRAND.ochre};height:3px;line-height:3px;font-size:0;">&nbsp;</td></tr>

      <!-- Body -->
      <tr>
        <td style="padding:38px 36px 12px;">
          <p style="margin:0 0 10px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.2em;text-transform:uppercase;color:${BRAND.ochre};">${escapeHtml(kicker)}</p>
          <h1 style="margin:0 0 22px;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:28px;line-height:1.18;font-weight:700;color:${BRAND.ink};">${escapeHtml(heading)}</h1>
          ${coverRow}
          <div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.72;color:#2E2A25;">
            ${bodyHtml}
          </div>
          ${ctaBlock}
        </td>
      </tr>

      <!-- Divider -->
      <tr><td style="padding:14px 36px 0;"><div style="height:1px;background:#E7DFD2;">&nbsp;</div></td></tr>

      <!-- Signature -->
      <tr>
        <td style="padding:18px 36px 34px;">
          <p style="margin:0 0 2px;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:14px;font-weight:700;color:${BRAND.ink};">${escapeHtml(settings.founderName)}</p>
          <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(settings.founderRole)}</p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background:${BRAND.clay};padding:22px 36px;">
          <p style="margin:0 0 6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${BRAND.muted};">${escapeHtml(settings.location)}</p>
          <p style="margin:0 0 4px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:${BRAND.muted};">
            <a href="mailto:${escapeHtml(settings.officialEmail)}" style="color:${BRAND.muted};text-decoration:underline;">${escapeHtml(settings.officialEmail)}</a>
            ${settings.contactWhatsapp ? ` &nbsp;·&nbsp; <a href="https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, '')}" style="color:${BRAND.muted};text-decoration:underline;">WhatsApp</a>` : ''}
          </p>
          ${footerNote ? `<p style="margin:10px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:${BRAND.muted};">${footerNote}</p>` : ''}
          <p style="margin:12px 0 0;font-family:Helvetica,Arial,sans-serif;font-size:11px;color:${BRAND.muted};">© ${new Date().getFullYear()} ${escapeHtml(settings.copyrightText)}</p>
        </td>
      </tr>

    </table>

  </td></tr>
</table>
</body>
</html>`;
}

/* ────────────────────────────────────────────────────────────────
   Sender
   ──────────────────────────────────────────────────────────────── */
export async function sendWeb3Form(payload: EmailPayload): Promise<SendResult> {
  try {
    const body = new URLSearchParams();
    body.append('access_key', WEB3FORMS_KEY);
    body.append('subject', payload.subject);
    body.append('from_name', payload.from_name);
    body.append('email', payload.to);
    if (payload.reply_to) body.append('reply_to', payload.reply_to);
    body.append('message', payload.html);

    const res = await fetch(WEB3FORMS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: payload.subject,
        from_name: payload.from_name,
        email: payload.to,
        reply_to: payload.reply_to || '',
        message: payload.html,
        botcheck: '',
      }),
    });
    void body;

    const data = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (res.ok && data.success) return { ok: true, message: 'Email sent successfully.' };
    return { ok: false, message: data.message || `Web3Forms responded ${res.status}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'Network error while sending email.' };
  }
}

/* ────────────────────────────────────────────────────────────────
   Template: Free book delivery (with cover)
   ──────────────────────────────────────────────────────────────── */
export function freeDeliveryTemplate(book: Book, lead: Lead, settings: SiteSettings) {
  const link = book.customPdf && /^https?:\/\//i.test(book.customPdf) ? book.customPdf : '';
  const fallback = bookLandingUrl(book);
  const downloadHref = link || fallback;

  const body = `
    <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(lead.name)}</strong>,</p>
    <p style="margin:0 0 16px;">Thank you for downloading <strong>${escapeHtml(book.title)}</strong>. Your copy is ready and attached to your library page.</p>
    ${book.donation ? `
      <div style="margin:0 0 20px;padding:18px 20px;background:${BRAND.clay};border-radius:16px;border:1px solid #E4D8C3;">
        <p style="margin:0 0 6px;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.ochre};">Support our work</p>
        <p style="margin:0 0 10px;font-family:Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;color:#2E2A25;">${escapeHtml(book.donation.donationMessage)}</p>
        <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:12px;color:${BRAND.ink};"><strong>${escapeHtml(book.donation.accountName)}</strong> · ${escapeHtml(book.donation.accountNumber)} · ${escapeHtml(book.donation.bankName)}</p>
      </div>` : ''}
    <p style="margin:0 0 18px;color:#3A3835;">If the button does not work, open this link:<br>
      <a href="${downloadHref}" style="color:${BRAND.ochre};word-break:break-all;">${downloadHref}</a>
    </p>
  `;

  return {
    html: wrapEmail({
      preheader: `Your copy of ${book.title} is ready.`,
      kicker: 'Your free download',
      heading: `Your copy is ready, ${lead.name.split(' ')[0]}.`,
      bodyHtml: body,
      ctaLabel: 'Download my book',
      ctaHref: downloadHref,
      book,
      settings,
      footerNote: 'You are receiving this because you requested a free copy from our website. If this wasn’t you, you can ignore this email.',
    }),
    subject: `Your free copy: ${book.title}`,
    to: lead.email,
    from_name: settings.studioName,
    reply_to: settings.officialEmail,
  };
}

/* ────────────────────────────────────────────────────────────────
   Template: Purchase receipt + delivery (with cover)
   ──────────────────────────────────────────────────────────────── */
export function purchaseDeliveryTemplate(book: Book, lead: Lead, settings: SiteSettings) {
  const link = book.customPdf && /^https?:\/\//i.test(book.customPdf) ? book.customPdf : '';
  const fallback = bookLandingUrl(book);
  const downloadHref = link || fallback;

  const body = `
    <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(lead.name)}</strong>,</p>
    <p style="margin:0 0 16px;">Your payment for <strong>${escapeHtml(book.title)}</strong> has been confirmed. Thank you for your purchase — your copy is ready to download.</p>

    <div style="margin:0 0 20px;border:1px solid #E7DFD2;border-radius:16px;overflow:hidden;">
      <div style="background:${BRAND.clay};padding:12px 18px;">
        <p style="margin:0;font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:${BRAND.ink};">Order receipt</p>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#2E2A25;">
        <tr><td style="padding:12px 18px 4px;color:${BRAND.muted};">Reference</td><td align="right" style="padding:12px 18px 4px;font-family:'JetBrains Mono',monospace;">${escapeHtml(lead.id.toUpperCase())}</td></tr>
        <tr><td style="padding:4px 18px;color:${BRAND.muted};">Customer</td><td align="right" style="padding:4px 18px;">${escapeHtml(lead.name)}</td></tr>
        <tr><td style="padding:4px 18px;color:${BRAND.muted};">Email</td><td align="right" style="padding:4px 18px;">${escapeHtml(lead.email)}</td></tr>
        <tr><td style="padding:4px 18px;color:${BRAND.muted};">Phone</td><td align="right" style="padding:4px 18px;">${escapeHtml(lead.phone)}</td></tr>
        <tr><td style="padding:6px 18px 16px;color:${BRAND.muted};border-top:1px solid #E7DFD2;margin-top:6px;">Amount paid</td>
            <td align="right" style="padding:6px 18px 16px;border-top:1px solid #E7DFD2;font-family:'Space Grotesk',Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;color:${BRAND.ink};">${escapeHtml(money(book))}</td></tr>
      </table>
    </div>

    <p style="margin:0 0 18px;color:#3A3835;">Keep this email for your records. If the button does not work, open this link:<br>
      <a href="${downloadHref}" style="color:${BRAND.ochre};word-break:break-all;">${downloadHref}</a>
    </p>
  `;

  return {
    html: wrapEmail({
      preheader: `Payment confirmed — ${book.title} is ready to download.`,
      kicker: 'Payment confirmed',
      heading: `Thank you for your purchase, ${lead.name.split(' ')[0]}.`,
      bodyHtml: body,
      ctaLabel: 'Download my book',
      ctaHref: downloadHref,
      book,
      settings,
      footerNote: 'This receipt confirms your purchase. You may be contacted on WhatsApp to confirm delivery.',
    }),
    subject: `Payment confirmed · ${book.title}`,
    to: lead.email,
    from_name: settings.studioName,
    reply_to: settings.officialEmail,
  };
}

/* ────────────────────────────────────────────────────────────────
   Template: Internal admin notification for a new lead
   ──────────────────────────────────────────────────────────────── */
export function adminLeadTemplate(book: Book, lead: Lead, settings: SiteSettings) {
  const body = `
    <p style="margin:0 0 14px;">A new ${lead.paid === true ? 'paid order' : 'free download request'} was recorded.</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="font-family:Helvetica,Arial,sans-serif;font-size:13px;color:#2E2A25;background:${BRAND.clay};border-radius:14px;">
      <tr><td style="padding:14px 18px 4px;color:${BRAND.muted};">Book</td><td align="right" style="padding:14px 18px 4px;">${escapeHtml(book.title)}</td></tr>
      <tr><td style="padding:4px 18px;color:${BRAND.muted};">Name</td><td align="right" style="padding:4px 18px;">${escapeHtml(lead.name)}</td></tr>
      <tr><td style="padding:4px 18px;color:${BRAND.muted};">Email</td><td align="right" style="padding:4px 18px;">${escapeHtml(lead.email)}</td></tr>
      <tr><td style="padding:4px 18px;color:${BRAND.muted};">Phone</td><td align="right" style="padding:4px 18px;">${escapeHtml(lead.phone)}</td></tr>
      <tr><td style="padding:4px 18px 14px;color:${BRAND.muted};">Status</td><td align="right" style="padding:4px 18px 14px;">${escapeHtml(lead.status)}${lead.paid === true ? ' · Paid' : ''}</td></tr>
    </table>
    <p style="margin:16px 0 0;color:${BRAND.muted};font-size:12px;">Open the dashboard to confirm payment and deliver the book.</p>
  `;

  return {
    html: wrapEmail({
      preheader: `New ${lead.paid === true ? 'paid order' : 'lead'} — ${book.title}`,
      kicker: 'Internal notification',
      heading: `New ${lead.paid === true ? 'paid order' : 'free download'}`,
      bodyHtml: body,
      ctaLabel: 'Open publisher dashboard',
      ctaHref: `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}#/admin/book/${book.slug}`,
      book,
      settings,
      footerNote: 'Automated notification from the Nexa publishing platform.',
    }),
    subject: `New ${lead.paid === true ? 'paid order' : 'lead'} · ${book.title}`,
    to: settings.officialEmail,
    from_name: `${settings.studioName} Notifications`,
    reply_to: lead.email,
  };
}

/* ────────────────────────────────────────────────────────────────
   Template: Welcome / enquiry acknowledgement
   ──────────────────────────────────────────────────────────────── */
export function enquiryAcknowledgementTemplate(book: Book, lead: Lead, settings: SiteSettings) {
  const body = `
    <p style="margin:0 0 16px;">Hello <strong>${escapeHtml(lead.name)}</strong>,</p>
    <p style="margin:0 0 16px;">Thank you for your interest in <strong>${escapeHtml(book.title)}</strong>. We have received your details and our team will confirm your order shortly.</p>
    <p style="margin:0 0 16px;">In the meantime, you can reply to this email or reach us directly on WhatsApp if you have any questions.</p>
  `;

  return {
    html: wrapEmail({
      preheader: `We received your request for ${book.title}.`,
      kicker: 'We received your request',
      heading: `Thanks for reaching out, ${lead.name.split(' ')[0]}.`,
      bodyHtml: body,
      ctaLabel: 'View the book page',
      ctaHref: bookLandingUrl(book),
      book,
      settings,
      footerNote: 'You are receiving this because you submitted your details on our website.',
    }),
    subject: `We received your request · ${book.title}`,
    to: lead.email,
    from_name: settings.studioName,
    reply_to: settings.officialEmail,
  };
}
