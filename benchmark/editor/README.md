# Isolated editor benchmark

This experiment lives on a separate branch. It does not modify the production site.

Run `npm install`, then `npm run benchmark` inside this directory. Open `npm run dev` for manual testing.

Two separately bundled entry points are measured using the same Vite settings. Bundle sizes are **not** equivalent to total runtime costs. Run real iPhone Safari and Word/WPS/Feishu/Tencent Docs clipboard tests before deciding.

Check Chinese IME composition, undo/redo, headings, lists, bold, links, paste sanitization, image insertion, Markdown export, accessibility and dark mode.

No image is uploaded to a server. The temporary object URL is for the experiment only and is not publishable. The production integration must implement image lifecycle and safe URL rewriting.

The current site remains unchanged until results are verified.
