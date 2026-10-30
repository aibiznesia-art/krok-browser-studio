

## Live model monitor

Browser Studio має live monitor для Ollama: `GET /api/models/status` перевіряє gateway і встановлені моделі, а `GET /api/rewrite/events` віддає SSE-потік подій `rewrite_started`, `model_attempt`, `model_success`, `model_failure`, `rewrite_completed` і `rewrite_failed`. Панель оновлює статус моделей і лог каскаду без polling та без LLM-токенів. Лог зберігає останні 200 подій тільки в памʼяті процесу.
