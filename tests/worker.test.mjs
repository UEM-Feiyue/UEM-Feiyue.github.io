import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validate, issueFor } from '../worker/src/index.js';

const valid = {
  version: 1, category: 'career', author: '张同学', year: '2026',
  destination: '某科技公司', program: '软件工程师',
  body: '我准备了项目经历和面试。', contact: '', turnstileToken: 'sample-token'
};
const request = (body = valid, origin = 'https://uem-feiyue.github.io') =>
  new Request('https://worker.example/submit', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.1' },
    body: JSON.stringify(body)
  });
test('validates with the canonical schema', () => {
  assert.equal(validate(valid)?.category, 'career');
  assert.equal(validate({ ...valid, category: 'made-up' }), null);
  assert.equal(validate({ ...valid, year: '20xx' }), null);
  assert.equal(validate({ ...valid, author: '' }), null);
  assert.equal(validate({ ...valid, body: 'x'.repeat(12001) }), null);
  assert.equal(validate({ ...valid, contact: 'x'.repeat(501) }), null);
  assert.equal(validate({ ...valid, author: 123 }), null);
});
test('renders a public, reviewable Issue', () => {
  const issue = issueFor(validate(valid));
  assert.match(issue.title, /^\[飞跃手册投稿\]/);
  assert.deepEqual(issue.labels, ['submission:pending']);
  assert.match(issue.body, /uem-submission-v1:/);
  assert.match(issue.body, /待审核/);
  assert.doesNotMatch(issue.body, /sample-token/);
});
test('fails closed before contacting external services', async () => {
  let contacted = false;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { contacted = true; throw Error('Unexpected call'); };
  try {
    const env = { SUBMISSION_MODE: 'closed', SUBMISSIONS_DISABLED: 'true' };
    const response = await worker.fetch(request(), env);
    assert.equal(response.status, 503);
    assert.equal(contacted, false);
    assert.equal((await worker.fetch(request(valid, 'https://evil.example'), env)).status, 403);
  } finally { globalThis.fetch = oldFetch; }
});
test('rejects malformed submissions before Turnstile or GitHub', async () => {
  let contacted = false;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => { contacted = true; throw Error('Unexpected call'); };
  try {
    const env = {
      SUBMISSION_MODE: 'public', SUBMISSIONS_DISABLED: 'false',
      GITHUB_TOKEN: 'dummy', TURNSTILE_SECRET: 'dummy',
      SUBMISSION_LIMITER: { limit: async () => ({ success: true }) }
    };
    const response = await worker.fetch(request({ ...valid, category: 'fake' }), env);
    assert.equal(response.status, 400);
    assert.equal(contacted, false);
  } finally { globalThis.fetch = oldFetch; }
});
