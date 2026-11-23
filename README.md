# PCM Nationwide Rank Estimator

Interactive nationwide rank estimator for Bangladesh HSC PCM (Physics + Chemistry + Higher Math) total marks out of 600 (`470–600`), including board-by-board breakdown, BUET top-10,000 cutoff modeling, subject calculator, and HiDPI rank curve.

## Download Android APK

When published to GitHub Releases, users can download the installable `.apk` directly from the **Releases** tab of your repository (`https://github.com/<your-username>/<your-repo>/releases/latest`).

## Local Development

```bash
npm install
npm test
npm run lint
npm run dev
```

## GitHub, Android APK Releases & Direct Hosting

This repository includes:
- `.github/workflows/release-and-deploy.yml` — runs unit tests, builds the web app, deploys to **GitHub Pages**, compiles the **Android `.apk`** via Capacitor (`capacitor.config.ts`), and attaches the `.apk` + web archives directly to **GitHub Releases**.
- `vercel.json` & `netlify.toml` — zero-config static web deployment.

### 1. Push to GitHub and Publish `v1.0.0` (with `.apk` in Releases)

```bash
git init
git add .
git commit -m "Release v1.0.0"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main

# Tag and push to deploy GitHub Pages + publish GitHub Release with .apk
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

In your GitHub repository **Settings → Pages**, set **Source** to **GitHub Actions**.

### 2. Optional Release Keystore Secrets (Android Play/Signed Release)

Without secrets, the workflow builds a directly installable signed debug `.apk`. To sign a release APK with your own keystore, add these repository secrets in GitHub:
- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

### 3. Alternative Direct Web Hosting

- **Vercel**: `npx vercel --prod`
- **Netlify**: `npx netlify deploy --prod`
