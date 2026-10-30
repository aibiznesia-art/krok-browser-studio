

## Free local rewrite cascade

Для автоматичного переписування зібраного evidence додано `POST /api/content/rewrite`. Endpoint звертається до локального Ollama-compatible server і не використовує платний API. Каскад моделей: `qwen3:8b` для українського rewrite, `phi4:latest` для reasoning/review, `smollm2:1.7b` як швидкий fallback і `deepseek-coder-v2:lite` для технічного контенту.

Встановіть Ollama окремо, завантажте потрібні моделі та запустіть KROK server:

```bash
ollama serve
ollama pull qwen3:8b
ollama pull phi4:latest
ollama pull smollm2:1.7b
ollama pull deepseek-coder-v2:lite
npm run dev
```

Перевірити registry можна через `GET /api/models/local`. Кнопка **Покращити локально** зʼявляється у створеній social draft. Якщо перша модель недоступна, adapter пробує наступну. Якщо всі недоступні, чернетка залишається без змін. Будь-який результат має `requires_human_review: true`.

Це безкоштовний локальний маршрут до open-weight моделей, а не гарантія безкоштовного hosted API. Потрібні локальний диск, RAM/VRAM, CPU/GPU та електроенергія.
