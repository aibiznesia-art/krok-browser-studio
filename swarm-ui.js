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
