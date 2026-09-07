# Nexa Growth Studio — Publishing Platform

Multi-book landing page platform with admin CRM, real-time sync, and mobile readiness.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## Project Structure

```
├── src/
│   ├── firebase.ts          # Firebase initialization
│   ├── cloud.ts             # Cloud sync (Firebase Realtime Database)
│   ├── storage.ts           # Local storage helpers
│   ├── types.ts             # TypeScript interfaces
│   ├── App.tsx              # Main application (routing + cloud init)
│   └── components/
│       ├── MegaAdmin.tsx    # Admin dashboard
│       ├── BookAdmin.tsx    # Per-book admin
│       ├── BookLanding.tsx  # Public book landing page
│       └── BookCover.tsx    # Book cover component
├── firebase.json            # Firebase CLI config
├── database.rules.json      # Firestore security rules
├── index.html               # Entry HTML
└── package.json
```

## Firebase Setup (one-time)

1. **Create Firebase project** at https://console.firebase.google.com
2. **Enable Realtime Database** → Start in test mode → set rules (see below)
3. **Register web app** → copy config → paste into `src/firebase.ts`

### Database Rules

```json
{
  "rules": {
    "nexa": {
      ".read": true,
      ".write": true
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

Paste into Firebase Console → Realtime Database → Rules → Publish.

### Firebase Config

The config is already in `src/firebase.ts`. The database URL:
```
https://nexa-growth-studio-default-rtdb.firebaseio.com
```

## Architecture

### Sync Model
- **Primary**: Firebase Realtime Database (`nexa` node)
- **Local fallback**: localStorage (per-device)
- **Live sync**: `onValue()` listeners + manual push/pull

### Book Landing Pages
- URL: `yoursite.com/#/book/[slug]`
- Free books: instant download + thank-you via WhatsApp + donation card
- Paid books: payment detail display + payment proof flow
- Separate admin per book via `#/admin/book/[slug]`

### Admin Access
- Mega Admin: `#/admin` → passcode `nexaadmin2024` (change in Settings)
- Book Admin: `#/admin/book/[slug]` → book-specific passcode
- Password and per-book access codes editable in Settings tab

## Deployment

### To Firebase Hosting

```bash
# Login
firebase login

# Initialize (only first time, or use existing config)
firebase init hosting

# Build
npm run build

# Deploy
firebase deploy --only hosting
```

Your site will be live at:
```
https://nexagrowthstudio.web.app
```
or the custom domain you set up.

### To any static host (Vercel, Netlify, GitHub Pages)

```bash
npm run build
```

Deploy `dist/` folder. The app is fully static — just an `index.html` with an SPA.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Books/leads not syncing across devices | Check Firebase database URL is correct in `src/firebase.ts`, push from admin browser, pull from other browser |
| Covers not showing on other browsers | Use image URL instead of file upload, or keep files under 2.5MB |
| Admin login not working | Verify passcode in Settings. Default mega admin: `nexaadmin2024` |
| Build errors | `npm install` then `npm run build` |
| Firebase rules rejected | Check `database.rules.json` matches the structure `{ "rules": { "nexa": { ... } } }` |

## Default Passcodes

| Access | Default | Where to change |
|--------|---------|-----------------|
| Mega Admin | `nexaadmin2024` | Settings → Mega Admin Password |
| Book Admin | `admin123` (per book) | Settings → Book Access Codes |

## Environment

- **Node.js**: >=18
- **React**: 19
- **Firebase SDK**: 12.x
- **Tailwind CSS**: 4.x
- **TypeScript**: 5.x
- **Vite**: 7.x

## Cloud Sync Notes

- Books and leads sync via Firebase Realtime Database
- Covers and PDFs are local (large files don't sync well across browsers)
- For universal cover visibility: upload to a CDN/host and paste the URL in admin
- For PDFs: host on Firebase Storage or external host and paste the download link

## Contributing

Not applicable — this is a published product for Nexa Growth Studio.
