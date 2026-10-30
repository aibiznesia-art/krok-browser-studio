

## Блок «Соцмережі»

Односторінковий KROK Studio тепер має окремий блок **Соцмережі → чернетка контенту**. У ньому можна ввести публічний URL або RSS, вибрати тип джерела та тему. Demo зберігає URL, тип і час отримання локально, показує підготовлену чернетку та завжди додає `requires_human_review = true`.

Live-збір виконується не браузером, а GitHub Actions: `agents/social_sources.py` читає відкриті HTTP(S)-джерела, RSS або дозволені feeds і формує `artifacts/social-results.json`; `agents/content_pipeline.py` створює `artifacts/generated-content.json` із темою, фактами, URL, timestamp і `requires_human_review`. Workflow публікує JSON як `generated/latest-content.json` разом із сайтом. Реальний AI-провайдер підключається лише через server-side adapter і GitHub Actions Secrets.
