

## Automatic competitor research without paid APIs

`agents/competitor_scan.py` використовує тільки стандартну Python-бібліотеку. Він перевіряє HTTPS, DNS/IP на private/loopback адреси, `robots.txt`, відсутність redirect і ліміт відповіді. У JSON зберігаються лише структурні сигнали: title, meta description, h1–h3, кількість links/forms/images/scripts і word count. Повний HTML, cookies, медіа та персональні дані не зберігаються.

Налаштування знаходяться у `competitor-sources.json`. Додавайте URL у `urls`, але тільки публічні адреси без входу, CAPTCHA, paywall і обходу robots.txt. Workflow `competitor-research.yml` запускається вручну або щотижня та зберігає evidence як GitHub Actions artifact на 14 днів. `generated-content-pages.yml` додає цей evidence до статичного Pages artifact.

Команда локального запуску:

```bash
python3 agents/competitor_scan.py competitor-sources.json --output artifacts/competitor-research.json
```

Це не скрейпінг для копіювання конкурентів. Дані призначені для порівняння структури й підготовки оригінального сайту з людською перевіркою.

Візуальна схема потоку: `visualized_data/github-actions-competitor-flow.mmd` і PNG-рендер поруч із ним.
