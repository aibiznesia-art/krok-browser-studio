const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');
const { REGISTRY, runSkills } = require('./skills/local-skills');
const { registry: localModelRegistry, models: localModels, baseUrl: localLlmBaseUrl, rewriteLocally } = require('./local-llm');

const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const MODEL = process.env.LLM_MODEL || 'gpt-6.1-sol';
const MAX_BODY = 64 * 1024;

const schema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { heading: { type: 'string' }, body: { type: 'string' } },
        required: ['heading', 'body']
      }
    },
    cta: { type: 'string' }
  },
  required: ['title', 'summary', 'sections', 'cta']
};

function send(res, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    ...headers
  });
  res.end(body);
}

function safeString(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function cleanSources(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).map((item) => ({
    url: safeString(item?.url, 500),
    kind: safeString(item?.kind, 80),
    retrieved_at: safeString(item?.retrieved_at, 80),
    preview: safeString(item?.preview, 1800)
  })).filter((item) => /^https?:\/\//i.test(item.url));
}

function parseJsonContent(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  const withoutFence = raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  return JSON.parse(withoutFence);
}

async function generateContent(input) {
  const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
  const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
  if (!forgeUrl || !forgeKey) {
    const error = new Error('Built-in LLM server credentials are unavailable.');
    error.code = 'LLM_NOT_CONFIGURED';
    throw error;
  }

  const topic = safeString(input.topic, 240) || 'актуальні цифрові рішення для бізнесу';
  const brief = safeString(input.brief, 4000);
  const sources = cleanSources(input.sources);
  const sourceText = sources.length
    ? JSON.stringify(sources, null, 2)
    : 'Немає переданих джерел. Не вигадуй факти й не приписуй твердження конкретним джерелам.';

  const system = [
    'Ти — серверний редактор KROK Browser Studio.',
    'Створи оригінальну україномовну чернетку контенту для односторінкового сайту.',
    'Не копіюй дослівно чужі тексти, не вигадуй факти, цифри, цитати або характеристики.',
    'Використовуй джерела лише як контекст. Якщо доказів недостатньо, пиши обережно й залишай матеріал на людську перевірку.',
    'Поверни тільки JSON за заданою схемою, без Markdown-огорожі.'
  ].join(' ');
  const user = JSON.stringify({ topic, brief, sources }, null, 2);

  const response = await fetch(`${forgeUrl.replace(/\/$/, '')}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${forgeKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: `Згенеруй чернетку за цим контекстом:\n${user}\n\nДані джерел для аудиту:\n${sourceText}` }
      ],
      max_completion_tokens: 1400,
      reasoning: { effort: 'low' },
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'krok_content_draft', strict: true, schema }
      }
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || `LLM request failed with status ${response.status}`);
    error.code = 'LLM_REQUEST_FAILED';
    throw error;
  }
  const message = data?.choices?.[0]?.message?.content;
  if (!message) {
    const error = new Error('LLM returned an empty content response.');
    error.code = 'LLM_EMPTY_RESPONSE';
    throw error;
  }
  const generated = parseJsonContent(message);
  return {
    ...generated,
    provider: 'manus-built-in-llm',
    model: MODEL,
    sources,
    generated_at: new Date().toISOString(),
    requires_human_review: true
  };
}

function serveStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(ROOT, `.${requested}`);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    send(res, 404, { error: 'Not found' });
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/plain; charset=utf-8' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    send(res, 200, { ok: true, adapter: 'manus-built-in-llm', model: MODEL, local_skills: REGISTRY.skills.length, local_rewrite: { provider: localModelRegistry.provider, models: localModels, base_url: localLlmBaseUrl, paid_api: false }, token_cost: 0 });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/models/local') {
    send(res, 200, { ok: true, ...localModelRegistry, models: localModelRegistry.models.map((item) => ({ ...item, enabled: localModels.includes(item.id) })), base_url: localLlmBaseUrl, paid_api: false });
    return;
  }
  if (req.method === 'GET' && url.pathname === '/api/skills') {
    send(res, 200, { ok: true, execution: REGISTRY.execution, token_cost: REGISTRY.token_cost, skills: REGISTRY.skills });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/skills/run') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', () => {
      try {
        const input = JSON.parse(body || '{}');
        const results = runSkills(input.skills, { urls: Array.isArray(input.urls) ? input.urls.slice(0, 50) : [] });
        send(res, 200, { ok: true, execution: REGISTRY.execution, token_cost: 0, results });
      } catch (error) {
        send(res, 400, { ok: false, error: error.message, code: 'SKILL_REQUEST_INVALID' });
      }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/generate') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        const content = await generateContent(input);
        send(res, 200, { ok: true, content });
      } catch (error) {
        const status = error.code === 'LLM_NOT_CONFIGURED' ? 503 : 502;
        send(res, status, { ok: false, error: error.message, code: error.code || 'LLM_ERROR' });
      }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/api/content/rewrite') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) req.destroy();
    });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        const content = await rewriteLocally(input);
        send(res, 200, { ok: true, content });
      } catch (error) {
        send(res, error.code === 'LOCAL_LLM_UNAVAILABLE' ? 503 : 502, { ok: false, error: error.message, code: error.code || 'LOCAL_LLM_ERROR', attempts: error.attempts || [] });
      }
    });
    return;
  }
  if (req.method === 'GET') {
    serveStatic(req, res, url.pathname);
    return;
  }
  send(res, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
});

server.listen(PORT, '0.0.0.0', () => console.log(`KROK Browser Studio server listening on ${PORT}`));
