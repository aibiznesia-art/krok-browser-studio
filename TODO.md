

## Оновлення v0.8 — GitHub Actions pre-deploy gate

- [x] Створено `skills/run-ci.js`, який запускає шість локальних навичок і повертає exit code 1 при помилці.
- [x] Додано gate у `.github/workflows/pages.yml` перед `upload-pages-artifact` і `deploy-pages`.
- [x] Додано SEO generation перед gate у `.github/workflows/generated-content-pages.yml`, щоб robots/sitemap перевірялися без false failure.
- [x] Перевірено локально: `6/6 PASS`, `token_cost=0`.
- [x] Gate не потребує GitHub або AI secrets.
