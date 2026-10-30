# План — KROK Browser Studio

## Обсяг
Односторінкова браузерна робоча область для KROK Agent Swarm: три взаємопов’язані панелі — редактор, взаємодія агентів і живий preview — замість демонстрації коду в терміналі. Інтерфейс працює без GitHub-токена в браузері; GitHub Pages лишається server-side workflow/demo action.

## Дизайн

### Розглянуті напрями
- **Mission Control / dark operator console** — 0.07: щільна диспетчерська з технічними індикаторами та контрастними станами.
- **Editorial research desk** — 0.05: світлий дослідницький стіл із картками джерел і великою типографікою.
- **Soft SaaS dashboard** — 0.03: округла продуктова панель із м’якими поверхнями та мінімальними сигналами.

### Обраний напрям: Mission Control / dark operator console
- **Design Movement:** сучасний command-center UI з відчуттям живого процесу, але без декоративного кіберпанку.
- **Core Principles:** стан видно з першого погляду; дія завжди має підтвердження; код і результат живуть поруч; щільність балансується великим простором і чіткою ієрархією.
- **Color Philosophy:** глибокий navy/graphite фон створює спокійну робочу поверхню; electric lime означає «можна рухатись», cyan — потік/preview, amber — пауза та увага, coral — ризик або помилка.
- **Layout Paradigm:** вертикальний заголовок-статус + асиметричний workspace із широким кодовим модулем і двома stacked модулями; на мобільному — послідовний потік панелей.
- **Signature Elements:** вертикальна мітка KROK; agent timeline із живою точкою стану; маленькі telemetry chips для часу, джерел і безпеки.
- **Interaction Philosophy:** кнопки показують поточний стан і наступну дію; pause/continue не руйнують контекст; fullscreen фокусується на одному вікні; Apply пов’язує редактор із preview.
- **Animation:** короткі 180–240ms переходи; пульсація тільки на активному агенті; preview оновлюється м’яким fade; без безперервного руху, що заважає читанню.
- **Typography System:** Inter/system sans для інтерфейсу, IBM Plex Mono/monospace для HTML, telemetry і технічних маркерів; великі заголовки 32–48px, labels 11–12px із tracking.
- **Brand Essence:** KROK перетворює складну агентну роботу на контрольований наступний крок; зібраний, прозорий, сміливий.
- **Brand Voice:** коротко, конкретно, із людською відповідальністю. Приклади: «Пауза — внесіть правку без втрати контексту.» і «Опублікувати через server-side workflow.»
- **Wordmark & Logo:** текстовий знак KROK із графічним кутовим «K» та вертикальною лінією, що нагадує один крок у timeline.
- **Signature Brand Color:** electric lime #C7F36B.

## Реалізація
- `index.html`: семантична оболонка робочої області, topbar, три collapsible/fullscreen panels, status rails, security note.
- `styles.css`: адаптивна layout-система, темна operator-console візуальна мова, focus states, reduced-motion support і mobile stacking.
- `app.js`: локальна чернетка через localStorage, редагування HTML, sandboxed iframe preview, симульований agent run, pause/continue/apply/fullscreen, GitHub Pages demo workflow action.
- `.github/workflows/pages.yml`: перевірка HTML та публікація кореня на GitHub Pages.
- `.github/workflows/generated-content-pages.yml`: ручний або щотижневий контентний pipeline із `social-sources.json`, артефактом і Pages deployment.
- `agents/content_pipeline.py`: безпечний demo-скрипт відкритих джерел, який формує JSON із URL, часом, фактами та прапорцем людської перевірки.
- `social-sources.json`: приклад лише публічних URL/RSS/API.
- `README.md`: локальний запуск, secrets, free-tier обмеження та server-side GitHub правила.
- `public/manus-routes.json`: декларація маршруту `/` для WebDev.

## Сервер і межі безпеки
Фронтенд не містить GitHub-токенів. Кнопка GitHub Pages демонструє безпечний перехід до Actions/workflow і явно повідомляє, що довільні записи потребують окремого server-side OAuth/GitHub App endpoint. Усі дослідницькі джерела — відкриті URL/RSS або офіційні API; приватний доступ, CAPTCHA/paywall/robots.txt bypass і секрети заборонені.
