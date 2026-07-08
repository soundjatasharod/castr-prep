# CAST-R Prep — Setup Guide

## What you have

`castr-prep/index.html` + `app.js` — a pure client-side SPA that works immediately by drag-dropping to Netlify. In "local mode" each student's data stays on their own device. To share scores across all 45 students' phones for the real leaderboard, follow the Firebase steps below (about 10 minutes).

---

## Step 1: Firebase Realtime Database (shared leaderboard)

1. Go to **console.firebase.google.com** and sign in with your Google account.
2. Click **Add project** → name it `castr-prep` → disable Google Analytics → **Create project**.
3. In the left sidebar: **Build → Realtime Database → Create Database**.
   - Choose **United States** for location.
   - Start in **test mode** (you'll secure it in Step 2).
4. Click the **gear icon → Project settings**.
5. Scroll to **Your apps** → click the `</>` Web icon → register with nickname `castr-web`.
6. Copy the `firebaseConfig` object shown (it looks like):
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "castr-prep.firebaseapp.com",
     databaseURL: "https://castr-prep-default-rtdb.firebaseio.com",
     ...
   };
   ```
7. Open `app.js` and replace the `FIREBASE_CONFIG` block at the very top with your values.

---

## Step 2: Secure the database (prevents random writes)

In Firebase Console → **Realtime Database → Rules**, replace the rules with:

```json
{
  "rules": {
    "profiles": {
      ".read": true,
      ".write": true
    },
    "flags": {
      ".read": true,
      ".write": true
    }
  }
}
```

This allows any client to read/write (appropriate for a closed internal cohort — students aren't authenticated). If you want tighter security later, add Firebase Auth.

---

## Step 3: Deploy to Netlify

1. Go to **netlify.com** and sign in (free account is fine).
2. From your dashboard click **Add new site → Deploy manually**.
3. Drag the `castr-prep/` **folder** onto the Netlify drop zone.
4. Netlify gives you a URL like `https://random-name.netlify.app`.
5. Optional: click **Site configuration → Change site name** to get something like `castr-prep-comted.netlify.app`.
6. Share that URL with your 45 students — they open it on their phones.

**To update after changes:** just drag the folder again onto the same site in Netlify. It redeploys in about 10 seconds.

---

## Weekly workflow

- **Export data:** Sign in as admin (Soundjata Sharod, PIN 2468) → click **Export CSV** in the top bar. Save weekly as your backup.
- **Week resets automatically** — the scoring formula uses weeks-since-launch, so Week 1 starts July 9, Week 2 starts July 16, etc. No manual reset needed.
- **Student forgot PIN / wrong crew:** Go to admin view → expand their row → edit PIN or reassign crew inline.
- **Bad question:** Student taps "Something wrong with this question?" → their report shows up in admin under **Flagged Questions**. Review and dismiss as needed.

---

## Admin access

Sign in with:
- **First name:** Soundjata
- **Last name:** Sharod
- **PIN:** 2468

You land on the admin view automatically. Enable **Test Mode** to practice questions without polluting crew scores.

---

## Contact / support

Students with account issues are directed to email **soundjatasharod@gmail.com** (the "Forgot PIN?" link and Settings screen both pre-fill the address).
