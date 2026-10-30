

## Оновлення v0.9 — visualized_data і competitor research

- [x] Створено Mermaid-схему потоку GitHub Actions, local skills, competitor evidence, human review і Pages deploy.
- [x] Відрендерено PNG-схему для візуального перегляду.
- [x] Додано `competitor-sources.json` із rate limit, max sites, user-agent та public-only політикою.
- [x] Додано `agents/competitor_scan.py` без платних API або API-ключів.
- [x] Сканер перевіряє HTTPS, public DNS/IP, `robots.txt`, redirect, content type і обмеження розміру відповіді.
- [x] Сканер зберігає лише структурні сигнали, ставить `requires_human_review: true` і не копіює повний HTML або медіа.
- [x] Додано ручний/щотижневий `competitor-research.yml` із GitHub Actions artifact.
- [x] Додано competitor evidence у generated-content Pages workflow.
