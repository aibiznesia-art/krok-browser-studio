

## Local skills: 0-token execution

Рій має allowlisted registry локальних навичок у `skills/registry.json`. Вони виконуються детерміновано в Node runtime і не викликають LLM: HTML validator, Code syntax check, Secret scan, SEO readiness, Open-source policy та GitHub workflow audit.

API: `GET /api/skills` повертає registry, `POST /api/skills/run` запускає всі або вибрані навички. Тіло може містити `{"skills":["html_validate","secret_scan"],"urls":["https://example.com"]}`. Відповідь має `execution: local-deterministic` і `token_cost: 0`.

Рекомендований маршрут рою: спочатку local skills → evidence bundle → лише потім LLM для reasoning або генерації. Це зменшує витрати токенів, прискорює прості перевірки та не дозволяє моделі самій оголосити код безпечним чи готовим до публікації.
