/**
 * Atrapando Hormigas - Lógica Modular Unificada (app.js)
 * Funciona tanto en index.html (Landing Page) como en app.html (Simulador)
 * 1. Navegación desde Landing Page y Pestañas del Simulador
 * 2. Módulo Calculadora Financiera (Mensual, Anual e Interés Compuesto)
 * 3. Módulo Mini-Juego Interactivo de 30s (Alcancía Virtual)
 * 4. Registro y actualización de PWA (Service Worker)
 */

const STORAGE_KEYS = {
  EXPENSES: 'ah_expenses_v1',
  HIGH_SCORE: 'ah_highscore_v1',
  TARGET_TAB: 'ah_target_tab'
};

const formatARS = (value) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  }).format(Math.round(value));

/* ==========================================
   1. NAVEGACIÓN LANDING (index.html) Y PESTAÑAS (app.html)
   ========================================== */
function initLandingButtons() {
  const navButtons = document.querySelectorAll(
    '#btnNavSimulador, #btnHeroSimulador, #btnHeroJuego'
  );

  navButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetTab = btn.dataset.targetTab || 'calculadora';
      try {
        sessionStorage.setItem(STORAGE_KEYS.TARGET_TAB, targetTab);
      } catch {}

      const destination =
        targetTab === 'juego' ? './app.html?tab=juego#juego' : './app.html';
      window.location.assign(destination);
    });
  });
}

function initTabs() {
  const buttons = document.querySelectorAll('.tab-btn');
  const calcPanel = document.getElementById('panel-calculadora');
  const gamePanel = document.getElementById('panel-juego');

  if (!buttons.length || !calcPanel || !gamePanel) return;

  const panels = {
    calculadora: calcPanel,
    juego: gamePanel
  };

  function activateTab(tabName) {
    const validTab = panels[tabName] ? tabName : 'calculadora';
    buttons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === validTab);
    });
    Object.entries(panels).forEach(([key, panel]) => {
      panel.classList.toggle('active', key === validTab);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => activateTab(btn.dataset.tab));
  });

  // Detectar si el usuario entró desde "Jugar Mini-Juego" por hash, query param o sessionStorage
  const params = new URLSearchParams(window.location.search);
  let savedTab = null;
  try {
    savedTab = sessionStorage.getItem(STORAGE_KEYS.TARGET_TAB);
    sessionStorage.removeItem(STORAGE_KEYS.TARGET_TAB);
  } catch {}

  if (
    window.location.hash === '#juego' ||
    params.get('tab') === 'juego' ||
    savedTab === 'juego'
  ) {
    activateTab('juego');
  }

  window.addEventListener('hashchange', () => {
    if (window.location.hash === '#juego') {
      activateTab('juego');
    } else if (window.location.hash === '#calculadora') {
      activateTab('calculadora');
    }
  });
}

/* ==========================================
   2. MÓDULO CALCULADORA Y PROYECCIÓN
   ========================================== */
function initCalculator() {
  const form = document.getElementById('expenseForm');
  if (!form) return;

  const nameInput = document.getElementById('expName');
  const amountInput = document.getElementById('expAmount');
  const freqInput = document.getElementById('expFreq');
  const listEl = document.getElementById('expenseList');
  const clearBtn = document.getElementById('clearExpensesBtn');
  const rateSlider = document.getElementById('annualRate');
  const rateLabel = document.getElementById('rateLabel');

  const monthlyEl = document.getElementById('monthlyTotal');
  const annualEl = document.getElementById('annualTotal');
  const investedEl = document.getElementById('investedTotal');
  const interestEl = document.getElementById('interestEarned');

  const defaultExpenses = [
    { id: 1, name: '☕ Café / Kiosco', amount: 2200, freq: 20 },
    { id: 2, name: '🛵 Recargo Delivery', amount: 3500, freq: 4 }
  ];

  let expenses = loadExpenses();

  function loadExpenses() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return saved ? JSON.parse(saved) : defaultExpenses;
    } catch {
      return defaultExpenses;
    }
  }

  function saveExpenses() {
    try {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
    } catch {}
  }

  function calculateCompoundAnnual(monthlySaving, annualRatePercent) {
    if (monthlySaving <= 0) return 0;
    const monthlyRate = annualRatePercent / 100 / 12;
    if (monthlyRate === 0) return monthlySaving * 12;
    return (
      monthlySaving *
      (((Math.pow(1 + monthlyRate, 12) - 1) / monthlyRate) * (1 + monthlyRate))
    );
  }

  function render() {
    listEl.innerHTML = '';

    if (expenses.length === 0) {
      listEl.innerHTML = `
        <li class="expense-item" style="justify-content:center; color: var(--text-muted);">
          No hay gastos cargados. Agregá uno arriba para simular.
        </li>`;
    }

    let monthlyTotal = 0;

    expenses.forEach((item) => {
      const itemMonthly = item.amount * item.freq;
      monthlyTotal += itemMonthly;

      const li = document.createElement('li');
      li.className = 'expense-item';
      li.innerHTML = `
        <div class="expense-info">
          <strong>${escapeHTML(item.name)}</strong>
          <small>${formatARS(item.amount)} × ${item.freq} veces/mes</small>
        </div>
        <div class="expense-right">
          <span class="expense-monthly">${formatARS(itemMonthly)}/mes</span>
          <button class="btn-delete" data-id="${item.id}" title="Eliminar">✕</button>
        </div>
      `;
      listEl.appendChild(li);
    });

    const annualDirect = monthlyTotal * 12;
    const tna = Number(rateSlider.value);
    const annualInvested = calculateCompoundAnnual(monthlyTotal, tna);
    const earnedInterest = Math.max(0, annualInvested - annualDirect);

    rateLabel.textContent = `${tna}% anual`;
    monthlyEl.textContent = formatARS(monthlyTotal);
    annualEl.textContent = formatARS(annualDirect);
    investedEl.textContent = formatARS(annualInvested);
    interestEl.textContent = `Ganancia extra por interés compuesto: +${formatARS(earnedInterest)}`;
  }

  function addExpense(name, amount, freq) {
    if (!name || amount <= 0 || freq <= 0) return;
    expenses.push({
      id: Date.now() + Math.random(),
      name: name.trim(),
      amount: Number(amount),
      freq: Number(freq)
    });
    saveExpenses();
    render();
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    addExpense(nameInput.value, amountInput.value, freqInput.value);
    form.reset();
    freqInput.value = 12;
    nameInput.focus();
  });

  document.querySelectorAll('.chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      addExpense(chip.dataset.name, chip.dataset.amount, chip.dataset.freq);
    });
  });

  listEl.addEventListener('click', (e) => {
    const deleteBtn = e.target.closest('.btn-delete');
    if (!deleteBtn) return;
    const id = Number(deleteBtn.dataset.id);
    expenses = expenses.filter((item) => item.id !== id);
    saveExpenses();
    render();
  });

  clearBtn.addEventListener('click', () => {
    expenses = [];
    saveExpenses();
    render();
  });

  rateSlider.addEventListener('input', render);

  render();
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ==========================================
   3. MÓDULO MINI-JUEGO INTERACTIVO (30s)
   ========================================== */
function initMiniGame() {
  const arena = document.getElementById('gameArena');
  if (!arena) return;

  const overlay = document.getElementById('gameOverlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayDesc = document.getElementById('overlayDesc');
  const startBtn = document.getElementById('startGameBtn');
  const piggyBank = document.getElementById('piggyBank');

  const timeEl = document.getElementById('gameTime');
  const savedEl = document.getElementById('gameSaved');
  const pointsEl = document.getElementById('gamePoints');
  const highScoreEl = document.getElementById('gameHighScore');

  const ANT_ITEMS = [
    { emoji: '🍬', label: 'Golosina', value: 1000, points: 10, ttl: 1700 },
    { emoji: '☕', label: 'Café al paso', value: 2500, points: 25, ttl: 1500 },
    { emoji: '🥤', label: 'Gaseosa', value: 1800, points: 18, ttl: 1600 },
    { emoji: '🍔', label: 'Snack rápido', value: 4000, points: 40, ttl: 1300 },
    { emoji: '🛵', label: 'Delivery', value: 5500, points: 55, ttl: 1150 },
    { emoji: '🎮', label: 'Skin / App', value: 7000, points: 70, ttl: 1000 }
  ];

  let timeLeft = 30;
  let savedMoney = 0;
  let points = 0;
  let highScore = Number(localStorage.getItem(STORAGE_KEYS.HIGH_SCORE) || 0);
  let timerInterval = null;
  let spawnerInterval = null;
  let isPlaying = false;

  highScoreEl.textContent = formatARS(highScore);

  function updateHUD() {
    timeEl.textContent = `${timeLeft}s`;
    savedEl.textContent = formatARS(savedMoney);
    pointsEl.textContent = points;
    highScoreEl.textContent = formatARS(highScore);
  }

  function clearArenaTargets() {
    arena.querySelectorAll('.ant-target, .float-score').forEach((el) => el.remove());
  }

  function spawnAntExpense() {
    if (!isPlaying) return;

    const item = ANT_ITEMS[Math.floor(Math.random() * ANT_ITEMS.length)];
    const target = document.createElement('button');
    target.type = 'button';
    target.className = 'ant-target';
    target.setAttribute('aria-label', `Atrapar ${item.label}`);

    const maxX = Math.max(20, arena.clientWidth - 84);
    const maxY = Math.max(20, arena.clientHeight - 135);
    const x = Math.floor(12 + Math.random() * (maxX - 12));
    const y = Math.floor(12 + Math.random() * (maxY - 12));

    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    target.innerHTML = `
      <span class="emoji">🐜${item.emoji}</span>
      <span class="price">${formatARS(item.value)}</span>
    `;

    const autoRemove = setTimeout(() => {
      if (target.parentNode) target.remove();
    }, item.ttl);

    target.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (!isPlaying) return;
      clearTimeout(autoRemove);

      savedMoney += item.value;
      points += item.points;

      if (savedMoney > highScore) {
        highScore = savedMoney;
        try {
          localStorage.setItem(STORAGE_KEYS.HIGH_SCORE, String(highScore));
        } catch {}
      }

      showFloatingScore(x, y, `+${formatARS(item.value)}`);
      bumpPiggy(item.label, item.value);
      updateHUD();
      target.remove();
    });

    arena.appendChild(target);
  }

  function showFloatingScore(x, y, text) {
    const floatEl = document.createElement('div');
    floatEl.className = 'float-score';
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;
    floatEl.textContent = text;
    arena.appendChild(floatEl);
    setTimeout(() => floatEl.remove(), 650);
  }

  function bumpPiggy(label, value) {
    piggyBank.textContent = `🐷 ¡Ahorraste ${formatARS(value)} en ${label}!`;
    piggyBank.classList.remove('bump');
    void piggyBank.offsetWidth;
    piggyBank.classList.add('bump');
  }

  function startGame() {
    isPlaying = true;
    timeLeft = 30;
    savedMoney = 0;
    points = 0;
    clearArenaTargets();
    updateHUD();

    overlay.classList.add('hidden');
    piggyBank.textContent = '🐷 ¡Tocá las hormigas para ahorrar!';

    spawnAntExpense();
    spawnerInterval = setInterval(spawnAntExpense, 550);

    timerInterval = setInterval(() => {
      timeLeft -= 1;
      updateHUD();
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    isPlaying = false;
    clearInterval(timerInterval);
    clearInterval(spawnerInterval);
    clearArenaTargets();

    const annualEquivalent = savedMoney * 12;
    overlayTitle.textContent = '🎉 ¡Tiempo cumplido!';
    overlayDesc.innerHTML = `
      Rescataste <strong>${formatARS(savedMoney)}</strong> (${points} pts) para tu alcancía.<br/>
      Si evitás este gasto cada mes, en un año habrás ahorrado <strong>${formatARS(annualEquivalent)}</strong>.
    `;
    startBtn.textContent = 'Jugar de nuevo 🔄';
    overlay.classList.remove('hidden');
  }

  startBtn.addEventListener('click', startGame);
}

/* ==========================================
   4. INICIALIZACIÓN Y PWA
   ========================================== */
function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('./sw.js')
        .then((reg) => reg.update())
        .catch(() => {});
    });
  }

  let deferredPrompt;
  const installBtns = document.querySelectorAll('#installBtn, #installBtnApp');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtns.forEach((btn) => {
      btn.style.display = 'inline-flex';
    });
  });

  installBtns.forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      deferredPrompt = null;
      installBtns.forEach((b) => {
        b.style.display = 'none';
      });
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initLandingButtons();
  initTabs();
  initCalculator();
  initMiniGame();
  initPWA();
});
