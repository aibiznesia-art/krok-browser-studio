# План підключення 15 AI-моделей до KROK Agent Swarm

**Статус документа:** практичний design/review plan на основі наданих перевірених результатів.  
**Мета:** побудувати керований, приватний і перевірюваний swarm, у якому моделі мають різні ролі, а жодна генеративна відповідь не вважається істиною без валідації.

## 1. Короткий висновок

KROK Agent Swarm доцільно будувати не як «15 рівноправних чат-ботів», а як **бджолиний вулик**: одна матка-оркестратор формує план і політики, робочі бджоли виконують вузькі підзадачі, феромонні події передають сигнали стану, а quorum/critic/reviewer-вузли приймають або відхиляють результати. Складні або ризикові відповіді мають проходити щонайменше через незалежний критик, детермінований валідатор або sandbox-тест.

Найбезпечніший старт — локальний open-weight контур із єдиним OpenAI-сумісним gateway-контрактом, model registry, health checks, оцінювальним набором і чітким бюджетом токенів/пам’яті. Hosted API не слід називати безкоштовним лише тому, що модель має відкриті ваги. «Безкоштовний маршрут» у цьому документі означає: ваги можна завантажити й запустити локально без ліцензійної плати; апаратне забезпечення, електроенергія, адміністрування, диски, GPU-оренда і можливий hosted inference оплачуються окремо.

## 2. Межі перевірених фактів і рекомендацій

### 2.1. Що вважається verified fact

Нижче наведені твердження взяті з наданих model cards, офіційних репозиторіїв і документації:

- для кожної моделі окремо вказано ліцензію, локальні runtime, доступність ваг, заявлені ролі, сильні сторони та обмеження;
- open weights не дорівнюють безкоштовному hosted inference;
- характеристики контексту, thinking/non-thinking, tool calling, vision, квантизації та runtime залежать від checkpoint і версії backend;
- benchmarks є заявами авторів моделей, а не гарантією якості на KROK-даних;
- генеративні моделі можуть галюцинувати, помилятися у tool calls, коді та reasoning; потрібні retrieval, schema validation, sandboxing, тести й незалежний review.

### 2.2. Що є рекомендацією KROK

Розподіл ролей, порядок запуску, quorum-політики, thresholds, fallback-ланцюги, бюджети, правила кешування, спосіб вимірювання якості та критерії Go/No-Go — це інженерні рекомендації. Їх треба перевірити власним benchmark на українських, англомовних, кодових і доменних задачах.

## 3. Чесне визначення безкоштовності

### 3.1. Три різні значення «free»

1. **Безкоштовні ваги:** checkpoint доступний для завантаження без ліцензійної плати.
2. **Безкоштовний локальний inference:** програмний runtime не бере API-плату, але потрібні CPU/GPU, RAM/VRAM, диск, електроенергія, оновлення й операційна підтримка.
3. **Безкоштовний hosted inference:** провайдер не стягує кошти за API/квоти. Для жодної моделі нижче не можна автоматично робити такий висновок; hosted-ціни й умови треба перевіряти окремо.

### 3.2. Ліцензійна карта

- **Apache-2.0:** Qwen3, Phi-4, IBM Granite 3.3, OLMo 2, SmolLM2, MiniCPM4, InternLM3, Yi-Coder. Перевіряти умови залежностей, датасетів, квантизованих похідних і redistribution.
- **MIT із caveat базової моделі:** DeepSeek-R1/Distill заявляє MIT для коду й моделей, але для Distill потрібно також враховувати умови базової Qwen/Llama-моделі.
- **Llama 3.3 Community License:** не OSI open-source; потрібні Acceptable Use Policy, атрибуція/маркування Built with Llama і перевірка порога понад 700 млн MAU.
- **Gemma Terms:** custom terms і Prohibited Use Policy; не Apache-2.0.
- **Mistral Small 3.1:** Apache-2.0 для ваг.
- **Falcon 3:** Falcon-LLM License 2.0 з Acceptable Use Policy, attribution/notice та redistribution-вимогами.
- **StarCoder2:** BigCode OpenRAIL-M v1; потрібно перевіряти допустимі застосування й обмеження.
- **DeepSeek-Coder-V2-Lite:** DeepSeek Model License v1.0 для ваг із use-based restrictions; код репозиторію MIT.

Перед production потрібні: юридичний інвентар усіх checkpoint/quantization, notice-файли, атрибуція, журнал походження, policy review і перевірка generated code/data provenance.

## 4. Архітектура «бджолиного вулика»

### 4.1. Логічні компоненти

```text
Client/API
   |
   v
[Gateway + Policy + Auth + Budget]
   |
   v
[Queen / Orchestrator]
   |-- task planner
   |-- model router
   |-- quorum coordinator
   |-- state/event manager
   |
   +--> [Worker bees: generation, analysis, code, vision, extraction]
   +--> [Critic bees: independent challenge, fact/code review]
   +--> [Reviewer bees: synthesis, policy, release gate]
   +--> [Deterministic tools: tests, lint, schema, retrieval, scanners]
   +--> [Fallback/Reserve pool]
   |
   v
[Evidence bundle + decision + audit log]
```

### 4.2. Матка (Queen)

Рекомендована реалізація: **Qwen3** як універсальний оркестратор, з перемиканням thinking/non-thinking, або локальний резерв Qwen3-4B/8B quantized. Матка не повинна одноосібно затверджувати критичний результат. Вона:

- нормалізує запит і класифікує ризик;
- декомпозує задачу на DAG підзадач;
- призначає worker за capability, мовою, privacy і бюджетом;
- встановлює evidence requirements і deadline;
- запускає quorum/critic/reviewer;
- збирає provenance, confidence, tool results і відмови;
- повертає результат лише після policy gate.

### 4.3. Робочі бджоли

Worker виконує одну вузьку функцію й має контракт: `input_schema`, `output_schema`, `max_context`, `max_tokens`, `required_evidence`, `allowed_tools`, `timeout`, `fallback_chain`. Worker не отримує зайвий повний transcript: передається мінімально потрібний контекст.

### 4.4. Феромонні події

Феромон — це типізована подія, а не вільний текстовий сигнал. Приклад envelope:

```json
{
  "event": "worker.result",
  "task_id": "krok-123",
  "parent_id": "plan-7",
  "capability": "code_review",
  "model_id": "yi-coder-9b-chat",
  "status": "needs_review",
  "confidence": 0.71,
  "evidence_refs": ["git:diff:abc", "test:run:456"],
  "risk_flags": ["unexecuted_code", "license_unknown"],
  "cost": {"input_tokens": 2200, "output_tokens": 740},
  "next_action": "run_sandbox_tests",
  "trace_id": "..."
}
```

Рекомендовані події: `task.created`, `plan.proposed`, `worker.claimed`, `worker.result`, `evidence.attached`, `critic.challenge`, `quorum.reached`, `tool.failed`, `health.degraded`, `budget.near_limit`, `license.flagged`, `fallback.activated`, `review.approved`, `review.rejected`, `human.escalation`.

### 4.5. Quorum, critic і reviewer

- **Low-risk:** один worker + schema check + lightweight verifier.
- **Medium-risk:** два незалежні worker-и або один worker + critic; розбіжність понад threshold запускає третій вузол.
- **High-risk:** два незалежні reasoning/analysis results, один critic, один reviewer, evidence requirement і human approval; код додатково проходить tests/lint/SAST.
- **Code change:** модель не має права сама деплоїти; дозволено лише запропонувати patch. Merge gate — CI, security scan і reviewer.
- **Факти:** відповідь без джерела або retrieval evidence не переходить у `approved`.

Quorum має рахувати не лише кількість однакових текстів, а незалежність: різні model families, різні prompts або різні evidence paths. «Три однакові галюцинації» не є надійним quorum.

## 5. Матриця 15 моделей за ролями

Позначення: **P** — primary/основний кандидат; **S** — specialist; **V** — verifier/critic; **R** — reserve/fallback. Усі hosted-маршрути нижче вважаються **непідтвердженими як безкоштовні**.

| Модель | Генерація / планування | Аналіз / vision / extraction | Код | Перевірка / critic | Резерв | Практичний статус |
|---|---|---|---|---|---|---|
| Qwen3 family | **P** queen, мультимовна генерація, thinking/non-thinking | P routing/synthesis | S reasoning/code | S critic | **P/R** Qwen3-4B/8B GGUF | Apache-2.0; локально HF/llama.cpp/Ollama/vLLM/SGLang |
| DeepSeek-R1 / Distill | P складне planning/reasoning | S math/analysis | S code-and-math | **P** verifier/critic | Distill-Qwen-14B/32B | MIT із caveat базової моделі; не покладатися на CoT без перевірки |
| Llama 3.3 70B Instruct | P synthesis/editor | S text analysis | S code | P final editorial reviewer | Не визначено verified pair | Llama Community License; gated HF, дуже ресурсомістка |
| Gemma 3 | S text generation | **P** multimodal/image/document worker | S lightweight text/code | S evidence extraction check | 4B-it + 1B-it/270M | Gemma Terms; vision від 4B |
| Mistral Small 3.1 24B | S structured generation | P vision/document | **P** code/math/tool | P JSON/structure reviewer | Не визначено | Apache-2.0; для production переважно vLLM |
| Phi-4 | S concise generation | S STEM analysis | **P** code/math | S hypothesis checker | `phi4` local | MIT; 14B, 16K context |
| IBM Granite 3.3 8B | S enterprise generation | **P** extraction/RAG/triage | P enterprise code | **P** policy/verification worker | Granite 3.3 2B | Apache-2.0; 128K, українську треба тестувати |
| OLMo 2 | S research drafts | **P** reproducibility/research | S math/code draft | S experiment/eval critic | OLMo 2 1B | Apache-2.0; переважно англійська |
| SmolLM2 | S короткі rewrite/summary | S micro-extraction | S прості tasks | S smoke/health checker | 360M/135M | Apache-2.0; найменший edge fallback |
| Falcon 3 1B Instruct | S коротка генерація | S classification/extraction | S short code | S low-cost critic | Не визначено | Falcon License 2.0; EN/FR/ES/PT, не українська за замовчуванням |
| MiniCPM4 | S дешевий local generation | S long-text/extraction | S tool/pre/post-processing | S low-cost checker | 0.5B | Apache-2.0; dense/sparse runtime треба розрізняти |
| InternLM3-8B-Instruct | P/S planner | S bilingual analysis | S tool-oriented code | S deep-thinking critic | Не визначено | Apache-2.0; trust_remote_code і sandbox |
| Yi-Coder | S generation | S repository analysis | **P** code generation/review | **P** code critic | 1.5B для простих задач | Apache-2.0; 52 мови програмування, 128K |
| StarCoder2 | S completion | S code-context analysis | **P** FIM/completion | P patch-review draft | 3B/7B | OpenRAIL-M; не instruction model, потрібні FIM prompts |
| DeepSeek-Coder-V2-Lite | S code generation | P repository/log analysis | **P** code/test/repair | P test-author/repair critic | Ollama quantized / vLLM | DeepSeek Model License; 128K, MoE 2.4B active |

### 5.1. Рекомендований початковий roster

Не потрібно одразу піднімати всі 15. Для першого production-пілота достатньо:

- **Queen:** Qwen3.
- **Reasoning/critic:** DeepSeek-R1-Distill-Qwen-14B або менший Distill.
- **Code:** Yi-Coder-9B або DeepSeek-Coder-V2-Lite-Instruct.
- **Vision/document:** Gemma 3 4B або Mistral Small 3.1, якщо є GPU.
- **Enterprise extraction/review:** Granite 3.3 8B.
- **Low-cost reserve:** SmolLM2 1.7B, Qwen3-4B/8B GGUF, MiniCPM4-0.5B.
- **Independent research/eval:** OLMo 2 7B/13B.

Інші моделі додаються після capability eval, а не «для кількості».

## 6. Локальний стек виконання

### 6.1. Runtime-політика

- **Ollama:** найпростіший локальний lifecycle, GGUF, edge/desktop, health endpoint; використати для Qwen3, Gemma, Phi-4, Granite, SmolLM2, Falcon, InternLM3, Yi-Coder та DeepSeek-Coder-V2-Lite там, де конкретний тег перевірений.
- **llama.cpp:** CPU/GPU-friendly GGUF, llama-server, контроль chat template; корисний для резервів. Не заявляти runtime як офіційно гарантований, якщо джерело підтверджує лише інший backend.
- **vLLM:** серверний GPU backend, batching, tensor parallelism, OpenAI-сумісний endpoint; основний кандидат для Qwen3, DeepSeek, Mistral, Llama, Granite, Phi, code models за конкретною compatibility matrix.
- **Transformers:** reference path, evaluation, fine-tuning, нестандартні checkpoint-и, vision; pin версій і ізолювати `trust_remote_code`.
- **SGLang/LMDeploy/CPM.cu/TGI:** застосовувати лише для моделей, де перевірена конкретна сумісність і потрібні функції.

### 6.2. Розгортання рівнями

1. **Laptop/CPU:** SmolLM2, Falcon 1B, MiniCPM4-0.5B, Qwen3 малий GGUF.
2. **Одно-GPU/desktop:** Qwen3 8B, Granite 8B, Phi-4, Gemma 3 4B, InternLM3, Yi-Coder 9B у quantized режимі.
3. **Multi-GPU/server:** DeepSeek-R1 Distill 32B/70B, Mistral 24B, Llama 70B, DeepSeek-Coder із довгим context.

Довгий контекст і MoE не слід вмикати за замовчуванням: почати з context budget, який поміщається у пам’ять із запасом, а документи chunk/retrieve/summarize.

## 7. Gateway, registry і routing

### 7.1. Єдиний gateway-контракт

Gateway має нормалізувати запит до внутрішнього формату:

```json
{
  "task_type": "code_review",
  "messages": [],
  "language": "uk",
  "risk": "high",
  "needs_vision": false,
  "needs_tools": true,
  "max_latency_ms": 30000,
  "max_output_tokens": 2000,
  "privacy": "local_only",
  "evidence_required": true,
  "budget_class": "standard"
}
```

Відповідь має містити `model_id`, `runtime`, `finish_reason`, `usage`, `tool_calls`, `evidence_refs`, `safety_flags`, `trace_id`, `cache_hit`, `license_route` і `verification_status`.

### 7.2. Model registry

Registry зберігає:

- canonical model ID, revision/commit і checksum;
- family, parameter size, quantization, context limit;
- runtime, GPU/RAM profile, concurrency limit;
- capabilities: `text`, `vision`, `code`, `reasoning`, `tool_calling`, languages;
- license, source URL, notice path, redistribution restrictions;
- benchmark version, eval scores, known failure modes;
- health state, last loaded revision, fallback order;
- privacy class: local-only, approved-hosted, blocked-hosted.

Заборонити «плаваючі» tags у production без pin revision.

### 7.3. Routing policy

Роутер оцінює capability fit, privacy, risk, context fit, health, latency, budget і independence. Приклад пріоритетів:

- український general task → Qwen3; якщо потрібна незалежна перевірка → Granite/DeepSeek/OLMo;
- image/document → Gemma 3 4B+ або Mistral 3.1;
- code generation/review → Yi-Coder/DeepSeek-Coder-V2-Lite; StarCoder2 для FIM;
- math/reasoning → DeepSeek-R1-Distill/Phi-4, потім deterministic executor;
- enterprise extraction → Granite;
- offline emergency → SmolLM2/MiniCPM4/Qwen3 quantized.

## 8. Health checks, reliability і fallback

### 8.1. Перевірки

- liveness: process/server responds;
- readiness: model loaded, correct revision, memory below threshold;
- functional smoke: fixed prompt, JSON schema, tool-call parse;
- latency/throughput: p50/p95, queue depth, tokens/sec;
- safety: prompt injection fixture, forbidden tool fixture;
- quality regression: golden examples and adversarial cases;
- license integrity: checksum, notice, registry state.

### 8.2. Fallback rules

Fallback спрацьовує при OOM, timeout, invalid JSON, repeated tool-call error, health degradation, context overflow, budget exhaustion або license block. Перехід має бути видимим у trace. Резерв не повинен автоматично отримувати більше permissions, ніж primary.

Чесно: частина наданих результатів прямо не визначає independent fallback pair. У таких випадках резервом слід вважати runtime/розмір тієї самої family або детерміновані інструменти, а не вигадувати перевірену іншу модель.

## 9. Evals і якість

### 9.1. Набір eval-категорій

Підготувати versioned dataset із:

- українські інструкції, переклад і стилістичне редагування;
- extraction із noisy documents;
- grounded QA з обов’язковими цитатами;
- математика з executable answer checker;
- code generation, repair, tests, security cases;
- tool calls із valid/invalid schemas;
- vision/document fixtures;
- prompt injection, data exfiltration і unsafe tool cases;
- довгий контекст із retrieval та distractors;
- license/provenance сценарії.

### 9.2. Метрики

Вимірювати не один score, а balanced scorecard:

- correctness / exact match / task success;
- groundedness та evidence precision;
- JSON/schema validity;
- tool-call validity і side-effect safety;
- tests pass rate, lint/type-check, SAST findings;
- українська мовна якість;
- p50/p95 latency, tokens/sec, concurrency;
- VRAM/RAM, energy/cost per successful task;
- fallback rate, retry rate, abstention quality;
- human acceptance і severity-weighted error rate.

Thinking-mode моделі оцінювати окремо від non-thinking. Не використовувати greedy decoding у thinking mode без спеціального доказу: надані результати попереджають про деградацію якості й endless repetition. Sampling, stop tokens, chat templates і `enable_thinking` треба pin-нути на runtime-рівні.

## 10. Кешування, privacy і безпека

### 10.1. Кешування

- exact cache для ідемпотентних задач із хешем model revision + prompt + tools + policy;
- semantic cache лише для low-risk відповідей і тільки з перевіркою актуальності;
- не кешувати сирі персональні дані без TTL/шифрування;
- cache key має включати мову, system policy, retrieval snapshot і schema version;
- invalidation при зміні model revision, policy або knowledge base;
- окремо рахувати cache hit/miss для бюджету.

### 10.2. Privacy

- за замовчуванням `local_only` для персональних, медичних, фінансових, секретних і внутрішніх кодових даних;
- hosted route — лише після allowlist, DPA/terms review і явного policy decision;
- secrets не передавати моделі; tool credentials зберігати в secret manager;
- redaction перед логуванням, шифрування at rest/in transit, короткі TTL;
- sandbox для коду й tool calls без мережі за замовчуванням;
- allowlist команд, path jail, time/memory limits, human approval для side effects;
- prompt injection трактувати як вхідні дані, не як policy.

## 11. GitHub Actions і Pages

### 11.1. GitHub Actions

Actions доцільно використовувати для reproducible CI, не як inference-платформу для великих моделей:

- lint/format/type checks для gateway і swarm;
- unit tests для router, schemas, quorum і fallback;
- registry validation: checksum, license metadata, pinned revisions;
- small smoke eval на CPU/малому checkpoint;
- code tests, SAST, dependency/license scan;
- nightly/weekly eval на self-hosted GPU runner, якщо доступний;
- публікація агрегованих, redacted benchmark reports як artifacts.

Secrets: GitHub Actions secrets/OIDC, жодних токенів у prompt, logs або Pages.

### 11.2. GitHub Pages

Pages підходить для статичного dashboard документації: model matrix, eval trends, release notes, architecture diagrams, latency/cost charts. Не публікувати prompts, PII, raw traces, API keys, private code чи внутрішні model endpoints. Дані перед публікацією мають проходити redaction і aggregation.

## 12. Бюджети й capacity planning

Бюджетувати не «ціну моделі», а:

- RAM/VRAM і дисковий footprint checkpoint/quant;
- startup/load time;
- tokens/sec і concurrency;
- input/output tokens per task;
- retry, critic і quorum multiplier;
- energy/GPU-hour або cloud-hour;
- storage/logging/egress;
- engineering and maintenance time.

Ввести budget classes:

- **micro:** один дешевий worker, короткий output, без quorum;
- **standard:** primary + schema/tool validation;
- **verified:** primary + independent critic + evidence;
- **high-risk:** quorum + reviewer + deterministic tools + human gate.

Hard limits: max context, max output tokens, max retries, max wall time, max tool calls, max cost units/task. При перевищенні — graceful degradation або human escalation, а не нескінченний retry.

## 13. Послідовний план етапів і критерії готовності

### Етап 0 — Governance і inventory

**Дії:** registry schema, license matrix, privacy classes, threat model, task taxonomy, golden eval set.  
**Ready:** кожна з 15 моделей має source/license/runtime/constraints; немає непозначених hosted claims; є owner і rollback policy.

### Етап 1 — Gateway contract

**Дії:** єдиний request/response schema, auth, trace ID, usage, error taxonomy.  
**Ready:** усі локальні backends можна викликати одним контрактом; invalid schema/tool calls відхиляються до side effect.

### Етап 2 — Reference runtimes

**Дії:** підняти Qwen3, SmolLM2, Granite, Yi-Coder/DeepSeek-Coder, Gemma; інші додавати за hardware. Pin versions, templates, quantization.  
**Ready:** liveness/readiness/smoke tests, reproducible startup, documented memory profile, fallback route.

### Етап 3 — Queen + routing

**Дії:** capability registry, privacy/risk router, task DAG, event bus.  
**Ready:** router пояснює вибір моделі; trace містить routing reason; context overflow і model unavailable обробляються.

### Етап 4 — Fеромони, quorum, critic

**Дії:** typed events, idempotency, leases, quorum policies, independent prompts/models.  
**Ready:** повторна доставка не дублює side effects; high-risk task не затверджується одним worker-ом.

### Етап 5 — Deterministic tools і sandbox

**Дії:** retrieval, schema validators, Python/Node test sandbox, lint/type/SAST, OCR/vision adapters.  
**Ready:** tool permissions deny-by-default; код не має production credentials; tool results attached as evidence.

### Етап 6 — Evals і calibration

**Дії:** baseline кожної моделі, український набір, stress/long-context, cost/latency, adversarial cases.  
**Ready:** routing thresholds засновані на локальних даних; є regression gate і abstention policy.

### Етап 7 — CI/CD і Pages

**Дії:** GitHub Actions checks, signed/pinned artifacts, redacted Pages dashboard.  
**Ready:** PR без license/test/schema checks не merge-иться; dashboard не витікає секретів.

### Етап 8 — Limited pilot

**Дії:** невелика група low/medium-risk задач, human review, shadow mode.  
**Ready:** error budget, rollback, incident runbook, cost cap і audit trail пройдені.

### Етап 9 — Production expansion

**Дії:** підключення великих моделей і high-risk quorum лише після підтверджених evals.  
**Ready:** SLO, capacity plan, on-call, model update procedure, legal sign-off.

## 14. Основні ризики та мітимації

| Ризик | Наслідок | Мітигація |
|---|---|---|
| Галюцинації | хибні рішення/тексти | evidence, retrieval, critic, abstention |
| Некоректний tool call | небезпечний side effect | JSON schema, allowlist, sandbox, human gate |
| Prompt injection | витік/зловживання інструментом | trust boundaries, content/data separation, deny-by-default |
| Endless reasoning/repetition | latency/cost spike | token/time limits, правильний sampling, stop conditions |
| OOM/перевищення context | downtime | quantization, queue limits, chunk/retrieve, fallback |
| Слабка українська | неправильний результат | Ukrainian eval, Qwen-first routing, human review |
| Незалежність quorum ілюзорна | узгоджена помилка | різні families/prompts/evidence, deterministic checker |
| License mismatch | legal/compliance exposure | registry, notices, pinned artifacts, counsel review |
| Supply-chain risk | compromised runtime/checkpoint | hashes, pinned deps, sandbox, code review trust_remote_code |
| Model drift/runtime drift | regression | version pin, eval gate, canary, rollback |
| Логування PII | privacy incident | redaction, encryption, TTL, local-only policy |
| Hosted cost surprise | budget overrun | no implicit hosted route, quotas, usage meters, hard caps |

## 15. Що не можна обіцяти

- Не можна обіцяти, що open-weight модель або Ollama є «повністю безкоштовними»: hardware, electricity, storage і operations мають вартість.
- Не можна обіцяти безкоштовний hosted API без актуального підтвердження провайдера.
- Не можна обіцяти однакову якість 15 моделей, однаковий context behavior або сумісність усіх runtime.
- Не можна обіцяти, що thinking/CoT гарантує істину чи відсутність помилок.
- Не можна обіцяти native tool execution: модель лише генерує виклик, а оркестратор має валідовувати й виконувати його.
- Не можна обіцяти, що benchmarks авторів відтворяться на українських, доменних або security-задачах.
- Не можна обіцяти, що 128K/256K/1M context означає однакову якість на всій довжині.
- Не можна обіцяти, що квантована версія збереже якість full precision.
- Не можна обіцяти legal compliance лише за назвою ліцензії; потрібен review конкретного checkpoint, квантизації, даних і способу розповсюдження.
- Не можна дозволяти моделі самостійно деплоїти код, змінювати права, надсилати зовнішні повідомлення чи виконувати необмежені команди.

## 16. Невирішені питання перед production

1. Яке фактичне залізо KROK доступне: CPU, VRAM/RAM, кількість GPU, disk і допустима concurrency?
2. Які саме задачі й risk tiers є пріоритетними, і які дані класифікуються як local-only?
3. Який event bus/queue буде canonical: Redis Streams, NATS, Kafka або інший компонент?
4. Чи потрібні vision/audio adapters поза Gemma/Mistral, і які OCR вимоги?
5. Який юридичний owner затвердить Llama Community, Gemma Terms, Falcon License, OpenRAIL-M і DeepSeek Model License?
6. Які exact checkpoint revisions, quantizations і runtime versions буде дозволено в registry?
7. Які українські golden/eval datasets можна законно використовувати і публікувати в агрегованому dashboard?
8. Який human approval SLA для high-risk результатів?
9. Який budget ceiling per task/day і який допустимий error budget?
10. Чи потрібні fine-tuning/LoRA, чи достатньо retrieval і prompt contracts?
11. Які hosted providers, якщо такі є, будуть дозволені після privacy/cost review?
12. Який SLO для latency, availability і recovery після OOM/runtime failure?

## 17. Фінальна рекомендація

Запускати KROK Agent Swarm поетапно, починаючи з 5–7 моделей і суворих контрактів, а не з одночасного підключення всіх 15. Мінімальний production-quality контур: Qwen3 Queen, DeepSeek/Phi reasoning, Yi-Coder або DeepSeek-Coder code worker, Gemma/Mistral vision worker, Granite verifier/extractor, SmolLM2/Qwen quantized reserve, deterministic tools, registry, gateway, event log, sandbox і eval gate. Після підтвердження якості та ресурсів додавати Llama, OLMo, InternLM, Falcon, MiniCPM і StarCoder2 як незалежні спеціалісти або резерви.

Головний принцип: **модель пропонує, інструмент перевіряє, quorum порівнює, reviewer затверджує, а політика контролює side effects**.
