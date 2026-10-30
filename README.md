

## GitHub Actions: automatic local-skills gate

Обидва Pages workflow (`pages.yml` і `generated-content-pages.yml`) запускають `node skills/run-ci.js` перед завантаженням Pages artifact. У звичайному Pages workflow цей крок стоїть після `agents/prepare_seo.py`, тому `robots.txt`, `sitemap.xml` і canonical уже доступні для SEO skill.

`skills/run-ci.js` читає `social-sources.json`, передає URL у `source_policy`, запускає шість allowlisted skills і друкує JSON-результат. Якщо хоча б одна навичка повертає `passed: false`, runner завершується з exit code 1, а GitHub Actions не переходить до `upload-pages-artifact` і `deploy-pages`. Ключі API для цього gate не потрібні.

Для нового deploy workflow достатньо додати після підготовки всіх файлів і перед upload/deploy:

```yaml
- name: Run local skills gate — zero token cost
  run: node skills/run-ci.js
```

Якщо workflow генерує SEO-файли пізніше, перенесіть gate після цього кроку. Перевірити локально можна так:

```bash
COMPANY_NAME='KROK Studio' \
SITE_SLUG='krok-studio' \
SITE_ORIGIN='https://owner.github.io/krok-studio/' \
python3 agents/prepare_seo.py
node skills/run-ci.js
```

У GitHub Actions не додавайте до цього кроку `OPENAI_API_KEY`, `BUILT_IN_FORGE_API_KEY` або інші AI secrets: local skills не використовують токени. AI-модель має запускатися окремим кроком лише для задач, де не вистачає детермінованих перевірок.
