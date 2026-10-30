

## Оновлення v1.2 — live model monitor

- [x] Додано status endpoint для Ollama gateway та кожної моделі.
- [x] Додано SSE stream для старту rewrite, model attempt, success, fallback failure і final failure.
- [x] Додано Browser Studio panel зі статус-картками моделей, connection badge та log feed.
- [x] Додано auto-refresh status після кожної cascade event і ручну кнопку оновлення.
- [x] Перевірено safe offline behavior: Ollama offline відображається як OFFLINE, rewrite не змінює чернетку.
