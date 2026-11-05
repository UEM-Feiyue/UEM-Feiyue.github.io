# UEM Feiyue submission Worker

This independent Cloudflare Worker accepts submissions from the production origin
`https://uem-feiyue.github.io` and creates **public GitHub Issues** in
`UEM-Feiyue/UEM-Feiyue.github.io`. It never edits published articles or bypasses
maintainer review.

## Configuration

- Worker name: `uem-feiyue-submissions`.
- API: `POST /submit`; public liveness endpoint: `GET /health`.
- Cloudflare Turnstile widget: restrict to `uem-feiyue.github.io`, action `uem_feiyue_submit`.
- Worker secrets: `GITHUB_TOKEN` and `TURNSTILE_SECRET`. Never commit their values.
- GitHub fine-grained PAT: restricted to this repository, **Issues: Read and write** only.
- Create the GitHub label `submission:pending` before enabling public submissions.
- The native rate limit binding is edge-local: three attempts per minute per IP, not a globally strict quota. The configuration's numeric namespace ID is local to this Worker; ensure it does not collide with another binding in the Cloudflare account.
- Allowlist the exact production origin only; no wildcard, no preview environment.

Run from `worker/` with Wrangler: `npx wrangler deploy`.
Before deployment, add secrets with
`npx wrangler secret put GITHUB_TOKEN` and
`npx wrangler secret put TURNSTILE_SECRET`.
The checked-in configuration is **closed by default**.
To launch, explicitly set both production variables to
`SUBMISSION_MODE=public` and `SUBMISSIONS_DISABLED=false` in the Cloudflare dashboard
*after* the secrets, origin, Turnstile, rate limiting and GitHub token have been verified.
Recheck the live settings after each deployment; the repository defaults remain closed.
To stop accepting submissions, change `SUBMISSIONS_DISABLED=true`.

## Contract and privacy

A JSON request has `version:1`, `category`, the fields from
`data/schema.json` (`author`, `year`, `destination`, `program`,
`body`, `contact`) and a `turnstileToken`. Validation uses the shared
schema, with a hard 24 KiB HTTP payload cap. The body and contact fields
also have explicit shared-schema length caps. No database or attachments.

Successful creation returns HTTP 201:
`{"ok":true,"issueUrl":"https://github.com/.../issues/123"}`.
A success response means **an Issue exists**, not that the story was approved
or published. Issues are public immediately, including any voluntarily
provided contact information. The Issue body includes an auditable
`uem-submission-v1` data marker for a future trusted publication importer.
Never publish directly from this untrusted Worker.

The site's submission UI remains preview-only until the public Turnstile
site key, real Worker endpoint and explicit submission workflow are configured.
The completed-Issue-to-Markdown publication automation is a separate,
trusted GitHub Actions responsibility; **closing an Issue does not publish
a story until that importer is implemented and verified**.

## Security

Only permitted origins receive CORS headers. Every POST requires an explicit
open switch, a configured rate limiter, a bounded JSON body, server-side
Turnstile Siteverify (including hostname and action), and the GitHub token.
Any dependency failure rejects the request. No IP is placed into Issues.
An attacker can still abuse a public endpoint; monitor GitHub and Worker usage,
rotate credentials when necessary, and close the kill switch if abuse occurs.
