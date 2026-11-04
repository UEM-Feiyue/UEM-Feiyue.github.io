# Editor comparison

Isolated experiment, not a production editor. Both variants are built with Vite. Run `npm install && npm run benchmark && npx playwright install chromium && npm test`.

The automated Chromium checks cover initial Chinese content, Markdown output, synthetic semantic HTML paste in Tiptap and a temporary image. They **do not** establish Word/WPS/Feishu compatibility, iOS Safari reliability, actual image uploads, or Markdown round-trip correctness.

Dependency versions are exact in package.json for this experiment; a committed lockfile and `npm ci` are required before production integration. The benchmark sums all emitted JS/CSS assets, including chunks not necessarily downloaded on initial load; do not interpret as real network transfer.

Manual acceptance remains necessary: paste genuine documents from Word/WPS/Feishu/Tencent Docs; inspect headings, links, lists and images; test Chinese IME, undo/redo, cursor and image operations on a real iPhone Safari.
