

## Оновлення v1.0 — scraper testing і robots validation

- [x] Створено інструкцію `docs/local-scraper-testing.md` з локальними командами й негативними тестами.
- [x] Додано `agents/validate_robots.py` з exit code 1 для disallow, private URL, HTTP, timeout або robots error.
- [x] Додано offline unit-тести для parser, redaction і public HTTPS policy.
- [x] Підключено unit-тести та robots validator до основного Pages workflow, generated-content workflow і scheduled competitor workflow.
- [x] Порядок CI gate перевіряє robots до fetch і skills до upload/deploy.
