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

The deployment workflow computes `VITE_BASE_PATH` before `npm run build`:

- `/<repo>/` for project Pages repositories
- `/` for user or organization Pages repositories (`*.github.io`)

This guarantees that generated asset URLs are valid for the final Pages URL and prevents blank-page failures caused by incorrect absolute paths.
