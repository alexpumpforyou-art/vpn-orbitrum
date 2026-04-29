/* ============================================================
   ORBITUM VPN — main script
   ============================================================ */

/* ------------------------------------------------------------
   1) Морфинг шапки  (изолирован — работает даже если Lenis упал)
   ------------------------------------------------------------ */
(function () {
  const header = document.getElementById('header');
  if (!header) return;

  let lastScrolled = false;
  function update() {
    const scrolled = window.scrollY > 30;
    if (scrolled !== lastScrolled) {
      header.classList.toggle('scrolled', scrolled);
      lastScrolled = scrolled;
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  document.addEventListener('DOMContentLoaded', update);
  update();
})();

/* ------------------------------------------------------------
   2) Lenis (плавный скролл) + GSAP интеграция
   ------------------------------------------------------------ */
let lenisInstance = null;

(function () {
  if (typeof Lenis === 'undefined') {
    console.warn('[app] Lenis not loaded — falling back to native scroll');
    return;
  }

  const lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    smoothTouch: false,
    wheelMultiplier: 1,
  });
  lenisInstance = lenis;

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }
})();

/* ------------------------------------------------------------
   3) Smooth scroll по якорям + закрытие моб. меню
   ------------------------------------------------------------ */
(function () {
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const href = link.getAttribute('href');
    if (!href || href === '#' || href.length < 2) return;

    link.addEventListener('click', (e) => {
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      if (lenisInstance) {
        lenisInstance.scrollTo(target, { offset: -90, duration: 1.4 });
      } else {
        const top = target.getBoundingClientRect().top + window.scrollY - 90;
        window.scrollTo({ top, behavior: 'smooth' });
      }

      mobileMenu?.classList.remove('is-open');
      burger?.classList.remove('is-active');
      document.body.style.overflow = '';
    });
  });
})();

/* ------------------------------------------------------------
   4) Dropdown языка
   ------------------------------------------------------------ */
(function () {
  const lang = document.getElementById('lang');
  if (!lang) return;
  const langBtn = lang.querySelector('.header__lang-btn');
  const langItems = lang.querySelectorAll('.header__lang-dropdown button');

  langBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    lang.classList.toggle('is-open');
  });

  document.addEventListener('click', () => lang.classList.remove('is-open'));

  langItems.forEach((btn) => {
    btn.addEventListener('click', () => {
      langItems.forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const code = (btn.dataset.lang || 'ru').toUpperCase();
      const label = lang.querySelector('.header__lang-btn span');
      if (label) label.textContent = code;
      lang.classList.remove('is-open');
    });
  });
})();

/* ------------------------------------------------------------
   5a) Reveal-on-scroll (карточки бенто и др.)
   ------------------------------------------------------------ */
(function () {
  const items = document.querySelectorAll('[data-reveal]');
  if (!items.length || typeof IntersectionObserver === 'undefined') {
    items.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const delay = parseFloat(el.dataset.revealDelay || (i * 0.06));
        el.style.transitionDelay = delay + 's';
        el.classList.add('is-visible');
        io.unobserve(el);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  items.forEach((el) => io.observe(el));
})();

/* ------------------------------------------------------------
   5b) Спидометр — 270° приборная дуга, тики, шкала, glow-точка
        Анимация: разгон → overshoot → бесконечный live-режим
   ------------------------------------------------------------ */
(function () {
  const root = document.getElementById('speedometer');
  if (!root) return;
  const fill   = root.querySelector('#speedFill');
  const needle = root.querySelector('#speedNeedle');
  const valueEl = root.querySelector('#speedValue');
  const dot    = root.querySelector('#speedDot');
  const dotC   = root.querySelector('#speedDotCore');
  const ticksG = root.querySelector('#speedTicks');
  const labelsG = root.querySelector('#speedLabels');
  if (!fill || !needle || !valueEl) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const CENTER = { x: 210, y: 200 };
  const RADIUS = 130;
  const START  = -135;
  const ARC    = 270;
  const TARGET = 10;
  const RAMP_DURATION = 2400;

  function angleToXY(deg, r) {
    const rad = (deg - 90) * Math.PI / 180;
    return { x: CENTER.x + r * Math.cos(rad), y: CENTER.y + r * Math.sin(rad) };
  }

  // ticks
  if (ticksG) {
    for (let i = 0; i < 21; i++) {
      const t = i / 20;
      const angle = START + ARC * t;
      const isMajor = i % 2 === 0;
      const a = angleToXY(angle, RADIUS - 22);
      const b = angleToXY(angle, RADIUS - (isMajor ? 6 : 11));
      const line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', a.x.toFixed(2));
      line.setAttribute('y1', a.y.toFixed(2));
      line.setAttribute('x2', b.x.toFixed(2));
      line.setAttribute('y2', b.y.toFixed(2));
      line.setAttribute('stroke', isMajor ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.16)');
      line.setAttribute('stroke-width', isMajor ? 1.6 : 1);
      line.setAttribute('stroke-linecap', 'round');
      ticksG.appendChild(line);
    }
  }

  // labels
  if (labelsG) {
    [0, 2, 4, 6, 8, 10].forEach((v) => {
      const t = v / TARGET;
      const angle = START + ARC * t;
      const p = angleToXY(angle, RADIUS - 42);
      const text = document.createElementNS(SVG_NS, 'text');
      text.setAttribute('x', p.x.toFixed(2));
      text.setAttribute('y', (p.y + 5).toFixed(2));
      text.textContent = v;
      labelsG.appendChild(text);
    });
  }

  function placeDot(angle) {
    const p = angleToXY(angle, RADIUS);
    if (dot)  { dot.setAttribute('cx', p.x.toFixed(2));  dot.setAttribute('cy', p.y.toFixed(2)); }
    if (dotC) { dotC.setAttribute('cx', p.x.toFixed(2)); dotC.setAttribute('cy', p.y.toFixed(2)); }
  }

  function applyValue(value) {
    const clamped = Math.max(0, Math.min(TARGET, value));
    const ratio = clamped / TARGET;
    const angle = START + ARC * ratio;
    needle.style.transform = 'rotate(' + angle + 'deg)';
    fill.style.strokeDashoffset = (100 * (1 - ratio)).toFixed(2);
    placeDot(angle);
    valueEl.textContent = clamped.toFixed(1);
  }
  applyValue(0);

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  let played = false;
  let liveRunning = false;

  function startLive() {
    if (liveRunning) return;
    liveRunning = true;
    const liveStart = performance.now();

    // следующее «событие» провала скорости
    let nextDip = liveStart + 4000 + Math.random() * 4000;
    let dipUntil = 0;
    let dipDepth = 0;

    function frame(ts) {
      if (document.hidden) {
        requestAnimationFrame(frame);
        return;
      }
      const dt = (ts - liveStart) / 1000;

      // basic micro-oscillation (имитация постоянного измерения)
      const wave =
        Math.sin(dt * 0.65) * 0.18 +
        Math.sin(dt * 1.7)  * 0.12 +
        Math.sin(dt * 3.4)  * 0.06;

      // pseudo-random jitter (детерминированный)
      const jitter =
        Math.sin(dt * 17.3) * 0.04 +
        Math.sin(dt * 23.7) * 0.03;

      // редкие "просадки" 0.6-1.5 Gb, длительность 0.8-1.5 сек
      if (ts >= nextDip && dipUntil === 0) {
        dipDepth = 0.7 + Math.random() * 0.9;
        dipUntil = ts + 800 + Math.random() * 700;
      }
      let dip = 0;
      if (dipUntil > 0) {
        const remaining = dipUntil - ts;
        if (remaining <= 0) {
          dipUntil = 0;
          nextDip = ts + 5000 + Math.random() * 6000;
        } else {
          // плавный bell-shape провал
          const phase = 1 - (remaining / 1500);
          dip = Math.sin(phase * Math.PI) * dipDepth;
        }
      }

      const value = TARGET - 0.18 + wave + jitter - dip;
      applyValue(value);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function play() {
    if (played) return;
    played = true;
    const startTs = performance.now();

    function ramp(ts) {
      const t = Math.min(1, (ts - startTs) / RAMP_DURATION);
      const e = easeOutCubic(t);
      // overshoot to 10.4 → settles to 10
      const overshoot = e <= 0.85
        ? e * (10.4 / 0.85)
        : 10.4 - (e - 0.85) / 0.15 * 0.4;
      applyValue(overshoot);

      if (t < 1) requestAnimationFrame(ramp);
      else startLive();
    }
    requestAnimationFrame(ramp);
  }

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { play(); io.disconnect(); }
      });
    }, { threshold: 0.35 });
    io.observe(root);
  } else {
    setTimeout(play, 500);
  }
})();

/* ------------------------------------------------------------
   6) Мобильное меню
   ------------------------------------------------------------ */
(function () {
  const burger = document.getElementById('burger');
  const mobileMenu = document.getElementById('mobileMenu');
  const header = document.getElementById('header');
  if (!burger || !mobileMenu) return;

  burger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    burger.classList.toggle('is-active', open);
    if(header) header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenisInstance) {
      open ? lenisInstance.stop() : lenisInstance.start();
    }
  });
})();

/* ------------------------------------------------------------
   7) Locations — 3 орбитальных кольца + параллакс + попап «+8 стран»
   ------------------------------------------------------------ */
(function () {
  var stage   = document.getElementById('locationsStage');
  var grid    = document.getElementById('locationsGrid');
  var moreBtn = document.getElementById('locMoreBtn');
  if (!stage || !grid) return;
  if (window.matchMedia('(max-width: 768px)').matches) return;

  var mainCards = Array.from(grid.querySelectorAll('.loc-card'));
  var N = mainCards.length;

  /* Орбитальные кольца */
  var ringDefs = [
    { count: 3, rx: 95,  ry: 50,  sc: 0.48, rot: 3, start: 90  },
    { count: 4, rx: 198, ry: 84,  sc: 0.70, rot: 4, start: 45  },
    { count: 5, rx: 300, ry: 108, sc: 1.0,  rot: 5, start: 15  },
  ];

  /* Позиции взрыва — вычисляются один раз */
  var explPos = [];
  ringDefs.forEach(function (ring, ri) {
    var step = 360 / ring.count;
    for (var j = 0; j < ring.count; j++) {
      var rad = (ring.start + j * step) * Math.PI / 180;
      var base = ri * 0.55 + 0.35;
      explPos.push({
        x:    Math.cos(rad) * ring.rx,
        y:    Math.sin(rad) * ring.ry,
        rz:   (Math.random() - 0.5) * ring.rot * 2,
        sc:   ring.sc,
        dx:   base + (Math.random() - 0.5) * 0.55,
        dy:   base + (Math.random() - 0.5) * 0.55,
        drz:  (Math.random() - 0.5) * 0.045,
        rx_c: (Math.random() - 0.5) * 0.04,
        ry_c: (Math.random() - 0.5) * 0.06,
        ring: ri,
      });
    }
  });

  /* Стопка-веер */
  var stackPos = mainCards.map(function (_, i) {
    var t = (i / (N - 1)) - 0.5;
    return { x: t * 5, y: t * 2, rz: t * 30 };
  });

  function getExplZ(ri) { return ri * 15 + 5; }

  mainCards.forEach(function (c, i) { c.style.zIndex = String(N - i); });

  function setTf(card, x, y, rx, ry, rz, sc) {
    card.style.transform =
      'translate(calc(-50% + ' + x.toFixed(2) + 'px), calc(-50% + ' + y.toFixed(2) + 'px))' +
      ' perspective(700px)' +
      ' rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg)' +
      ' rotate(' + rz.toFixed(2) + 'deg)' +
      ' scale(' + sc.toFixed(3) + ')';
  }

  function applyStack(animated) {
    mainCards.forEach(function (card, i) {
      if (animated) {
        card.style.transition =
          'transform 0.54s cubic-bezier(0.25,0.46,0.45,0.94),' +
          'opacity 0.3s,box-shadow 0.3s var(--ease),border-color 0.3s var(--ease)';
      }
      var p = stackPos[i];
      setTf(card, p.x, p.y, 0, 0, p.rz, 1);
    });
  }

  applyStack(false);

  var rafId        = null;
  var isExploded   = false;
  var isLive       = false;
  var mx = 0, my = 0, tmx = 0, tmy = 0;
  var explodeTimer = null;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function startParallax() {
    mainCards.forEach(function (c) {
      c.style.transition = 'opacity 0.3s,box-shadow 0.3s var(--ease),border-color 0.3s var(--ease)';
    });
    isLive = true;
    (function tick() {
      if (!isLive) return;
      mx = lerp(mx, tmx, 0.07);
      my = lerp(my, tmy, 0.07);
      mainCards.forEach(function (card, i) {
        var p = explPos[i];
        setTf(card,
          p.x + mx * p.dx * 0.055,
          p.y + my * p.dy * 0.045,
          my * p.rx_c,
          mx * p.ry_c,
          p.rz + mx * p.drz,
          p.sc);
      });
      rafId = requestAnimationFrame(tick);
    }());
  }

  function explode() {
    if (isExploded) return;
    isExploded = true;
    stage.classList.add('is-exploded');
    mainCards.forEach(function (card, i) {
      var delay = i * 30;
      card.style.transition =
        'transform 0.72s cubic-bezier(0.34,1.46,0.64,1) ' + delay + 'ms,' +
        'opacity 0.3s,box-shadow 0.3s var(--ease),border-color 0.3s var(--ease)';
      card.style.zIndex = String(getExplZ(explPos[i].ring));
      var p = explPos[i];
      setTf(card, p.x, p.y, 0, 0, p.rz, p.sc);
    });
    clearTimeout(explodeTimer);
    explodeTimer = setTimeout(function () {
      if (isExploded) startParallax();
    }, (N - 1) * 30 + 760);
  }

  function collect() {
    if (!isExploded) return;
    isExploded = false;
    isLive     = false;
    stage.classList.remove('is-exploded');
    clearTimeout(explodeTimer);
    cancelAnimationFrame(rafId);
    mainCards.forEach(function (card, i) {
      card.classList.remove('loc-card--active', 'loc-card--dimmed');
      card.style.zIndex = String(N - i);
    });
    requestAnimationFrame(function () { applyStack(true); });
  }

  stage.addEventListener('mouseenter', explode);
  stage.addEventListener('mouseleave', collect);
  stage.addEventListener('mousemove', function (e) {
    var r = stage.getBoundingClientRect();
    tmx = e.clientX - r.left - r.width  / 2;
    tmy = e.clientY - r.top  - r.height / 2;
  });

  if (moreBtn) {
    moreBtn.addEventListener('mouseenter', function (e) { e.stopPropagation(); });
    moreBtn.addEventListener('mouseleave', function (e) { e.stopPropagation(); });
  }

  /* Hover-подсветка карточек */
  mainCards.forEach(function (card, i) {
    card.addEventListener('mouseenter', function () {
      if (!isExploded) return;
      card.classList.add('loc-card--active');
      mainCards.forEach(function (c) { if (c !== card) c.classList.add('loc-card--dimmed'); });
      card.style.zIndex = '100';
    });
    card.addEventListener('mouseleave', function () {
      card.classList.remove('loc-card--active');
      mainCards.forEach(function (c) { c.classList.remove('loc-card--dimmed'); });
      card.style.zIndex = String(getExplZ(explPos[i].ring));
    });
    var glare = card.querySelector('.loc-card__glare');
    if (!glare) return;
    card.addEventListener('mousemove', function (e) {
      var r  = card.getBoundingClientRect();
      var gx = ((e.clientX - r.left) / r.width  * 100).toFixed(0);
      var gy = ((e.clientY - r.top)  / r.height * 100).toFixed(0);
      glare.style.background = 'radial-gradient(circle at ' + gx + '% ' + gy + '%, rgba(255,255,255,0.18) 0%, transparent 62%)';
    });
    card.addEventListener('mouseleave', function () { glare.style.background = 'none'; });
  });
})();

/* ------------------------------------------------------------
   8) Download — переключение платформ + APK-модалка
   ------------------------------------------------------------ */
(function () {
  const tabs     = document.querySelectorAll('.dl-tab');
  const contents = document.querySelectorAll('.dl-content');
  if (!tabs.length) return;

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const platform = tab.dataset.platform;

      tabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); });
      contents.forEach((c) => c.classList.remove('is-active'));

      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      document.querySelector(`.dl-content[data-for="${platform}"]`)?.classList.add('is-active');
    });
  });

  /* APK guide modal */
  const apkModal     = document.getElementById('apkModal');
  const apkGuideBtn  = document.getElementById('apkGuideBtn');
  const apkCloseBtn  = document.getElementById('apkModalClose');
  if (!apkModal) return;

  function openApk()  { apkModal.classList.add('is-open'); document.body.style.overflow = 'hidden'; if (lenisInstance) lenisInstance.stop(); }
  function closeApk() { apkModal.classList.remove('is-open'); document.body.style.overflow = ''; if (lenisInstance) lenisInstance.start(); }

  apkGuideBtn?.addEventListener('click', openApk);
  apkCloseBtn?.addEventListener('click', closeApk);
  apkModal.addEventListener('click', (e) => { if (e.target === apkModal) closeApk(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && apkModal.classList.contains('is-open')) closeApk(); });
})();

/* ------------------------------------------------------------
   Feature modal — opens on ? click in comparison table
   ------------------------------------------------------------ */
(function () {
  const modal    = document.getElementById('featModal');
  const closeBtn = document.getElementById('featModalClose');
  const titleEl  = document.getElementById('featModalTitle');
  const textEl   = document.getElementById('featModalText');
  if (!modal) return;

  function openModal(title, text) {
    titleEl.textContent = title || '';
    textEl.textContent  = text  || '';
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (lenisInstance) lenisInstance.stop();
  }

  function closeModal() {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lenisInstance) lenisInstance.start();
  }

  document.addEventListener('click', function (e) {
    const hint = e.target.closest('.cmp__hint');
    if (hint) {
      openModal(hint.dataset.title || '', hint.dataset.text || '');
      return;
    }
    if (e.target === modal) closeModal();
  });

  closeBtn.addEventListener('click', closeModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
})();

/* ------------------------------------------------------------
   9) Pricing — переключение периодов и валют
   ------------------------------------------------------------ */
(function () {
  const periodTabs      = document.getElementById('periodTabs');
  const currencySel     = document.getElementById('currencySel');
  const currencyBtn     = document.getElementById('currencyBtn');
  const currencyLabel   = document.getElementById('currencyLabel');
  const currencyDropdown = document.getElementById('currencyDropdown');
  const premiumPrice    = document.getElementById('premiumPrice');
  const premiumSymbol   = document.getElementById('premiumSymbol');
  const freeSymbol      = document.getElementById('freeSymbol');
  if (!periodTabs || !currencySel) return;

  const currencies = {
    RUB: { symbol: '₽', label: 'RUB (₽)', base: 439 },
    USD: { symbol: '$', label: 'USD ($)', base: 4.90 },
    EUR: { symbol: '€', label: 'EUR (€)', base: 4.50 },
    KZT: { symbol: '₸', label: 'KZT (₸)', base: 2200 },
    TRY: { symbol: '₺', label: 'TRY (₺)', base: 159  },
  };
  const discounts = { '1m': 0, '3m': 15, '1y': 60 };

  let currentCurrency = 'RUB';
  let currentPeriod   = '1m';

  function fmtPrice(val) {
    if (val >= 100) return Math.round(val);
    return Number.isInteger(val) ? val : val.toFixed(2);
  }

  function updatePrice() {
    const { base, symbol } = currencies[currentCurrency];
    const monthly = base * (1 - discounts[currentPeriod] / 100);
    premiumPrice.textContent  = fmtPrice(monthly);
    premiumSymbol.textContent = symbol;
    freeSymbol.textContent    = symbol;
  }

  periodTabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.period-tab');
    if (!tab) return;
    periodTabs.querySelectorAll('.period-tab').forEach(t => t.classList.remove('is-active'));
    tab.classList.add('is-active');
    currentPeriod = tab.dataset.period;
    updatePrice();
  });

  currencyBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = currencySel.classList.toggle('is-open');
    currencyBtn.setAttribute('aria-expanded', open);
  });

  currencyDropdown.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-currency]');
    if (!btn) return;
    currentCurrency = btn.dataset.currency;
    currencyLabel.textContent = currencies[currentCurrency].label;
    currencyDropdown.querySelectorAll('button').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    currencySel.classList.remove('is-open');
    currencyBtn.setAttribute('aria-expanded', 'false');
    updatePrice();
  });

  document.addEventListener('click', (e) => {
    if (!currencySel.contains(e.target)) {
      currencySel.classList.remove('is-open');
      currencyBtn.setAttribute('aria-expanded', 'false');
    }
  });
})();

/* ------------------------------------------------------------
   10) Uptime Bar — сегментированный прогресс-бар
   ------------------------------------------------------------ */
(function () {
  const track = document.getElementById('uptimeTrack');
  const bar   = document.getElementById('uptimeBar');
  if (!track || !bar) return;

  const COUNT = 48;
  // Цвета: orange → gold → cyan (остаётся ярким на всём протяжении)
  const from = [255, 107, 31];   // #ff6b1f
  const mid  = [255, 210, 0];    // #ffd200
  const to   = [0,   212, 255];  // #00d4ff

  const frag = document.createDocumentFragment();
  for (let i = 0; i < COUNT; i++) {
    const half = COUNT / 2;
    let r, g, b;
    if (i < half) {
      const t = i / (half - 1);
      r = Math.round(from[0] + (mid[0] - from[0]) * t);
      g = Math.round(from[1] + (mid[1] - from[1]) * t);
      b = Math.round(from[2] + (mid[2] - from[2]) * t);
    } else {
      const t = (i - half) / (half - 1);
      r = Math.round(mid[0] + (to[0] - mid[0]) * t);
      g = Math.round(mid[1] + (to[1] - mid[1]) * t);
      b = Math.round(mid[2] + (to[2] - mid[2]) * t);
    }
    const seg = document.createElement('span');
    seg.className = 'uptime-bar__seg';
    seg.style.setProperty('--i', i);
    seg.style.setProperty('--seg-color', `rgb(${r},${g},${b})`);
    frag.appendChild(seg);
  }
  track.appendChild(frag);

  const obs = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        bar.classList.add('is-playing');
        obs.unobserve(bar);
      }
    },
    { threshold: 0.6 }
  );
  obs.observe(bar);
})();

/* ===== 10. Reviews marquee — duplicate tracks for seamless loop ===== */
(function () {
  document.querySelectorAll('.reviews__track').forEach(function (track) {
    track.innerHTML += track.innerHTML;
  });
})();

/* ===== 11. FAQ accordion ===== */
(function () {
  const items = document.querySelectorAll('.faq__item');
  if (!items.length) return;

  function openItem(item) {
    item.classList.add('is-open');
    item.querySelector('.faq__q').setAttribute('aria-expanded', 'true');
  }
  function closeAll() {
    items.forEach((el) => {
      el.classList.remove('is-open');
      el.querySelector('.faq__q').setAttribute('aria-expanded', 'false');
    });
  }

  // open first item on load
  openItem(items[0]);

  items.forEach((item) => {
    item.querySelector('.faq__q').addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');
      closeAll();
      if (!isOpen) openItem(item);
    });
  });
})();

/* ===== 12. Hero Canvas Particle Globe ===== */
(function () {
  'use strict';

  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const DESKTOP = { count: 380, connectDist: 0.175, maxLinks: 3 };
  const MOBILE  = { count: 160, connectDist: 0.23,  maxLinks: 2 };
  const isMob   = () => window.innerWidth < 768;
  const cfg     = () => (isMob() ? MOBILE : DESKTOP);

  const CF = [255, 130, 50];   // front — orange
  const CB = [20,  195, 255];  // back  — cyan

  let W, H, R;
  let rotY = 0;
  let tX = 0, tY = 0, targTX = 0, targTY = 0;
  let raf = null;
  const pts = [];

  function buildParticles(n) {
    pts.length = 0;
    const phi = (1 + Math.sqrt(5)) / 2;
    for (let i = 0; i < n; i++) {
      const theta = Math.acos(1 - 2 * (i + 0.5) / n);
      const a = 2 * Math.PI * i / phi;
      pts.push({
        ox: Math.sin(theta) * Math.cos(a),
        oy: Math.sin(theta) * Math.sin(a),
        oz: Math.cos(theta),
        sz: 0.65 + Math.random() * 0.85,
        node: Math.random() < 0.05,
        phase: Math.random() * 6.28,
      });
    }
  }

  function resize() {
    const parent = canvas.parentElement;
    const dim = Math.min(parent.offsetWidth || 460, 540);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = H = dim * dpr;
    R = W * 0.41;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width  = dim + 'px';
    canvas.style.height = dim + 'px';
    buildParticles(cfg().count);
  }

  function project(ox, oy, oz) {
    const cy = Math.cos(rotY + tY), sy = Math.sin(rotY + tY);
    let x = ox * cy + oz * sy;
    let z = -ox * sy + oz * cy;
    const cx = Math.cos(tX), sx = Math.sin(tX);
    const y = oy * cx - z * sx;
    z = oy * sx + z * cx;
    const fov = 3.2, sc = fov / (fov + z);
    return { px: W / 2 + x * R * sc, py: H / 2 - y * R * sc, d: z, sc };
  }

  function colStr(dn, alpha) {
    const r = (CB[0] + (CF[0] - CB[0]) * dn) | 0;
    const g = (CB[1] + (CF[1] - CB[1]) * dn) | 0;
    const b = (CB[2] + (CF[2] - CB[2]) * dn) | 0;
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    tX += (targTX - tX) * 0.05;
    tY += (targTY - tY) * 0.05;
    rotY += 0.0024;

    const c = cfg();
    const maxDSq = (c.connectDist * R) * (c.connectDist * R);

    const projected = pts.map((p) => {
      const pr = project(p.ox, p.oy, p.oz);
      return { px: pr.px, py: pr.py, d: pr.d, sc: pr.sc, p };
    });
    projected.sort((a, b) => a.d - b.d);

    // ── Orbit ellipses (subtle decorative rings) ──────────────────────────
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.15, R * 0.26, Math.PI / 11, 0, 6.28);
    ctx.strokeStyle = 'rgba(255,107,31,0.09)';
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, 0, R * 1.27, R * 0.18, -Math.PI / 9, 0, 6.28);
    ctx.strokeStyle = 'rgba(20,195,255,0.07)';
    ctx.lineWidth = 0.55;
    ctx.stroke();
    ctx.restore();

    // ── Connection lines ──────────────────────────────────────────────────
    for (let i = 0; i < projected.length; i++) {
      const a = projected[i];
      if (a.d < -0.1) continue;
      let links = 0;
      for (let j = i + 1; j < projected.length && links < c.maxLinks; j++) {
        const b = projected[j];
        if (b.d < -0.1) continue;
        const dx = a.px - b.px, dy = a.py - b.py;
        const dSq = dx * dx + dy * dy;
        if (dSq < maxDSq) {
          const t = 1 - dSq / maxDSq;
          const avgD = (a.d + b.d) * 0.5;
          const fade = Math.max(0, (avgD + 0.7) / 1.4);
          const alpha = t * t * fade * 0.88;
          const dn = Math.max(0, (avgD + 1) / 2);
          ctx.beginPath();
          ctx.moveTo(a.px, a.py);
          ctx.lineTo(b.px, b.py);
          ctx.strokeStyle = colStr(dn, alpha);
          ctx.lineWidth = 0.85;
          ctx.stroke();
          links++;
        }
      }
    }

    // ── Particles ─────────────────────────────────────────────────────────
    for (const pt of projected) {
      const { px, py, d, sc, p } = pt;
      // Strong depth-based opacity: back hemisphere nearly invisible
      const dn = Math.max(0, (d + 1) / 2);
      if (dn < 0.03) continue;
      const alpha = Math.pow(dn, 1.5) * 0.92 + 0.04;
      const bsz = p.sz * sc * (W / 460);

      if (p.node) {
        // Node: small tasteful glow — NOT a giant blob
        const pulse = 1 + 0.18 * Math.sin((ts || 0) * 0.0015 + p.phase);
        const glowR = bsz * 3 * pulse;
        const grd = ctx.createRadialGradient(px, py, 0, px, py, glowR);
        grd.addColorStop(0,   'rgba(255,140,60,' + (alpha * 0.7) + ')');
        grd.addColorStop(0.45,'rgba(255,107,31,' + (alpha * 0.12) + ')');
        grd.addColorStop(1,   'rgba(255,107,31,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, glowR, 0, 6.28);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,205,130,' + alpha + ')';
        ctx.beginPath();
        ctx.arc(px, py, bsz * 1.9, 0, 6.28);
        ctx.fill();
      } else {
        ctx.fillStyle = colStr(dn, alpha);
        ctx.beginPath();
        ctx.arc(px, py, bsz * 1.25, 0, 6.28);
        ctx.fill();
        // White hot core on front-facing particles
        if (dn > 0.50) {
          ctx.fillStyle = 'rgba(255,255,255,' + (alpha * (dn - 0.50) * 1.6) + ')';
          ctx.beginPath();
          ctx.arc(px, py, bsz * 0.55, 0, 6.28);
          ctx.fill();
        }
      }
    }

    raf = requestAnimationFrame(draw);
  }

  // ── Mouse / Touch ─────────────────────────────────────────────────────────
  const wrap = canvas.parentElement;
  wrap.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    targTX = ((e.clientY - r.top  - r.height / 2) / r.height) * 0.52;
    targTY = ((e.clientX - r.left - r.width  / 2) / r.width)  * 0.75;
  });
  wrap.addEventListener('mouseleave', () => { targTX = 0; targTY = 0; });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const t = e.touches[0], r = canvas.getBoundingClientRect();
    targTX = ((t.clientY - r.top  - r.height / 2) / r.height) * 0.3;
    targTY = ((t.clientX - r.left - r.width  / 2) / r.width)  * 0.45;
  }, { passive: false });

  resize();
  raf = requestAnimationFrame(draw);

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    resize();
    raf = requestAnimationFrame(draw);
  });
}());

/* ===== 13. Hero Ambient Particle Field ===== */
(function () {
  'use strict';

  const canvas = document.getElementById('heroAmbient');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const ORANGE = [255, 107, 31];
  const CYAN   = [0,  212, 255];
  const CONN   = 155;

  let W, H, dpr;
  let globeZone = null;
  const particles = [];
  let raf;

  function updateGlobeZone() {
    const gc = document.getElementById('heroCanvas');
    if (!gc) return;
    const gcRect = gc.getBoundingClientRect();
    const acRect = canvas.getBoundingClientRect();
    globeZone = {
      x: gcRect.left - acRect.left + gcRect.width / 2,
      y: gcRect.top  - acRect.top  + gcRect.height / 2,
      r: gcRect.width * 0.50,
    };
  }

  function globeFade(x, y) {
    if (!globeZone) return 1;
    const dx = x - globeZone.x, dy = y - globeZone.y;
    const d  = Math.sqrt(dx * dx + dy * dy);
    if (d >= globeZone.r) return 1;
    const t = d / globeZone.r;
    return t * t * (3 - 2 * t); // smoothstep 0→1
  }

  function pCount() { return window.innerWidth < 768 ? 28 : 68; }

  // depth: 0=far (tiny/faint/slow) → 1=near (big/bright/fast)
  function mkParticle() {
    const isCyan = Math.random() < 0.5;
    const depth  = Math.random();
    const angle  = Math.random() * Math.PI * 2;
    const speed  = (0.28 + Math.random() * 0.34) * (0.45 + depth * 0.55);
    const rnd    = Math.random();
    return {
      x:        Math.random() * W,
      y:        Math.random() * H,
      vx:       Math.cos(angle) * speed,
      vy:       Math.sin(angle) * speed,
      depth,
      size:     1.0 + depth * 2.8,         // 1.0–3.8 px
      opacity:  0.10 + depth * 0.40,       // 0.10–0.50
      color:    isCyan ? CYAN : ORANGE,
      isNear:   depth > 0.62,
      pulse:    Math.random() * 6.28,
      pulseSpd: 0.0018 + Math.random() * 0.0025,
      // 50% circle · 30% velocity-dash · 20% diamond
      shape:    rnd < 0.50 ? 'circle' : rnd < 0.80 ? 'dash' : 'diamond',
    };
  }

  function init() {
    const section = canvas.parentElement;
    W   = section.offsetWidth;
    H   = section.offsetHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    particles.length = 0;
    const n = pCount();
    for (let i = 0; i < n; i++) particles.push(mkParticle());
    updateGlobeZone();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Move & wrap
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.isNear) p.pulse += p.pulseSpd;
      if (p.x < -8)  p.x = W + 8;
      if (p.x > W+8) p.x = -8;
      if (p.y < -8)  p.y = H + 8;
      if (p.y > H+8) p.y = -8;
    }

    // Connection lines — brighter, depth-weighted, fade near globe
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      const fadeA = globeFade(a.x, a.y);
      for (let j = i + 1; j < particles.length; j++) {
        const b  = particles[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dSq = dx * dx + dy * dy;
        if (dSq < CONN * CONN) {
          const lineFade = Math.min(fadeA, globeFade(b.x, b.y));
          if (lineFade < 0.01) continue;
          const t   = 1 - Math.sqrt(dSq) / CONN;
          const dep = Math.min(a.depth, b.depth);
          const cr  = (a.color[0] + b.color[0]) >> 1;
          const cg  = (a.color[1] + b.color[1]) >> 1;
          const cb  = (a.color[2] + b.color[2]) >> 1;
          ctx.lineWidth = 0.45 + dep * 0.35;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = 'rgba(' + cr + ',' + cg + ',' + cb + ','
                           + (t * t * (0.12 + dep * 0.18) * lineFade) + ')';
          ctx.stroke();
        }
      }
    }

    // Particles — 3 visual tiers: far / mid / near+glow
    for (const p of particles) {
      const fade = globeFade(p.x, p.y);
      if (fade < 0.005) continue;
      let r = p.size;
      let a = p.opacity * fade;

      if (p.isNear) {
        // Slow shimmer on near particles only
        const sh = 1 + 0.14 * Math.sin(p.pulse);
        r *= sh; a *= sh;

        // Soft neon glow (Dimensional Layering principle)
        const glowR = r * 3.8;
        const grd   = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glowR);
        grd.addColorStop(0,   'rgba(' + p.color[0] + ',' + p.color[1] + ',' + p.color[2] + ',' + (a * 0.50) + ')');
        grd.addColorStop(0.38,'rgba(' + p.color[0] + ',' + p.color[1] + ',' + p.color[2] + ',' + (a * 0.08) + ')');
        grd.addColorStop(1,   'rgba(' + p.color[0] + ',' + p.color[1] + ',' + p.color[2] + ',0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(p.x, p.y, glowR, 0, 6.28);
        ctx.fill();
      }

      // Core shape — circle / velocity-dash / diamond
      const col = 'rgba(' + p.color[0] + ',' + p.color[1] + ',' + p.color[2] + ',' + a + ')';
      if (p.shape === 'dash') {
        const moveAngle = Math.atan2(p.vy, p.vx);
        const halfLen   = r * 1.7;   // was 2.6
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(moveAngle);
        ctx.beginPath();
        ctx.moveTo(-halfLen, 0);
        ctx.lineTo(halfLen, 0);
        ctx.lineWidth   = r * 0.52;  // was 0.80
        ctx.lineCap     = 'round';
        ctx.strokeStyle = col;
        ctx.stroke();
        ctx.restore();
      } else if (p.shape === 'diamond') {
        const d = r * 1.25;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.beginPath();
        ctx.moveTo(0, -d);
        ctx.lineTo(d, 0);
        ctx.lineTo(0, d);
        ctx.lineTo(-d, 0);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.62, 0, 6.28);  // circles smaller
        ctx.fillStyle = col;
        ctx.fill();
      }
    }

    raf = requestAnimationFrame(draw);
  }

  init();
  raf = requestAnimationFrame(draw);

  window.addEventListener('resize', () => {
    cancelAnimationFrame(raf);
    init();
    raf = requestAnimationFrame(draw);
  });
}());

/* ===== 14. Hero Text Entrance Animation ===== */
(function () {
  'use strict';
  if (typeof gsap === 'undefined') return;

  const line1   = document.querySelector('.hero__title-line1');
  const accent  = document.querySelector('.hero__title-accent');
  const sub     = document.querySelector('.hero__subtitle');
  const actions = document.querySelector('.hero__actions');
  const badges  = document.querySelectorAll('.hero__badges li');
  const globe   = document.querySelector('.hero__visual');

  if (!line1) return;

  gsap.set(line1,   { opacity: 0, y: 34 });
  gsap.set(accent,  { opacity: 0, y: 34 });
  gsap.set(sub,     { opacity: 0, y: 22 });
  gsap.set(actions, { opacity: 0, y: 18 });
  gsap.set(badges,  { opacity: 0, y: 12 });
  gsap.set(globe,   { opacity: 0 });

  const tl = gsap.timeline({ delay: 0.1 });

  tl
    .to(line1,   { opacity: 1, y: 0, duration: 0.72, ease: 'power3.out' })
    .to(accent,  { opacity: 1, y: 0, duration: 0.68, ease: 'power3.out' }, '-=0.42')
    .to(sub,     { opacity: 1, y: 0, duration: 0.58, ease: 'power2.out' }, '-=0.28')
    .to(actions, { opacity: 1, y: 0, duration: 0.52, ease: 'power2.out' }, '-=0.24')
    .to(badges,  { opacity: 1, y: 0, duration: 0.42, ease: 'power2.out', stagger: 0.08 }, '-=0.20')
    .to(globe,   { opacity: 1, duration: 1.1, ease: 'power2.out' }, 0.12);
}());
