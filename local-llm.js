const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'local-models.json'), 'utf8'));
const baseUrl = (process.env.LOCAL_LLM_BASE_URL || registry.default_base_url).replace(/\/$/, '');
const models = (process.env.LOCAL_LLM_MODELS || registry.models.map((item) => item.id).join(','))
  .split(',').map((item) => item.trim()).filter(Boolean);
const timeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS || 90000);

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

async function rewriteLocally(input) {
  const prompt = buildPrompt(input);
  const attempts = [];
  for (const model of models) {
    const timer = withTimeout();
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
      return { ...parsed, provider: 'local-ollama', model, fallback_attempts: attempts, requires_human_review: true, generated_at: new Date().toISOString() };
    } catch (error) {
      attempts.push({ model, error: error.name === 'AbortError' ? 'timeout' : error.message });
    } finally {
      timer.clear();
    }
  }
  const error = new Error('Жодна локальна Ollama-модель не відповіла. Встановіть Ollama і завантажте хоча б одну модель із local-models.json.');
  error.code = 'LOCAL_LLM_UNAVAILABLE';
  error.attempts = attempts;
  throw error;
}

module.exports = { registry, models, baseUrl, rewriteLocally };
