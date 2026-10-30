# KROK Agent Swarm

Це односторінковий прототип KROK із двома рівнями: портфоліо та control room рою агентів. На сторінці можна описати сайт простою мовою, підготувати прототип, сформувати patch-план для редагування та підготувати публікацію в GitHub Pages.

## Важливо про live-режим

Поточний GitHub Pages фронтенд працює безпечно у demo-режимі. Він не містить токенів і не може напряму створювати репозиторії або комітити код із браузера. Для справжніх операцій потрібен серверний API з GitHub OAuth або GitHub App. Такий API має виконувати створення репозиторію, запис змін, запуск Actions і повертати URL тільки після перевірки результату.

## Локальний запуск

```bash
python3 -m http.server 3000 --bind 0.0.0.0
```

Після цього відкрийте `http://localhost:3000`.

## Рій і джерела

Панель рою показує послідовність: диспетчер → дослідник → аналітик → розробник → перевіряльник → видавець. Дослідник повинен працювати лише з відкритими вебсторінками, RSS та дозволеними офіційними API. Заборонені приватні сторінки, обхід входу, CAPTCHA, paywall, robots.txt і збір чутливих персональних даних.

## GitHub Pages

Workflow `.github/workflows/pages.yml` перевіряє HTML/Python і публікує корінь репозиторію через GitHub Pages. Якщо GitHub Pages ще не активований, відкрийте **Settings → Pages** і виберіть **GitHub Actions** як Source. Після push у `main` посилання з’явиться в **Actions** та **Settings → Pages**.

### Приклад автоматичного деплою контенту

Файл `.github/workflows/generated-content-pages.yml` демонструє повний цикл: GitHub Actions запускається вручну або щопонеділка за розкладом, збирає публічні URL/RSS із `social-sources.json`, запускає `agents/content_pipeline.py`, створює `generated/latest-content.json` і деплоїть його разом з односторінковим сайтом на GitHub Pages.

Щоб запустити його вручну, відкрийте **Actions → Generate content and deploy to GitHub Pages → Run workflow**, введіть тему та натисніть **Run workflow**. Після успішного job посилання на сайт буде вказано в environment `github-pages`, а згенерований JSON буде доступний за шляхом `/generated/latest-content.json`.

Перед запуском перевірте, що в `social-sources.json` стоять реальні публічні URL або дозволені API-backed feeds. Workflow не виконує авторизацію в соцмережах, не обходить CAPTCHA/paywall/robots.txt і не публікує контент безпосередньо в соцмережі. Для live AI-провайдера додайте секрет у **Settings → Secrets and variables → Actions** і підключіть його лише в server-side адаптері.

## Secrets

Не вставляйте ключі у HTML, JavaScript, коміти або журнали. Для живого AI-адаптера та server-side GitHub App використовуйте GitHub Actions Secrets або секрети серверної платформи. Безкоштовні тарифи AI мають ліміти та можуть змінювати умови.
