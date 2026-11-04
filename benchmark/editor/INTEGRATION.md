# Editor integration decision (experiment only)

## Verified
- Both isolated variants compile on GitHub Actions.
- Chromium automation covers basic Chinese headings, HTML paste, Markdown export, temporary image insertion, heading/list/quote conversion and unsafe paste rejection.
- Tiptap starter variant emits much less JS/CSS than the full Milkdown Crepe variant. The configurations are not feature-equivalent.

## Decision
Proceed with a **Tiptap-first integration prototype**, loaded only on the submission page. Keep the rest of the site framework-free. The editor's Markdown output is the content contract, not its HTML DOM or internal JSON. Preserve `data/schema.json` as the only field/category definition.

## Existing production behavior
`submit.html` explicitly says submissions are not connected to GitHub Issues. `assets/js/submit.js` handles schema, textarea toolbar, resizing, draft and a separate hand-written Markdown preview. `scripts/build.py` is the authoritative renderer. Do not present preview as pixel-identical to published output until verified.

## Image lifecycle: blocker for production
Blob URLs and local data URLs are **not publishable**. A GitHub Issue body cannot persist browser-local image files. Do not silently export `blob:` or `data:` URLs to Markdown. Choose an explicit upload path and confirm the security/privacy model before enabling image insertion in the live editor. Until then, prefer disabling local image insertion with a clear message rather than pretending the image will be published.

## Implementation boundaries
1. Bundle the editor as static versioned assets; no runtime CDN or framework.
2. Use progressive enhancement: if the editor fails to load, keep a functional Markdown textarea and preserve draft text.
3. Remove the existing Markdown toolbar and bespoke preview renderer once equivalent functionality is integrated; do not maintain two editor experiences.
4. Keep the existing session-scoped draft privacy behavior (exclude contact). Test reset, category changes and restore.
5. Use real clipboard samples from Word/WPS/Feishu/Tencent Docs and iPhone Safari before declaring compatibility.
6. Pin dependencies and commit a lockfile for reproducible builds; use `npm ci` in production CI.
7. No new backend, storage or GitHub issue submission side effects without explicit design and verification.

## Remaining acceptance gates
- Real iOS Safari Chinese IME, selection, undo and paste.
- Word/WPS rich text samples including nested lists and headings.
- Markdown import/export round trip and Python renderer parity.
- Images persist across refresh and publish to stable HTTPS URLs (or image insertion stays disabled).
- Build and accessibility regression checks.
