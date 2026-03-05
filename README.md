<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# SF2 Forge

## Local development

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Set `GEMINI_API_KEY` in `.env.local`
3. Start dev server: `npm run dev`

## GitHub Pages deployment

The repository includes `.github/workflows/deploy.yml`, which builds and deploys `dist/` to GitHub Pages on pushes to `main`.

Required repository settings:

1. In **Settings → Pages**, set **Source** to **GitHub Actions**.
2. Ensure Actions are enabled for the repository.

The Vite base path is computed from `GITHUB_REPOSITORY` in CI, so the generated asset URLs are compatible with the repository Pages URL.
