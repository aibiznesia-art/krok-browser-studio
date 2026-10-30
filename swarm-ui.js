(() => {
  const panel = document.createElement('section');
  panel.id = 'krok-swarm-panel';
  panel.className = 'relative z-20 max-w-6xl mx-auto mb-16 px-4 sm:px-6';
  panel.innerHTML = `
    <div class="rounded-3xl border border-[#E05B70]/30 bg-[#1C1519]/95 p-5 sm:p-7 shadow-2xl shadow-[#A83249]/20">
      <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
        <div>
          <div class="text-[11px] font-mono uppercase tracking-[0.18em] text-[#E05B70]">KROK SWARM CONTROL ROOM</div>
          <h2 class="mt-2 text-2xl sm:text-3xl font-extrabold font-display">Рій агентів для простих команд</h2>
          <p class="mt-2 text-sm text-[#B9AEB3] max-w-2xl">Напишіть, що потрібно знайти, перевірити або опублікувати. Демо-режим показує процес без доступу до секретів; реальні AI-запуски виконуються серверним workflow.</p>
        </div>
        <div class="flex items-center gap-2 text-xs font-mono text-[#B9AEB3]"><span class="w-2 h-2 rounded-full bg-[#E05B70] animate-pulse"></span>SAFE PUBLIC SOURCES ONLY</div>
      </div>
      <form id="swarm-form" class="flex flex-col sm:flex-row gap-3">
        <input id="swarm-command" class="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#100D10] px-4 py-3 text-sm text-white outline-none focus:border-[#E05B70]" placeholder="Наприклад: знайди 5 відкритих джерел про AI-автоматизацію" autocomplete="off">
        <button class="rounded-2xl bg-gradient-to-r from-[#A83249] to-[#E05B70] px-5 py-3 text-sm font-bold text-white hover:opacity-90" type="submit">Запустити рій</button>
      </form>
      <div id="swarm-status" class="mt-6 grid gap-3 md:grid-cols-3" aria-live="polite"></div>
      <div class="mt-6 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
        <div><div class="mb-2 text-xs font-mono uppercase tracking-wider text-[#B9AEB3]">Журнал виконання</div><div id="swarm-log" class="min-h-40 rounded-2xl border border-white/10 bg-[#100D10] p-4 text-xs leading-6 text-[#B9AEB3]"></div></div>
        <div><div class="mb-2 text-xs font-mono uppercase tracking-wider text-[#B9AEB3]">Відкриті джерела</div><div id="swarm-sources" class="min-h-40 rounded-2xl border border-white/10 bg-[#100D10] p-4 text-xs text-[#B9AEB3]"></div></div>
      </div>
    </div>`;

  const hero = document.querySelector('#hero');
  if (hero) hero.insertAdjacentElement('afterend', panel);

  const builder = document.createElement('section');
  builder.className = 'relative z-20 max-w-6xl mx-auto mb-16 px-4 sm:px-6';
  builder.innerHTML = `
    <div class="rounded-3xl border border-white/10 bg-[#140E13] p-5 sm:p-7">
      <div class="mb-5"><div class="text-[11px] font-mono uppercase tracking-[0.18em] text-[#E05B70]">AGENT SITE BUILDER</div><h2 class="mt-2 text-2xl font-extrabold font-display">Створити, редагувати й опублікувати сайт</h2><p class="mt-2 text-sm text-[#B9AEB3]">Опишіть результат простими словами. Зараз доступний безпечний demo-flow; для live GitHub actions потрібен підключений серверний OAuth/GitHub App.</p></div>
      <div class="grid gap-4 lg:grid-cols-4">
        <form id="create-site-form" class="rounded-2xl border border-white/10 bg-[#1C1519] p-4"><div class="font-bold">1. Створити сайт</div><label class="mt-3 block text-xs text-[#B9AEB3]">Назва<input id="site-name" class="mt-1 w-full rounded-xl bg-[#100D10] border border-white/10 p-2 text-sm" value="my-new-site"></label><label class="mt-3 block text-xs text-[#B9AEB3]">Що створити?<textarea id="site-brief" class="mt-1 h-24 w-full rounded-xl bg-[#100D10] border border-white/10 p-2 text-sm" placeholder="Лендінг для кав'ярні з меню і формою контакту"></textarea></label><button class="mt-3 rounded-xl bg-[#A83249] px-4 py-2 text-xs font-bold" type="submit">Підготувати прототип</button></form>
        <form id="edit-site-form" class="rounded-2xl border border-white/10 bg-[#1C1519] p-4"><div class="font-bold">2. Редагувати</div><label class="mt-3 block text-xs text-[#B9AEB3]">Яку зміну зробити?<textarea id="edit-brief" class="mt-1 h-24 w-full rounded-xl bg-[#100D10] border border-white/10 p-2 text-sm" placeholder="Зроби заголовок коротшим і додай блок відгуків"></textarea></label><button class="mt-3 rounded-xl border border-[#E05B70]/50 px-4 py-2 text-xs font-bold" type="submit">Створити patch-план</button></form>
        <form id="publish-site-form" class="rounded-2xl border border-white/10 bg-[#1C1519] p-4"><div class="font-bold">3. GitHub Pages</div><label class="mt-3 block text-xs text-[#B9AEB3]">Репозиторій<input id="repo-name" class="mt-1 w-full rounded-xl bg-[#100D10] border border-white/10 p-2 text-sm" value="my-new-site"></label><div class="mt-3 rounded-xl bg-[#100D10] p-3 text-xs text-[#B9AEB3]">Токени не вводяться сюди. Справжня публікація буде доступна після підключення серверного GitHub OAuth.</div><button class="mt-3 rounded-xl bg-gradient-to-r from-[#A83249] to-[#E05B70] px-4 py-2 text-xs font-bold" type="submit">Підготувати публікацію</button></form>
        <form id="social-form" class="rounded-2xl border border-white/10 bg-[#1C1519] p-4"><div class="font-bold">4. Соцмережі</div><label class="mt-3 block text-xs text-[#B9AEB3]">Публічний URL / RSS<input id="social-url" class="mt-1 w-full rounded-xl bg-[#100D10] border border-white/10 p-2 text-sm" placeholder="YouTube RSS або публічна сторінка"></label><label class="mt-3 block text-xs text-[#B9AEB3]">Тема контенту<input id="social-topic" class="mt-1 w-full rounded-xl bg-[#100D10] border border-white/10 p-2 text-sm" value="AI для бізнесу"></label><button class="mt-3 rounded-xl border border-[#E05B70]/50 px-4 py-2 text-xs font-bold" type="submit">Зібрати й підготувати текст</button></form>
      </div><div id="builder-output" class="mt-4 hidden rounded-2xl border border-[#A83249]/30 bg-[#100D10] p-4 text-sm text-[#B9AEB3]" aria-live="polite"></div>
    </div>`;
  if (hero) hero.insertAdjacentElement('afterend', builder);

  const agents = [
    ['dispatcher', 'Диспетчер', 'розбирає команду'],
    ['researcher', 'Дослідник', 'читає відкриті джерела'],
    ['analyst', 'Аналітик', 'перевіряє факти й посилання'],
    ['developer', 'Розробник', 'готує зміни сайту'],
    ['validator', 'Перевіряльник', 'перевіряє результат'],
    ['publisher', 'Видавець', 'готує GitHub Pages']
  ];
  const status = document.querySelector('#swarm-status');
  const log = document.querySelector('#swarm-log');
  const sources = document.querySelector('#swarm-sources');
  const form = document.querySelector('#swarm-form');
  const command = document.querySelector('#swarm-command');

  function renderStatuses(active = '') {
    status.innerHTML = agents.map(([id, name, desc]) => `<div class="rounded-2xl border border-white/10 bg-[#241A20] p-3"><div class="flex items-center gap-2"><span class="status-dot w-2 h-2 rounded-full bg-white/20" data-agent="${id}"></span><span class="font-bold text-sm">${name}</span></div><div class="mt-1 text-[11px] text-[#B9AEB3]">${active === id ? 'працює…' : desc}</div></div>`).join('');
    if (active) document.querySelector(`[data-agent="${active}"]`)?.classList.add('bg-[#E05B70]', 'animate-pulse');
  }
  function addLog(text) { log.insertAdjacentHTML('beforeend', `<div><span class="text-[#E05B70]">›</span> ${text}</div>`); log.scrollTop = log.scrollHeight; }
  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  renderStatuses();

  const output = document.querySelector('#builder-output');
  const showOutput = (title, body) => { output.classList.remove('hidden'); output.innerHTML = `<div class="font-bold text-white">${title}</div><div class="mt-2">${body}</div>`; };
  document.querySelector('#create-site-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.querySelector('#site-name').value.trim() || 'my-new-site';
    const brief = document.querySelector('#site-brief').value.trim() || 'односторінковий сайт';
    showOutput('Прототип підготовлено', `Проєкт <strong>${name}</strong> створено в demo-flow за описом: «${brief}». Наступний крок — передати задачу агенту-розробнику на сервері.`);
  });
  document.querySelector('#edit-site-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const brief = document.querySelector('#edit-brief').value.trim() || 'оновити дизайн';
    showOutput('Patch-план створено', `Рій підготував би зміну: «${brief}». Перед застосуванням live-версії перевіряльник має показати diff і чек-лист.`);
  });
  document.querySelector('#publish-site-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const repo = document.querySelector('#repo-name').value.trim() || 'my-new-site';
    showOutput('Публікація підготовлена', `Репозиторій <strong>${repo}</strong> готовий до GitHub Pages. У live-режимі сервер створить коміт, запустить workflow і поверне посилання після успішного деплою.`);
  });
  document.querySelector('#social-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.querySelector('#social-url').value.trim() || 'публічний RSS/URL';
    const topic = document.querySelector('#social-topic').value.trim() || 'AI для бізнесу';
    showOutput('Контент-пайплайн підготовлено', `Дослідник перевірить <strong>${url}</strong>, аналітик збере факти про «${topic}», а редактор створить чернетку з цитатами й URL. Перед публікацією потрібен людський перегляд.`);
  });
  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = command.value.trim() || 'перевір відкриті джерела для мого запиту';
    log.innerHTML = ''; sources.innerHTML = '<div class="text-[#B9AEB3]">Демо не робить зовнішніх запитів. Реальний збір запускається через GitHub Actions після налаштування secrets.</div>';
    addLog(`Команда прийнята: «${value.slice(0, 100)}»`);
    for (const [id, name] of agents) {
      renderStatuses(id); addLog(`${name}: ${id === 'researcher' ? 'дозволені лише публічні URL/RSS/API' : 'крок виконано в демонстраційному режимі'}`); await sleep(320);
    }
    renderStatuses();
    sources.innerHTML = '<div class="rounded-xl border border-[#A83249]/30 bg-[#1C1519] p-3"><div class="font-bold text-white">Джерела з’являться після реального запуску</div><div class="mt-1">Зберігатимуться URL, час отримання та короткий опис. Приватні сторінки й обхід обмежень заборонені.</div></div>';
    addLog('Готово: демо-процес завершено. Для реального запуску додайте AI/GitHub secrets у налаштуваннях репозиторію.');
  });
})();
