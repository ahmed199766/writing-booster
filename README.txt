Writing Booster v3.5 Pro — FULL (Non‑Lite)
=================================
Files:
- index.html, style.css, app.js
- manifest.webmanifest, sw.js
- worker/cloudflare_worker.js

GitHub Pages:
1) Upload all files to repo root (main branch).
2) Enable Pages (main / root).
3) Open https://<user>.github.io/writing-booster/?nocache=1

Cloudflare Worker (TED auto captions):
1) Create Worker -> paste worker/cloudflare_worker.js -> Deploy.
2) Copy URL (https://ted-captions.<subdomain>.workers.dev).
3) Edit app.js -> set WORKER_URL to your URL -> Commit.
4) In site: Dictation -> Load TED -> Fetch captions -> Pick 15–30s -> Train.
