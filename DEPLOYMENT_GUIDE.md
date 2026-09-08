# 🚀 Nexa Growth Studio — Firebase Setup & Deployment Guide

## What was actually wrong (root cause, confirmed against your live database)

Your books/edits were not syncing across browsers because of **one destructive bug**, plus **one broken deploy configuration**. Both are now fixed in this codebase.

### Bug 1 — `src/App.tsx` was wiping the shared data on every page load
```tsx
// REMOVED — this ran on every single page load, in every browser:
const existing = await autoSyncBooks([]).then(() => null).catch(() => null);
```
This pushed an **empty book list** to Firebase every time *anyone* opened the site — including refreshing a tab. Any edit made in one browser was erased the instant another browser (or the same one, reloaded) opened the page. I confirmed this directly by connecting to your live database: the `nexa/books` node was missing entirely, with only stray leftover fields (`client`, `meta`) at the root — a clear fingerprint of this exact bug firing repeatedly.

**Fix applied:**
- Replaced the destructive effect with a safe **reconciliation** on load: if the cloud already has books, adopt them; if the cloud is genuinely empty, publish this browser's books *once* to seed it.
- Added a permanent safety guard in `src/cloud.ts` — `autoSyncBooks()` now **refuses to push an empty book list** unless the caller explicitly passes `{ force: true }` (which only happens for real, deliberate admin actions like deleting the last book). This makes it structurally impossible for a bug like this to recur silently.

### Bug 2 — Missing `.firebaserc` broke deployment
`firebase.json` referenced a named hosting target (`"target": "nexagrowthstudio"`), but no `.firebaserc` file existed to map that target to a real Hosting site. Without that mapping, `firebase deploy --only hosting:nexagrowthstudio` fails outright. This means your fixes may never have reached production.

**Fix applied:**
- Added `.firebaserc` pointing to your project (`nexa-growth-studio`).
- Simplified `firebase.json` to deploy to your project's **default Hosting site** — no manual target setup required.
- Added a `no-cache` header on `index.html` so browsers/CDNs never serve a stale cached build after you deploy (important since this app ships as a single inlined HTML file).

### Cleanup
- Removed two unused, orphaned Firebase-init files (`src/firebase.ts`, `src/config.ts`) that duplicated `src/cloud.ts` and risked a future "duplicate Firebase app" bug if ever imported.
- Removed redundant/outdated docs (`DEPLOY_READY.md`, `FIREBASE_SETUP_GUIDE.md`) in favor of this single guide.

---

## How cross-browser sync works now

1. **Every real change auto-syncs.** Adding/editing/publishing a book, or a visitor submitting a lead, immediately writes to Firebase Realtime Database (`autoSyncBooks`, `schedulePush`).
2. **Every open browser listens live.** `startLiveSync()` keeps a real-time connection open; when the cloud changes, every connected browser updates within about a second — no refresh needed.
3. **No browser can ever race another's data away.** The empty-write guard means only a real, non-empty save (or an explicit, deliberate deletion) is ever pushed.

---

## Step 1 — Deploy the database rules

```bash
firebase login
firebase deploy --only database
```

Current rules (`database.rules.json`) allow open read/write on the `nexa` node, which is what the auto-sync code expects:

```json
{
  "rules": {
    "nexa": {
      "books": { ".read": true, ".write": true },
      "leads": { ".read": true, ".write": true },
      "updatedAt": { ".read": true, ".write": true },
      "client": { ".read": true, ".write": true },
      "$other": { ".read": true, ".write": true }
    }
  }
}
```

## Step 2 — Build and deploy the site

```bash
npm run build
firebase deploy --only hosting
```

> Note: deployment now uses your project's **default Hosting site** (via `.firebaserc`). If you specifically created a separate named Hosting site called `nexagrowthstudio` in the Firebase Console and want to keep using it instead of the default site, run this once:
> ```bash
> firebase target:apply hosting nexagrowthstudio <your-actual-site-id>
> ```
> then add back `"target": "nexagrowthstudio"` in `firebase.json`'s hosting block and deploy with `firebase deploy --only hosting:nexagrowthstudio`.

## Step 3 — Close old tabs, then verify

Because the old buggy build may still be open in a background tab somewhere (it will keep wiping data until it's closed or reloaded with the new build):

1. Close **every** open tab/window of the site, on every device.
2. Open the site fresh on **Browser A**. Confirm your book(s) appear.
3. Open the site fresh on **Browser B** (a different browser or your phone). Confirm the **same** book(s) appear.
4. On Browser A, go to `#/admin`, edit the book title, save.
5. Watch Browser B — the title updates on its own within a second, with no refresh.

If step 3/4/5 don't show data yet, it's because the cloud was genuinely empty when Browser A loaded — in that case Browser A will have just seeded it (self-healing), so simply repeat the test.

## Optional — Force an immediate repair

The app self-heals automatically the moment any browser with the new code loads. If you'd rather not wait, you can run this once **after** deploying and closing all old tabs:

```bash
node scripts/repair-cloud-data.mjs
```

This checks whether real books already exist in the cloud; if not, it cleans any stray leftover fields and seeds one starter book so the site is never empty.

---

## About the Firebase API key & GitHub warnings

Firebase **client-side** API keys (the `apiKey` in `firebaseConfig`) are project identifiers, not secrets — they are safe to ship in browser code by design. Actual security comes from your **Database Rules**, not from hiding this key. `.env` / `.env.example` are provided so your real project values aren't hardcoded in multiple places, and `.gitignore` already excludes `.env`. If GitHub's scanner flags the key again, it's a false positive for this exact reason — no action is required beyond keeping your Database Rules correct (see Step 1).
