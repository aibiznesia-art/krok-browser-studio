# KROK Browser Studio

KROK Browser Studio — браузерна робоча область для керування Agent Swarm. Тут є редактор HTML, живий sandboxed preview, timeline рою, сценарії перевірки коду, SEO-підготовка й підтверджувана публікація.

## Локальний запуск

```bash
python3 -m http.server 3000 --bind 0.0.0.0
```

Відкрийте `http://localhost:3000`.

## Як працює публікація

1. Введіть назву фірми та GitHub owner у блоці **Адреса сайту та публікація**. Інтерфейс перетворить назву на безпечний slug, наприклад `Nova Буд → nova-bud`, і покаже майбутню адресу `https://owner.github.io/nova-bud/`.
2. Перевірте preview і дочекайтеся завершення сценаріїв рою: HTML, посилання, доступність, mobile, secret scan та SEO.
3. Увімкніть чекбокс підтвердження. Без нього кнопка публікації вимкнена.
4. Підключіть GitHub через штатний Manus-managed workflow. Власник підтверджує створення **нового приватного repository**; токен не вводиться в браузер і не записується у файли.
5. У GitHub відкрийте **Actions → Deploy KROK to GitHub Pages → Run workflow**, перевірте назву фірми, slug і `site_origin`, після чого запустіть workflow.
6. У **Settings → Pages** виберіть **GitHub Actions** як Source. Після успішного job адреса зʼявиться в Actions і Pages.

Workflow перевіряє наявність `index.html`, шукає типові секрети, валідовує slug, генерує `robots.txt` і `sitemap.xml`, підставляє назву фірми в title/description/Open Graph і публікує корінь repository через Pages. Реальна адреса має бути підтверджена GitHub; frontend не вгадує canonical URL.

## Що потрібно для пошуку в Google/Bing

Сайт має бути публічним, віддавати зміст у початковому HTML, мати унікальні title/description, `robots.txt`, `sitemap.xml`, Open Graph і canonical URL. Після публікації додайте sitemap у Google Search Console та Bing Webmaster Tools. Поява в пошуку не миттєва й не гарантується лише наявністю GitHub Pages.

## Безпека

Фронтенд не містить GitHub-токенів. Довільні правки передаються тільки через підтверджений server-side/GitHub Actions workflow. Не вставляйте ключі в HTML, JavaScript, коміти або журнали. Для окремого server-side OAuth/GitHub App використовуйте GitHub Actions Secrets або секретне сховище серверної платформи з мінімальними правами.

## Рій і тестування

Ролі: диспетчер, дослідник, архітектор, аналітик, розробник, QA-автоматизатор, security reviewer, SEO-перевіряльник, перевіряльник і видавець. Сценарії: HTML-структура, посилання, доступність, mobile smoke, secret scan та SEO readiness. Прапорець людської перевірки залишається обовʼязковим перед публікацією.

## Джерела й free-tier

Дозволені лише відкриті вебсторінки, RSS і офіційні API. Заборонені приватні сторінки, обхід входу, CAPTCHA, paywall, robots.txt, збір чутливих персональних даних і публікація в соціальні мережі. Demo не викликає AI-провайдера; майбутні live-моделі можуть мати ліміти та потребують server-side secrets.
