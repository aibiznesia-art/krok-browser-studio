const fs = require('node:fs');
const path = require('node:path');
const { EventEmitter } = require('node:events');

const ROOT = __dirname;
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'local-models.json'), 'utf8'));
const baseUrl = (process.env.LOCAL_LLM_BASE_URL || registry.default_base_url).replace(/\/$/, '');
const models = (process.env.LOCAL_LLM_MODELS || registry.models.map((item) => item.id).join(','))
  .split(',').map((item) => item.trim()).filter(Boolean);
const timeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS || 90000);
const events = new EventEmitter();
const eventLog = [];

function publishEvent(type, payload = {}) {
  const event = { id: `${Date.now().toString(36)}-${eventLog.length + 1}`, at: new Date().toISOString(), type, ...payload };
  eventLog.push(event);
  if (eventLog.length > 200) eventLog.shift();
  events.emit('event', event);
  return event;
}

function getRecentEvents(limit = 50) {
  return eventLog.slice(-Math.max(1, Math.min(Number(limit) || 50, 200)));
}

function withTimeout(signal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true });
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function safeText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function buildPrompt(input) {
  const topic = safeText(input.topic, 240) || 'Покращення контенту сайту';
  const brief = safeText(input.brief, 3000);
  const content = input.content && typeof input.content === 'object' ? input.content : {};
  const evidence = Array.isArray(input.evidence) ? input.evidence.slice(0, 20).map((item) => ({
    url: safeText(item?.url, 400),
    kind: safeText(item?.kind, 80),
    preview: safeText(item?.preview, 800),
    signals: item?.signals || undefined
  })) : [];
  return `Тема: ${topic}\nПерсональний бриф: ${brief || 'немає'}\n\nПоточна чернетка:\n${JSON.stringify(content, null, 2)}\n\nEvidence відкритих джерел:\n${JSON.stringify(evidence, null, 2)}\n\nПерепиши та покращ текст українською. Збережи підтверджені факти, не копіюй конкурентів, не вигадуй числа або цитати. Покращ ясність, структуру, CTA і tone of voice. Поверни тільки JSON із полями title, summary, sections (масив heading/body), cta. Усі результати потребують human review.`;
}

async function getModelStatus() {
  const timer = withTimeout();
  try {
    const response = await fetch(`${baseUrl}/api/tags`, { signal: timer.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const installed = Array.isArray(data.models) ? data.models.map((item) => item.name || item.model).filter(Boolean) : [];
    return { online: true, base_url: baseUrl, installed, models: registry.models.map((item) => ({ ...item, enabled: models.includes(item.id), installed: installed.some((name) => name === item.id || name.startsWith(`${item.id.split(':')[0]}:`)) })) };
  } catch (error) {
    return { online: false, base_url: baseUrl, installed: [], error: error.name === 'AbortError' ? 'timeout' : error.message, models: registry.models.map((item) => ({ ...item, enabled: models.includes(item.id), installed: false })) };
  } finally {
    timer.clear();
  }
}

async function rewriteLocally(input) {
  const prompt = buildPrompt(input);
  const attempts = [];
  const requestId = Date.now().toString(36);
  publishEvent('rewrite_started', { request_id: requestId, models });
  for (const model of models) {
    const timer = withTimeout();
    publishEvent('model_attempt', { request_id: requestId, model, message: `Спроба локальної моделі ${model}` });
    try {
      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          stream: false,
          format: 'json',
          messages: [
            { role: 'system', content: 'Ти локальний редактор KROK. Працюй тільки з наданим контекстом. Не копіюй чужий текст. Відповідай валідним JSON.' },
            { role: 'user', content: prompt }
          ],
          options: { temperature: 0.25 }
        }),
        signal: timer.signal
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Ollama HTTP ${response.status}`);
      const raw = data?.message?.content || data?.response || '';
      const parsed = JSON.parse(String(raw).replace(/^```json\s*/i, '').replace(/```$/i, '').trim());
      if (!parsed.title || !parsed.summary || !Array.isArray(parsed.sections) || !parsed.cta) throw new Error('invalid rewrite schema');
      publishEvent('model_success', { request_id: requestId, model, message: `Модель ${model} створила валідний rewrite JSON` });
      publishEvent('rewrite_completed', { request_id: requestId, model, attempts: attempts.length });
      return { ...parsed, provider: 'local-ollama', model, fallback_attempts: attempts, requires_human_review: true, generated_at: new Date().toISOString() };
    } catch (error) {
      const reason = error.name === 'AbortError' ? 'timeout' : error.message;
      attempts.push({ model, error: reason });
      publishEvent('model_failure', { request_id: requestId, model, message: `${model}: ${reason}` });
    } finally {
      timer.clear();
    }
  }
  const error = new Error('Жодна локальна Ollama-модель не відповіла. Встановіть Ollama і завантажте хоча б одну модель із local-models.json.');
  error.code = 'LOCAL_LLM_UNAVAILABLE';
  error.attempts = attempts;
  publishEvent('rewrite_failed', { request_id: requestId, message: 'Усі локальні моделі недоступні', attempts });
  throw error;
}

module.exports = { registry, models, baseUrl, rewriteLocally, getModelStatus, events, getRecentEvents };
