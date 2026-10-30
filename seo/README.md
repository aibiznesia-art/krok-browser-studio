# SEO та GitHub Pages

Публікуйте тільки після перевірки preview і ручного підтвердження. Workflow `pages.yml` приймає `company_name`, `site_slug`, `site_origin` і точне слово `PUBLISH`. Він не приймає токени та не читає їх із браузера.

`agents/prepare_seo.py` підставляє підтверджені дані у початковий HTML, створює canonical link, `robots.txt` і `sitemap.xml`. Якщо `site_origin` не вказано, workflow формує стандартний GitHub Pages origin із owner та назви repository. Після deploy додайте `/sitemap.xml` до Search Console.

GitHub Actions має права лише `contents: read`, `pages: write`, `id-token: write`. Для окремого GitHub App використовуйте мінімальні permissions, Actions Secrets і server-side endpoint; ніколи не додавайте токен у HTML, JavaScript, URL, issue або лог.
