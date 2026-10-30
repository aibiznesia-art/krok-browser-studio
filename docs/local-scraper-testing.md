# Тестування локальних scraper-ів і robots.txt перед GitHub Actions deploy

Ця інструкція описує безпечний цикл для `agents/competitor_scan.py`. Сканер не використовує платні API або API-ключі. Він працює тільки з публічними HTTPS-сторінками, перевіряє `robots.txt`, не переходить за redirect і зберігає лише структурні сигнали сторінки.

## 1. Підготувати список джерел

Відредагуйте `competitor-sources.json` і додайте тільки URL, які доступні без входу, CAPTCHA, paywall або обходу robots.txt:

```json
{
  "enabled": true,
  "urls": [
    "https://public-example.com"
  ],
  "max_sites": 5,
  "delay_seconds": 2,
  "user_agent": "KROK-PublicResearch/1.0 (+public-structural-signals-only)"
}
```

Не додавайте URL із приватних кабінетів, персональні профілі, внутрішні IP, `localhost`, `127.0.0.1`, `10.0.0.0/8`, `172.16.0.0/12` або `192.168.0.0/16`. Для дослідження конкурентів достатньо структурних сигналів, тому не збільшуйте ліміт відповіді без окремого обґрунтування.

## 2. Запустити offline unit-тести

Ці тести не роблять зовнішніх запитів. Вони перевіряють HTML parser, redaction контактних даних і блокування небезпечних URL:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
```

Очікуваний результат — три успішні тести. Якщо тест падає, deploy не запускайте: спочатку виправте код scraper-а або його policy.

## 3. Перевірити robots.txt окремо

Перед збором запустіть спеціальний validator:

```bash
python3 agents/validate_robots.py competitor-sources.json
```

Validator повертає JSON із `ok`, URL і причиною. Код завершення `0` означає, що всі URL дозволені. Код `1` означає блокування або небезпечний URL, і GitHub Actions має зупинити роботу.

Правила такі:

- явний `Disallow` для User-Agent сканера — блокування;
- `robots.txt` із HTTP 404 не вважається забороною, тому що сайт не опублікував правила;
- помилка мережі, timeout або недоступний robots endpoint — консервативне блокування;
- приватна/loopback IP-адреса — блокування;
- HTTP URL — блокування;
- redirect — блокування, щоб не перейти на неперевірену адресу.

Для ручної перевірки конкретної сторінки можна виконати:

```bash
curl -fsSL --max-time 15 https://public-example.com/robots.txt
```

`curl` — лише допоміжна перевірка. Остаточним gate залишається `validate_robots.py`, бо він використовує той самий User-Agent і policy, що і scraper.

## 4. Запустити локальний scraper

```bash
mkdir -p artifacts
python3 agents/competitor_scan.py competitor-sources.json \
  --output artifacts/competitor-research.json
```

Перевірте результат:

```bash
python3 - <<'PY'
import json
from pathlib import Path
p = json.loads(Path('artifacts/competitor-research.json').read_text())
assert p['paid_api'] is False
assert p['requires_human_review'] is True
assert p['policy']['robots_required'] is True
for item in p['results']:
    print(item['url'], item['status'], item.get('reason', item.get('robots')))
PY
```

У `signals` мають бути тільки `title`, `description`, headings і лічильники. Повний HTML, cookies, відео та зображення не записуються. Кожен запис треба вважати evidence для подальшого аналізу, а не готовим фактом для публікації.

## 5. Ручні негативні тести

Перед першим production-запуском тимчасово перевірте, що policy блокує небезпечні значення:

```json
{
  "enabled": true,
  "urls": [
    "http://example.com",
    "https://127.0.0.1/private",
    "https://localhost/admin"
  ],
  "max_sites": 5
}
```

Для цього списку `validate_robots.py` має завершитися з кодом `1`. Не залишайте такі URL у робочому `competitor-sources.json`.

## 6. Порядок у GitHub Actions

У workflow порядок має бути саме таким:

```yaml
- uses: actions/checkout@v4
- name: Run offline unit tests
  run: python3 -m unittest discover -s tests -p 'test_*.py' -v
- name: Validate robots.txt policy
  run: python3 agents/validate_robots.py competitor-sources.json
- name: Collect public structural signals
  run: python3 agents/competitor_scan.py competitor-sources.json --output artifacts/competitor-research.json
- name: Generate SEO files
  run: python3 agents/prepare_seo.py
- name: Run local skills gate — zero token cost
  run: node skills/run-ci.js
- name: Upload or deploy artifact
  uses: actions/upload-pages-artifact@v3
```

У разі помилки будь-який крок завершується ненульовим кодом, тому workflow не доходить до upload/deploy. Додавати AI secrets для цих кроків не потрібно. LLM можна викликати окремо після evidence і лише для задачі, яку не може вирішити deterministic parser.

## 7. Що перевірити в pull request

Перед merge перевірте: чи всі URL публічні; чи немає приватних або платних джерел; чи збережено `requires_human_review`; чи не записуються raw HTML і персональні дані; чи є rate limit; чи зберігається evidence як artifact; чи падає workflow на robots violation; чи працюють `robots.txt`, sitemap і canonical після SEO generation.

Для повного локального pre-deploy запуску:

```bash
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 agents/validate_robots.py competitor-sources.json
python3 agents/competitor_scan.py competitor-sources.json --output artifacts/competitor-research.json
python3 agents/prepare_seo.py
node skills/run-ci.js
```

Якщо `prepare_seo.py` запускається локально тільки для перевірки, не комітьте згенеровані `robots.txt`, `sitemap.xml` і `site-config.json`, якщо вони мають створюватися лише під час workflow.
