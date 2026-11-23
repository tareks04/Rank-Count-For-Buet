# PCM Nationwide Rank Estimator

Interactive nationwide rank estimator for Bangladesh HSC PCM (Physics + Chemistry + Higher Math) total marks out of 600, including board-by-board breakdown, BUET top-10,000 cutoff modeling, subject calculator, and HiDPI rank curve.

## Local Development

```bash
npm install
npm test
npm run lint
npm run dev
```

## GitHub, Releases & Hosting Deployment

This repository includes `.github/workflows/release-and-deploy.yml`, `vercel.json`, and `netlify.toml` for direct static hosting and automated GitHub Releases.

### 1. Push to GitHub and Publish `v1.0.0` Release

```bash
git init
git add .
git commit -m "Release v1.0.0"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main

# Create and push the release tag to trigger GitHub Release + GitHub Pages deploy
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

In your GitHub repository **Settings → Pages**, set **Source** to **GitHub Actions**. Every push to `main` deploys the live site, and every `v*.*.*` tag creates a GitHub Release with packaged `.tar.gz` and `.zip` build artifacts.

### 2. Alternative Direct Hosting

- **Vercel**: Run `npx vercel --prod` (configured via `vercel.json`).
- **Netlify**: Run `npx netlify deploy --prod` (configured via `netlify.toml`).
