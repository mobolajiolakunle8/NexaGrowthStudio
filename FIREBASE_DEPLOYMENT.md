# Nexa Growth Studio Firebase Setup

This project uses Firebase Authentication for administrator access, Realtime Database for books and leads, Storage for covers and PDFs, Analytics, and Hosting.

## 1. Install the tools

```bash
npm install
npm install -g firebase-tools
firebase login
firebase use nexa-growth-studio
```

The Firebase web SDK is already installed in `package.json`.

## 2. Protect the web API key

Firebase web API keys identify a Firebase project; they are not server secrets and remain visible in the deployed browser bundle. Security is enforced by Authentication and Firebase rules.

The real configuration is stored in `.env.local`, which is excluded by `.gitignore`. The tracked `.env.example` contains placeholders.

In Google Cloud Console, open APIs & Services > Credentials, edit the browser key, select Websites under Application restrictions, and add:

```text
https://nexagrowthstudio.web.app/*
https://nexagrowthstudio.firebaseapp.com/*
https://nexa-growth-studio.web.app/*
https://nexa-growth-studio.firebaseapp.com/*
http://localhost:5173/*
http://127.0.0.1:5173/*
```

Add each custom production domain using `https://your-domain.example/*` before using it.

## 3. Enable Email/Password Authentication

1. Open Firebase Console > Build > Authentication.
2. Click Get started.
3. Open Sign-in method.
4. Open Email/Password.
5. Enable Email/Password and save. Do not enable public user registration in this application.
6. Open the Users tab.
7. Click Add user.
8. Enter the private administrator email and a strong password.
9. Create the user and copy its UID.

## 4. Add the administrator allowlist record

1. Open Firebase Console > Build > Realtime Database > Data.
2. At the database root, add a child named `admins`.
3. Under `admins`, add a child whose key is the exact UID copied in step 3.
4. Set its value to the Boolean `true`, not the text string `"true"`.

The result must look like:

```json
{
  "admins": {
    "PASTE_AUTH_USER_UID_HERE": true
  }
}
```

## 5. Create Firebase Storage

1. Open Firebase Console > Build > Storage.
2. Click Get started.
3. Choose production mode.
4. Select a location and finish setup.
5. Do not manually make the bucket public. This repository deploys `storage.rules`.

## 6. Verify the Hosting site

The repository targets the Hosting site ID `nexagrowthstudio`.

List the available sites:

```bash
firebase hosting:sites:list --project nexa-growth-studio
```

If `nexagrowthstudio` does not exist, create and map it:

```bash
firebase hosting:sites:create nexagrowthstudio --project nexa-growth-studio
firebase target:apply hosting nexagrowthstudio nexagrowthstudio --project nexa-growth-studio
```

If Firebase reports that the site ID is already owned by this project, only run the `target:apply` command.

## 7. Deploy security rules first

```bash
firebase deploy --only database,storage --project nexa-growth-studio
```

The deployed rules provide:

- Public read access only to published book data.
- Public create-only access for validated lead submissions.
- Administrator-only access to private books and all lead records.
- Authenticated-only uploads to Firebase Storage.
- A 5 MB cover limit and 30 MB PDF limit.

## 8. Build the website

```bash
npm run build
```

Firebase Hosting serves the generated `dist` directory. Do not change it to `public`.

## 9. Deploy Hosting

```bash
firebase deploy --only hosting:nexagrowthstudio --project nexa-growth-studio
```

Firebase prints the live Hosting URL when deployment completes.

## 10. Publish the first cloud data

1. Open the deployed website at `https://nexagrowthstudio.web.app/#/admin`.
2. Sign in with the Firebase Authentication email and password from step 3.
3. Open Settings > Cloud Sync.
4. Click Test Connection.
5. Click Push This Device to Cloud once.
6. Open the normal homepage in a private/incognito browser and verify that the book collection appears.
7. Upload a cover from a book's Assets tab, save the asset changes, and verify it in the private browser.

## 11. Change the administrator password

1. Open `#/admin` and sign in.
2. Open Settings.
3. Enter the current password, a new password of at least six characters, and confirmation.
4. Click Update Mega Password.

The change updates Firebase Authentication, not browser local storage.

## 12. Remove the old key from Git history

The hard-coded key has been removed from source files, but old Git commits still contain it. First make sure `.env.local` is not tracked:

```bash
git rm --cached .env.local 2>/dev/null || true
git add .gitignore .env.example src/firebase.ts
git commit -m "Secure Firebase client configuration"
```

For a public repository, create a new restricted browser key in Google Cloud Console, update `.env.local`, rebuild and deploy, then delete the old key. If GitHub still flags historical commits, use `git filter-repo` or GitHub Support to purge the old value from history before force-pushing.

## 13. Important security notes

- A Firebase web API key is visible in every deployed frontend by design. Never place service-account JSON, private keys, admin SDK credentials, email passwords, bank login details, or API secrets in any `VITE_` variable.
- The supplied Web Push VAPID public key is not used because this application does not currently send browser notifications. VAPID public keys are also client-visible.
- Do not enable anonymous or self-service email/password sign-up unless the database and storage rules are redesigned for it.
- Add App Check with reCAPTCHA Enterprise later if lead-form spam becomes a problem.