'use strict';

/* ============ Состояние ============ */
const params = { salt: 50, fat: 50, pepper: 50 };
let busy = false; // защита от двойной генерации

const createBtn   = document.getElementById('createBtn');
const btnLabel    = createBtn.querySelector('.btn-label');
const placeholder = document.getElementById('placeholder');
const resultBox   = document.getElementById('result');
const artBox      = document.getElementById('sausageArt');
const nameBox     = document.getElementById('sausageName');
const descBox     = document.getElementById('sausageDesc');
const errorBox    = document.getElementById('errorBox');
const errorText   = document.getElementById('errorText');
const themeToggle = document.getElementById('themeToggle');

/* ============ Слайдеры <-> числовые поля ============ */
document.querySelectorAll('.control').forEach((control) => {
    const key   = control.dataset.param;
    const range = control.querySelector('input[type="range"]');
    const num   = control.querySelector('input[type="number"]');

    const paint = (v) => range.style.setProperty('--pct', v + '%');

    range.value = params[key];
    num.value   = params[key];
    paint(params[key]);

    range.addEventListener('input', () => {
        const v = parseInt(range.value, 10);
        params[key] = v;
        num.value = v;
        paint(v);
    });

    num.addEventListener('input', () => {
        if (num.value.trim() === '') return;      // пустое поле — не трогаем
        let v = parseInt(num.value, 10);
        if (Number.isNaN(v)) return;              // мусор — игнорируем
        v = Math.max(0, Math.min(100, v));        // clamp 0..100
        params[key] = v;
        range.value = v;
        paint(v);
    });

    num.addEventListener('blur', () => { num.value = params[key]; });
});

/* ============ Enter = «Создать» ============ */
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    // Кнопки обрабатывают Enter нативно — не мешаем (иначе будет двойной вызов)
    if (e.target.closest && e.target.closest('button')) return;
    e.preventDefault();
    generate();
});

/* ============ Тема ============ */
function syncToggleIcon() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark';
    themeToggle.textContent = dark ? '☀️' : '🌙';
}
themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('lk-theme', next);
    syncToggleIcon();
});
syncToggleIcon();

/* ============ Генерация ============ */
createBtn.addEventListener('click', generate);

async function generate() {
    if (busy) return;
    busy = true;
    createBtn.disabled = true;
    btnLabel.textContent = 'Создаю…';

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ salt: params.salt, fat: params.fat, pepper: params.pepper })
        });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        const recipe = await response.json();
        render(recipe);
    } catch (err) {
        showError('Не удалось создать колбасу: ' + (err.message || 'сервер недоступен'));
    } finally {
        busy = false;
        createBtn.disabled = false;
        btnLabel.textContent = 'Создать';
    }
}

function render(recipe) {
    errorBox.hidden = true;
    placeholder.hidden = true;
    resultBox.hidden = false;

    artBox.innerHTML = buildSausageSvg(recipe.seed, params.salt, params.fat, params.pepper);
    nameBox.textContent = recipe.name;
    descBox.textContent = recipe.description ? '· ' + recipe.description + ' ·' : '';

    // Перезапуск анимации появления
    resultBox.classList.remove('show');
    void resultBox.offsetWidth; // reflow
    resultBox.classList.add('show');
}

function showError(message) {
    placeholder.hidden = true;
    resultBox.hidden = true;
    errorText.textContent = message;
    errorBox.hidden = false;
}

/* ============ Детерминированный PRNG ============ */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* ============ Процедурная колбаса (SVG) ============
   шпик  -> светлее мясо + белые вкрапления
   перец -> темнее мясо + тёмные зёрна
   соль  -> белые кристаллики                          */
function buildSausageSvg(seed, salt, fat, pepper) {
    const rnd = mulberry32(seed);
    const f = fat / 100, p = pepper / 100, s = salt / 100;
    const mix = (a, b, t) => Math.round(a + (b - a) * t);

    let r = mix(188, 226, f * 0.85), g = mix(86, 148, f * 0.85), b = mix(72, 126, f * 0.85);
    r = mix(r, 116, p * 0.75); g = mix(g, 46, p * 0.75); b = mix(b, 42, p * 0.75);

    const meatLight = `rgb(${mix(r, 255, .22)},${mix(g, 255, .22)},${mix(b, 255, .22)})`;
    const meat      = `rgb(${r},${g},${b})`;
    const meatDark  = `rgb(${mix(r, 45, .5)},${mix(g, 18, .5)},${mix(b, 16, .5)})`;
    const casing    = `rgb(${mix(r, 35, .65)},${mix(g, 12, .65)},${mix(b, 10, .65)})`;

    const nFat    = Math.round(f * 24);
    const nPepper = Math.round(p * 28);
    const nSalt   = Math.round(s * 16);

    /* --- вкрапления на батоне --- */
    const inStick = (x, y) => {
        if (x >= 118 && x <= 302) return y >= 88 && y <= 152;
        const cx = x < 118 ? 118 : 302;
        return Math.hypot(x - cx, y - 120) <= 32;
    };

    let stickSpecks = '';
    const scatterStick = (count, maker) => {
        let placed = 0, guard = 0;
        while (placed < count && guard++ < count * 15 + 30) {
            const x = 100 + rnd() * 220;
            const y = 86 + rnd() * 68;
            if (inStick(x, y)) { stickSpecks += maker(x, y); placed++; }
        }
    };

    scatterStick(nFat, (x, y) =>
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(2 + rnd() * 2.6).toFixed(1)}" ry="${(1.5 + rnd() * 2).toFixed(1)}" fill="#ffeccd" opacity="${(0.8 + rnd() * 0.15).toFixed(2)}"/>`);
    scatterStick(nPepper, (x, y) =>
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.9 + rnd() * 1.4).toFixed(1)}" fill="#2a1a12" opacity="${(0.6 + rnd() * 0.35).toFixed(2)}"/>`);
    scatterStick(nSalt, (x, y) =>
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rnd() * 1).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + rnd() * 0.35).toFixed(2)}"/>`);

    /* --- вкрапления на срезе --- */
    const CX = 302, CY = 196;
    let sliceSpecks = '';
    const scatterSlice = (count, maker) => {
        for (let i = 0; i < count; i++) {
            const rr = 46 * Math.sqrt(rnd());
            const a = rnd() * Math.PI * 2;
            sliceSpecks += maker(CX + rr * Math.cos(a), CY + rr * Math.sin(a));
        }
    };

    scatterSlice(Math.round(nFat * 0.5), (x, y) =>
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(1.8 + rnd() * 2.2).toFixed(1)}" ry="${(1.4 + rnd() * 1.8).toFixed(1)}" fill="#ffeccd" opacity="${(0.8 + rnd() * 0.15).toFixed(2)}"/>`);
    scatterSlice(Math.round(nPepper * 0.5), (x, y) =>
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.8 + rnd() * 1.3).toFixed(1)}" fill="#2a1a12" opacity="${(0.6 + rnd() * 0.35).toFixed(2)}"/>`);
    scatterSlice(Math.round(nSalt * 0.5), (x, y) =>
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.6 + rnd() * 0.9).toFixed(1)}" fill="#ffffff" opacity="${(0.3 + rnd() * 0.35).toFixed(2)}"/>`);

    return `
<svg viewBox="0 0 420 290" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Сгенерированная колбаса">
  <defs>
    <linearGradient id="meatG" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${meatLight}"/>
      <stop offset="0.55" stop-color="${meat}"/>
      <stop offset="1" stop-color="${meatDark}"/>
    </linearGradient>
    <radialGradient id="sliceG" cx="0.38" cy="0.32" r="0.85">
      <stop offset="0" stop-color="${meatLight}"/>
      <stop offset="1" stop-color="${meat}"/>
    </radialGradient>
  </defs>

  <ellipse cx="205" cy="268" rx="178" ry="15" fill="#000" opacity="0.30"/>
  <ellipse cx="${CX}" cy="262" rx="58" ry="10" fill="#000" opacity="0.35"/>

  <g transform="rotate(-12 210 120)">
    <!-- перевязанные концы и шпагат -->
    <path d="M90 85 L58 105 L58 135 L90 155 Z" fill="${casing}"/>
    <rect x="48" y="103" width="13" height="34" rx="6" fill="${meatDark}"/>
    <path d="M52 109 L32 94 M52 131 L32 146" stroke="${casing}" stroke-width="6" stroke-linecap="round"/>
    <path d="M330 85 L362 105 L362 135 L330 155 Z" fill="${casing}"/>
    <rect x="359" y="103" width="13" height="34" rx="6" fill="${meatDark}"/>
    <path d="M368 109 L388 94 M368 131 L388 146" stroke="${casing}" stroke-width="6" stroke-linecap="round"/>
    <!-- батон -->
    <rect x="78" y="80" width="264" height="80" rx="40" fill="url(#meatG)"/>
    <rect x="106" y="89" width="208" height="13" rx="6.5" fill="#fff" opacity="0.16"/>
    <rect x="106" y="140" width="208" height="10" rx="5" fill="#000" opacity="0.14"/>
    ${stickSpecks}
  </g>

  <!-- срез -->
  <circle cx="${CX}" cy="${CY}" r="62" fill="${casing}"/>
  <circle cx="${CX}" cy="${CY}" r="55" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="2"/>
  <circle cx="${CX}" cy="${CY}" r="52" fill="url(#sliceG)"/>
  ${sliceSpecks}
  <ellipse cx="${CX - 18}" cy="${CY - 24}" rx="22" ry="10"
           transform="rotate(-28 ${CX - 18} ${CY - 24})" fill="#fff" opacity="0.13"/>
</svg>`;
}