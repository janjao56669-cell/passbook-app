# Passbook App (frontend)

This is the app itself — deploy this to GitHub Pages so it's a real hosted web app
(installable, no login required for manual entry).

## Before deploying

1. Deploy the `passbook-api` backend first (see its README) and get your Vercel URL.
2. Open `index.html`, find this line near the bottom:
   ```js
   const API_ENDPOINT = 'https://YOUR-VERCEL-PROJECT.vercel.app/api/scan-slip';
   ```
   Replace it with your actual Vercel URL.

## Deploy to GitHub Pages

1. Create a **new GitHub repo** (e.g. `passbook-app`) — can be public or private
   (private repos can still use GitHub Pages on free accounts, but the site itself
   will be publicly viewable if Pages is enabled).
2. Upload all files in this folder: `index.html`, `manifest.json`, `sw.js`,
   `icon-192.png`, `icon-512.png`.
3. In the repo, go to **Settings → Pages**.
4. Under "Build and deployment", set **Source: Deploy from a branch**,
   **Branch: main**, folder **/ (root)**. Save.
5. Wait a minute or two, then your app will be live at:
   `https://<your-username>.github.io/passbook-app/`

## Installing as an app (PWA)

Open the link above on the phone that will use it (e.g. dad's phone), in Chrome:
- Tap the **⋮ menu → Install app** (or "Add to Home screen").
- An icon appears on the home screen — tapping it opens the app full-screen,
  no browser address bar, feels like a real installed app.

## Notes

- Manual entry, categories, charts, and history all work immediately, no login needed.
- The slip-scan button calls your own Vercel backend — also no login needed for whoever
  opens the app, since the API key lives safely on the server, not in this code.
- Data is stored in the browser's local storage on whichever device opens the app —
  it does **not** sync between different phones/devices automatically.
