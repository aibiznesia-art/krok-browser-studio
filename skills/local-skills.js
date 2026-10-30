const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const REGISTRY = JSON.parse(fs.readFileSync(path.join(__dirname, 'registry.json'), 'utf8'));
const SKILLS = new Map(REGISTRY.skills.map((skill) => [skill.id, skill]));
const IGNORED = new Set(['.git', 'node_modules', 'site-dist', 'artifacts']);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function result(id, passed, summary, details = []) {
  return { id, name: SKILLS.get(id)?.name || id, passed, summary, details, token_cost: 0, execution: 'local-deterministic' };
}

function isPublicUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)/i.test(u.hostname);
  } catch { return false; }
}

function htmlValidate() {
  const file = path.join(ROOT, 'index.html');
  const text = fs.readFileSync(file, 'utf8');
  const checks = [
    ['doctype', /^<!doctype html>/i.test(text)],
    ['html', /<html\b[\s\S]*<\/html>/i.test(text)],
    ['head', /<head\b[\s\S]*<\/head>/i.test(text)],
    ['body', /<body\b[\s\S]*<\/body>/i.test(text)],
    ['title', /<title[^>]*>[^<]+<\/title>/i.test(text)],
    ['h1', /<h1\b[\s\S]*?<\/h1>/i.test(text)]
  ];
  const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
  return result('html_validate', failed.length === 0, failed.length ? `HTML не пройшов: ${failed.join(', ')}` : 'HTML-структура та обовʼязкові SEO-теги присутні.', checks.map(([name, ok]) => `${ok ? 'PASS' : 'FAIL'} ${name}`));
}

function codeSyntax() {
  const targets = ['app.js', 'server.js'];
  const details = [];
  let passed = true;
  for (const target of targets) {
    const check = spawnSync(process.execPath, ['--check', path.join(ROOT, target)], { encoding: 'utf8' });
    const ok = check.status === 0;
    passed = passed && ok;
    details.push(`${ok ? 'PASS' : 'FAIL'} ${target}${ok ? '' : ` — ${check.stderr.trim()}`}`);
  }
  const pythonFiles = walk(path.join(ROOT, 'agents')).filter((file) => file.endsWith('.py'));
  if (pythonFiles.length) {
    const check = spawnSync('python3', ['-m', 'py_compile', ...pythonFiles], { encoding: 'utf8' });
    const ok = check.status === 0;
    passed = passed && ok;
    details.push(`${ok ? 'PASS' : 'FAIL'} Python agents (${pythonFiles.length})${ok ? '' : ` — ${check.stderr.trim()}`}`);
  }
  return result('code_syntax', passed, passed ? 'JavaScript і Python-агенти проходять синтаксичну перевірку.' : 'Є синтаксичні помилки у коді.', details);
}

function secretScan() {
  const patterns = [
    ['GitHub classic token', /ghp_[A-Za-z0-9_]+/],
    ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]+/],
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['assigned API key', /(?:OPENAI_API_KEY|BUILT_IN_FORGE_API_KEY)\s*=\s*[^$\s][^\n]*/]
  ];
  const hits = [];
  for (const file of walk(ROOT)) {
    if (file.endsWith('.example') || file.endsWith('registry.json')) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const [name, pattern] of patterns) if (pattern.test(text)) hits.push(`${name}: ${path.relative(ROOT, file)}`);
  }
  return result('secret_scan', hits.length === 0, hits.length ? 'Знайдено потенційні секрети — публікацію заблоковано.' : 'Секретних значень у проєкті не знайдено.', hits);
}

function seoCheck() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const required = {
    description: /<meta[^>]+name=["']description["']/i.test(html),
    robots: /<meta[^>]+name=["']robots["']/i.test(html),
    ogTitle: /property=["']og:title["']/i.test(html),
    routes: fs.existsSync(path.join(ROOT, 'manus-routes.json')) || fs.existsSync(path.join(ROOT, 'public', 'manus-routes.json')),
    robotsFile: fs.existsSync(path.join(ROOT, 'robots.txt')) || fs.existsSync(path.join(ROOT, 'public', 'robots.txt')),
    sitemapFile: fs.existsSync(path.join(ROOT, 'sitemap.xml')) || fs.existsSync(path.join(ROOT, 'public', 'sitemap.xml'))
  };
  const missing = Object.entries(required).filter(([, ok]) => !ok).map(([key]) => key);
  return result('seo_check', missing.length === 0, missing.length ? `SEO потребує уваги: ${missing.join(', ')}` : 'SEO meta, маршрут і crawl-файли готові.', Object.entries(required).map(([key, ok]) => `${ok ? 'PASS' : 'WARN'} ${key}`));
}

function sourcePolicy(payload = {}) {
  const values = Array.isArray(payload.urls) ? payload.urls : [];
  const invalid = values.filter((url) => !isPublicUrl(url));
  return result('source_policy', invalid.length === 0, invalid.length ? 'Є URL, які не відповідають public-only HTTPS політиці.' : `Перевірено відкритих URL: ${values.length}.`, invalid.map((url) => `BLOCK ${url}`));
}

function workflowAudit() {
  const dir = path.join(ROOT, '.github', 'workflows');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((file) => file.endsWith('.yml') || file.endsWith('.yaml')) : [];
  const details = [];
  let passed = files.length > 0;
  for (const file of files) {
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    const hasPages = /deploy-pages@v\d+|upload-pages-artifact@v\d+/.test(text);
    const hasCheckout = /actions\/checkout@v\d+/.test(text);
    const hasConfirmation = file === 'pages.yml' ? /confirm_publish|PUBLISH/.test(text) : true;
    const hasLiteralSecret = /(ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|-----BEGIN [A-Z ]+PRIVATE KEY-----)/.test(text);
    const ok = hasCheckout && (!file.includes('pages') || hasPages) && hasConfirmation && !hasLiteralSecret;
    passed = passed && ok;
    details.push(`${ok ? 'PASS' : 'WARN'} ${file}: checkout=${hasCheckout}, pages=${hasPages}, confirmation=${hasConfirmation}, literal_secret=${hasLiteralSecret}`);
  }
  return result('workflow_audit', passed, passed ? 'GitHub Actions workflows мають базовий release/security gate.' : 'Workflow потребує ручної перевірки перед публікацією.', details);
}

function runSkill(id, payload = {}) {
  if (!SKILLS.has(id)) throw new Error(`Unknown local skill: ${id}`);
  if (id === 'html_validate') return htmlValidate();
  if (id === 'code_syntax') return codeSyntax();
  if (id === 'secret_scan') return secretScan();
  if (id === 'seo_check') return seoCheck();
  if (id === 'source_policy') return sourcePolicy(payload);
  if (id === 'workflow_audit') return workflowAudit();
  throw new Error(`Skill handler not implemented: ${id}`);
}

function runSkills(ids, payload = {}) {
  const selected = (Array.isArray(ids) && ids.length ? ids : REGISTRY.skills.map((skill) => skill.id)).slice(0, 10);
  return selected.map((id) => {
    try { return runSkill(id, payload); }
    catch (error) { return result(id, false, error.message, []); }
  });
}

module.exports = { REGISTRY, runSkill, runSkills };
