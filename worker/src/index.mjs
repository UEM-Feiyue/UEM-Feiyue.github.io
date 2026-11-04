// Public GitHub Issues intake. Deploy separately from GitHub Pages.
// All sensitive credentials live in Cloudflare Worker secrets.
import schema from '../../data/schema.json' with { type: 'json' };

const ORIGINS = new Set(['https://uem-feiyue.github.io']);
const REPOSITORY = 'UEM-Feiyue/UEM-Feiyue.github.io';
const MAX_BYTES = 25000;
const ACTION = 'uem_submit';

function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status, headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...(origin ? {'Access-Control-Allow-Origin': origin, 'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'} : {})
    }
  });
}

function validate(data) {
  if (!data || data.version !== 1 || typeof data.category !== 'string' ||
      !schema.categories.some(c => c.id === data.category)) return false;
  const names = new Set(schema.fields.map(f => f.name));
  if (Object.keys(data).some(k => !names.has(k) && !['version', 'category'].includes(k))) return false;
  for (const field of schema.fields) {
    const value = data[field.name];
    if (typeof value !== 'string' || (field.required && !value.trim()) ||
        (field.maxLength && value.length > field.maxLength) ||
        /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) return false;
    if (field.pattern && value && !(new RegExp('^(?:' + field.pattern + ')$')).test(value)) return false;
  }
  return data.body.trim().length >= 20 && data.body.length <= 12000 &&
         data.contact.length <= 4000;
}

async function limitedJson(request) {
  if (!request.body) throw Error('No request body');
  const reader = request.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_BYTES) throw Error('Request too large');
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder('utf-8', {fatal:true}).decode(result));
}

function base64url(text) {
  const encoded = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of encoded) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function formatIssue(data) {
  const category = schema.categories.find(c => c.id === data.category).label;
  const title = '[飞跃投稿] [' + category + '] ' + data.author.trim() + ' — ' + data.destination.trim();
  const record = Object.fromEntries(['version', 'category', ...schema.fields.map(f => f.name)]
    .map(key => [key, typeof data[key] === 'string' ? data[key].trim() : data[key]]));
  const lines = [
    '## 飞跃手册投稿 · 待审核', '',
    '> 本 Issue 是公开投稿，审核通过前不会进入正式飞跃手册。请勿填写不愿公开的信息。', '',
    '**分享方向：** ' + category,
    '**署名：** ' + record.author,
    '**届别：** ' + record.year,
    '**去向：** ' + record.destination,
    '**专业 / 项目 / 岗位：** ' + (record.program || '未填写'), '',
    '### 经历正文', '',
    record.body, ''
  ];
  if (record.contact) lines.push('### 公开联系方式', '', record.contact, '');
  lines.push('<!-- uem-submission-v1:' + base64url(JSON.stringify(record)) + ' -->');
  return {title: title.slice(0, 200), body: lines.join('\n')};
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ORIGINS.has(origin)) return json({ok:false,message:'来源不受支持'},403,null);
    const url = new URL(request.url);
    if (url.pathname !== '/submit') return json({ok:false,message:'Not found'},404,origin);
    if (request.method === 'OPTIONS') return json({ok:true},204,origin);
    if (request.method !== 'POST') return json({ok:false,message:'Method not allowed'},405,origin);
    if (env.SUBMISSIONS_DISABLED !== 'false') return json({ok:false,message:'投稿服务暂未开放'},503,origin);
    if (!env.GITHUB_TOKEN || !env.TURNSTILE_SECRET) return json({ok:false,message:'投稿服务尚未配置'},503,origin);
    if (!(request.headers.get('Content-Type') || '').startsWith('application/json'))
      return json({ok:false,message:'请使用 JSON 请求'},415,origin);
    let payload;
    try { payload = await limitedJson(request); }
    catch { return json({ok:false,message:'提交内容过大或格式有误'},400,origin); }
    const {turnstileToken, ...data} = payload || {};
    if (!validate(data) || typeof turnstileToken !== 'string' || turnstileToken.length < 10)
      return json({ok:false,message:'请检查必填内容并重新完成人机验证'},400,origin);
    let verification;
    try {
      const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method:'POST',
        headers:{'Content-Type':'application/x-www-form-urlencoded'},
        body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:turnstileToken}),
        signal:AbortSignal.timeout(10000)
      });
      if (!response.ok) throw Error('Verification unavailable');
      verification = await response.json();
    } catch {
      return json({ok:false,message:'人机验证暂不可用，请稍后再试'},503,origin);
    }
    if (verification.success !== true || verification.hostname !== new URL(origin).hostname ||
        verification.action !== ACTION)
      return json({ok:false,message:'人机验证无效，请重新验证'},403,origin);
    const issue = formatIssue(data);
    try {
      const response = await fetch('https://api.github.com/repos/' + REPOSITORY + '/issues', {
        method:'POST',
        headers:{
          Authorization:'Bearer ' + env.GITHUB_TOKEN,
          Accept:'application/vnd.github+json',
          'X-GitHub-Api-Version':'2022-11-28',
          'Content-Type':'application/json',
          'User-Agent':'UEM-Feiyue-Submissions'
        },
        body:JSON.stringify({...issue, labels:['submission:pending']}),
        signal:AbortSignal.timeout(12000)
      });
      if (!response.ok) throw Error('GitHub issue creation ' + response.status);
      const result = await response.json();
      if (!/^https:\/\/github\.com\/UEM-Feiyue\/UEM-Feiyue\.github\.io\/issues\/\d+$/.test(result.html_url || ''))
        throw Error('Unexpected GitHub response');
      return json({ok:true,issueUrl:result.html_url},201,origin);
    } catch {
      return json({ok:false,message:'暂时无法提交到 GitHub，请稍后重试。为避免重复，请先查看仓库 Issues'},503,origin);
    }
  }
};

export { validate, formatIssue };
