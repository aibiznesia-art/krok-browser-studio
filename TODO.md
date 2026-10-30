

## Оновлення v1.1 — free local rewrite cascade

- [x] Додано `local-models.json` з чотирма open-weight моделями та fallback order.
- [x] Додано Ollama-compatible adapter без платних API ключів.
- [x] Додано `GET /api/models/local` і `POST /api/content/rewrite`.
- [x] Додано frontend action «Покращити локально» для social draft.
- [x] Adapter передає тільки структурований draft/evidence і завжди встановлює `requires_human_review: true`.
- [x] При недоступності всіх моделей endpoint повертає контрольовану помилку, не змінюючи чернетку.
