

## Оновлення v0.7 — local skills без токенів

- [x] Створено allowlisted registry із шістьма локальними навичками та `token_cost: 0`.
- [x] Додано deterministic handlers для HTML, JavaScript/Python syntax, secrets, SEO, public-only sources і GitHub Actions.
- [x] Додано `GET /api/skills` для discovery та `POST /api/skills/run` для запуску skills.
- [x] Додано Browser Studio panel `LOCAL SKILLS / 0 TOKENS` з PASS/CHECK evidence.
- [x] Smoke test підтвердив `execution: local-deterministic`, `token_cost: 0`, 6 skills і 4/6 PASS.
- [x] Попередження SEO про відсутні `robots.txt`/`sitemap.xml` залишено як чесний release gate; ці файли генеруються підтвердженим Pages workflow.
- [x] Workflow audit виправлено так, щоб шаблони secret scanner не створювали false positive.
