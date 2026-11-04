# UEM Feiyue submission gateway

The static website never receives a GitHub token. Cloudflare Worker verifies a Turnstile token and creates an open GitHub Issue tagged `submission:pending`. Only a **maintainer-completed** Issue is eligible for automatic publication.

## Setup (explicit opt-in)

1. Create a Cloudflare Turnstile widget restricted to `uem-feiyue.github.io`, action `uem_submit`.
2. Create GitHub label `submission:pending` in `UEM-Feiyue/UEM-Feiyue.github.io`.
3. Create a fine-grained GitHub token restricted to this one repository, **Issues: read/write only**. Never grant Contents permission to this token.
4. In `worker/`: `npx wrangler secret put GITHUB_TOKEN` and `npx wrangler secret put TURNSTILE_SECRET`, then `npx wrangler deploy`. Configure `SUBMISSIONS_DISABLED=false` in your deployed Worker environment after manual testing. The checked-in default is disabled intentionally.
5. Set the **public** `apiEndpoint` and `turnstileSiteKey` in `assets/js/submission-config.js`. The endpoint must be HTTPS and end in `/submit`. These values are not secrets.
6. Check GitHub Actions workflow permission to push to main. If main is protected against GitHub Actions, use a PR-based publisher instead of bypassing protection.
7. Verify a clearly marked test Issue through Turnstile → Issue creation, then close it **as not planned**; never approve a test record. Confirm a reviewed real submission follows completed → `content/submissions/issue-N.md` → Pages deployment.

The Worker fails closed unless `SUBMISSIONS_DISABLED=false` and both secrets exist. Restrict CORS origins in `worker/src/index.mjs` if the public site domain changes. No app-side or browser-side GitHub access tokens.

**Review rule:** `Close as completed` by `FuTseYi` is the only publishing approval. `Not planned` only rejects. Reopening does not unpublish. The GitHub Actions importer independently validates the structured submission data.

## Privacy / operations

GitHub Issues are public **immediately**, including the Markdown body and optional contact data, even before approval. Turnstile reduces abuse but is not a comprehensive rate limiter. GitHub API write errors do not prove that no Issue was created; check Issues before retrying. To stop new submissions, set `SUBMISSIONS_DISABLED=true` in Worker environment.

Do not claim end-to-end integration is live until secrets, public configuration, workflow permissions and a real approved publication have all been checked.
