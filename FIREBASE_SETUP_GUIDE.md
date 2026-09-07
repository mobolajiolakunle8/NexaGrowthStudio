# 🔐 Firebase Setup & Security Guide

## Why your API key got exposed

Your `firebaseKey` was hard-coded directly into `src/cloud.ts` and `src/firebase.ts`, and then pushed to GitHub. Google's scanning tools flag exposed keys — this is a common mistake. The fix: use **environment variables**.

## Professional fix (recommended): Move to .env

### Step 1 — Create .env with your real keys

1. Copy `.env.example` → `.env`
2. Fill in each value from your Firebase Console → Project Settings → General

```bash
cp .env.example .env
# Then edit .env with your real values
```

### Step 2 — Set up environment variables in Vite deployment

If you use **Vercel / Netlify / Firebase Hosting**, go to your project's environment settings and add these same variables under the **Environment Variables / Secrets** section.

The app reads: `import.meta.env.VITE_FIREBASE_*`

## What is NOT in the public repo now

- The API key fallback values in `cloud.ts` are gone
- `.env` is in `.gitignore` — it'll never be committed
- `.env.example` only has dummy placeholders

## Firebase Security Rules (do this!)

Go to Firebase Console → Realtime Database → Rules and paste:

```json
{
  "rules": {
    "nexa": {
      ".read": true,
      ".write": true,
      "books": { ".validate": "$data.isArray() === true"},
      "leads": { ".validate": "$data.isArray() === true"}
    },
    "$other": {
      ".read": false,
      ".write": false
    }
  }
}
```

Then click **Publish**. This limits any write to just your app's `nexa` node only.

## Deploy scripts (with env)

If using **Vercel / Netlify / CI**: add these before running `npm run build`:

```bash
export FIREBASE_DATABASE_URL="nexa-growth-studio-default-rtdb.firebaseio.com"
export FIREBASE_API_KEY="your-key"
# etc.
```

Or use a `.env.production` file configured from your host's dashboard.

## Emergency: exposed key already committed?

If your API key was already pushed to GitHub:

1. Go to Firebase Console → Project Settings → General → create a **new** project or rotate API keys
2. Update the `.env` file with new keys
3. Redeploy
4. Delete the old exposed key from Firebase Console (or delete the Firebase project)

> ⚠️ Do NOT use the old key in any new deployment going forward.

## What changed between deployments

| Step | Before (broken/insecure) | After (secure) |
|------|------------------------|----------------|
| Key source | Hardcoded in `src/cloud.ts` | `import.meta.env` (Vite) + `.env` file |
| Git history | Keys present in code | Keys only in local `.env` (never in git) |
| Sync | `storage.ts` / REST hacks | Firebase SDK — clean/sync with other devices |

## Quick checklist before deploying

- [ ] Copy `.env.example` to `.env` and fill in real values
- [ ] Confirm `.env` is listed in `.gitignore`
- [ ] Run `npm run build` — zero TypeScript errors
- [ ] Firebase rules published (see block above)
- [ ] Trusted test: open site in Chrome → mega admin → push to cloud
- [ ] Second browser: verify sync auto-pulls on load45
