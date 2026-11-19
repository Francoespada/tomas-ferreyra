(function () {
  'use strict';

  var WA = '5491100000000'; // [PENDIENTE] WhatsApp real del tatuador
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Carga: fade up escalonado ---------- */
  // Arranca apenas está el DOM (no espera a todas las imágenes) para no demorar el LCP.
  function loaded() { document.body.classList.add('is-loaded'); }
  requestAnimationFrame(function () { requestAnimationFrame(loaded); });
  setTimeout(loaded, 250); // por si la pestaña está en segundo plano y no corre rAF

  /* ---------- Titulares divididos por palabra ---------- */
  $$('.js-split').forEach(function (el) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span'); w.className = 'w';
            var inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', i++);
            w.appendChild(inner); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') { walk(n); }
      });
    })(el);
  });

  /* ---------- Reveal al hacer scroll ---------- */
  var targets = $$('[data-reveal], .js-split');
  if ('IntersectionObserver' in window && !reduce) {
    // Los elementos recortados con clip-path no reportan intersección: se observa a su contenedor.
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        (e.target._revealKids || [e.target]).forEach(function (k) { k.classList.add('is-in'); });
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (t) {
      if (t.getAttribute('data-reveal') === 'clip') {
        var p = t.parentElement; (p._revealKids = p._revealKids || []).push(t); io.observe(p);
      } else io.observe(t);
    });
  } else {
    targets.forEach(function (t) { t.classList.add('is-in'); });
  }

  /* ---------- Contadores ---------- */
  var counters = $$('[data-count]');
  function fmt(v, dec) { return dec ? v.toFixed(dec).replace('.', ',') : Math.round(v).toLocaleString('es-AR'); }
  function runCount(el) {
    var end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), t0 = null, dur = 1600;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 4);
      el.textContent = fmt(end * e, dec);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  counters.forEach(function (el) { el.textContent = fmt(parseFloat(el.dataset.count), parseInt(el.dataset.dec || '0', 10)); });
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { runCount(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  }

  /* ---------- Header: sólido, se esconde al bajar ---------- */
  var header = $('[data-header]'), lastY = 0, ticking = false;
  var wordmark = $('[data-wordmark]'), parallax = $$('[data-parallax]');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    header.classList.toggle('is-hidden', y > 400 && y > lastY && !nav.classList.contains('is-open'));
    lastY = y;
    if (!reduce) {
      if (wordmark) {
        var r = wordmark.parentNode.getBoundingClientRect(), vh = window.innerHeight;
        if (r.bottom > 0 && r.top < vh) {
          var p = (vh - r.top) / (vh + r.height);
          wordmark.style.transform = 'translate3d(' + (-p * 32 + 4) + '%,0,0)';
        }
      }
      if (y < window.innerHeight * 1.2) {
        parallax.forEach(function (el) { el.style.translate = '0 ' + (y * parseFloat(el.dataset.parallax)).toFixed(1) + 'px'; });
      }
    }
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { requestAnimationFrame(onScroll); ticking = true; } }, { passive: true });

  /* ---------- Menú móvil ---------- */
  var nav = $('.nav'), menuBtn = $('[data-menu]');
  menuBtn.addEventListener('click', function () {
    var open = menuBtn.getAttribute('aria-expanded') !== 'true';
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.querySelector('.sr').textContent = open ? 'Cerrar menú' : 'Abrir menú';
    nav.classList.toggle('is-open', open);
  });
  $$('.nav a').forEach(function (a) { a.addEventListener('click', function () { if (nav.classList.contains('is-open')) menuBtn.click(); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { menuBtn.click(); menuBtn.focus(); } });
  onScroll();

  /* Enlace activo en el menú */
  if ('IntersectionObserver' in window) {
    var links = $$('.nav__list a');
    var sio = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (l) { if (l.getAttribute('href') === '#' + e.target.id) l.setAttribute('aria-current', 'true'); else l.removeAttribute('aria-current'); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(function (l) { var s = $(l.getAttribute('href')); if (s) sio.observe(s); });
  }

  /* ---------- Portfolio: filtro + lightbox ---------- */
  var items = $$('[data-gallery] .g');
  $$('[data-filter]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var f = chip.dataset.filter;
      $$('[data-filter]').forEach(function (c) { var on = c === chip; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', String(on)); });
      items.forEach(function (it) { it.classList.add('is-fading'); });
      setTimeout(function () {
        items.forEach(function (it, i) {
          var show = f === 'todo' || it.dataset.cat === f;
          it.classList.toggle('is-out', !show);
          if (show) setTimeout(function () { it.classList.remove('is-fading'); }, 40 + i * 45);
        });
      }, reduce ? 0 : 280);
    });
  });

  var lb = $('[data-lightbox]'), lbCap = $('[data-lbcap]'), lbImg = document.createElement('img');
  lbImg.decoding = 'async'; $('[data-lbmedia]').appendChild(lbImg);
  $$('.g__btn').forEach(function (btn) {
    btn.setAttribute('aria-label', 'Ampliar: ' + btn.querySelector('img').alt);
    btn.addEventListener('click', function () {
      var img = btn.querySelector('img');
      lbImg.src = btn.dataset.full; lbImg.alt = img.alt; lbCap.textContent = btn.querySelector('.g__cap').textContent;
      if (lb.showModal) lb.showModal(); else window.open(btn.dataset.full);
    });
  });
  $('[data-lbclose]').addEventListener('click', function () { lb.close(); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lb.close(); });

  /* ---------- Opiniones: slider ---------- */
  var track = $('[data-quotes]'), bar = $('[data-qbar]');
  function qUpdate() {
    var max = track.scrollWidth - track.clientWidth;
    var p = max > 0 ? track.scrollLeft / max : 1;
    bar.style.transform = 'scaleX(' + (0.2 + p * 0.8) + ')';
  }
  track.addEventListener('scroll', function () { requestAnimationFrame(qUpdate); }, { passive: true });
  $$('[data-q]').forEach(function (b) {
    b.addEventListener('click', function () {
      var card = track.querySelector('.quote');
      track.scrollBy({ left: parseInt(b.dataset.q, 10) * (card.offsetWidth + 16), behavior: reduce ? 'auto' : 'smooth' });
    });
  });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); $('[data-q="' + (e.key === 'ArrowRight' ? 1 : -1) + '"]').click(); }
  });
  qUpdate();

  /* =========================================================
     AGENDA DE TURNOS
     Horario: martes a sábado, 11 a 20 h. La ocupación es de
     demostración (determinística por fecha) + las reservas
     hechas en este navegador (localStorage).
     ========================================================= */
  var TYPES = [
    { id: 'consulta', n: 'Consulta y diseño', m: '30 min · sin cargo', h: 0.5, p: 'Gratis' },
    { id: 'chico', n: 'Pieza chica', m: 'Hasta 10 cm · 2 h', h: 2, p: 'Desde $90.000' },
    { id: 'mediano', n: 'Pieza mediana', m: '10 a 20 cm · 4 h', h: 4, p: 'Desde $180.000' },
    { id: 'sesion', n: 'Sesión completa', m: 'Manga o espalda · 6 h', h: 6, p: '$320.000 la sesión' }
  ];
  var OPEN = 11, CLOSE = 20, DAYS_OPEN = [2, 3, 4, 5, 6];
  var MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var WEEK = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var KEY = 'tf-reservas';

  var form = $('[data-booking]');
  var state = { type: null, date: null, time: null };
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var view = new Date(today.getFullYear(), today.getMonth(), 1);
  var maxView = new Date(today.getFullYear(), today.getMonth() + 2, 1);

  function store() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } }
  function save(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* sin storage */ } }
  function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; }

  // horas ocupadas de un día (en bloques de 30 min, índice desde OPEN)
  function busy(d) {
    var key = iso(d), blocks = {}, n = (CLOSE - OPEN) * 2;
    var r = hash(key);
    if (r > 0.86) { for (var k = 0; k < n; k++) blocks[k] = true; return blocks; } // día completo
    // una o dos sesiones ya tomadas
    var s1 = Math.floor(hash(key + 'a') * 10), len1 = 4 + Math.floor(hash(key + 'b') * 6);
    for (var j = s1; j < Math.min(n, s1 + len1); j++) blocks[j] = true;
    if (r > 0.5) { var s2 = Math.floor(hash(key + 'c') * n); for (var q = s2; q < Math.min(n, s2 + 4); q++) blocks[q] = true; }
    store().forEach(function (b) {
      if (b.date !== key) return;
      var st = (b.start - OPEN) * 2; for (var z = st; z < st + b.h * 2; z++) blocks[z] = true;
    });
    return blocks;
  }

  function slotsFor(d, hours) {
    var b = busy(d), out = [], need = Math.round(hours * 2), n = (CLOSE - OPEN) * 2;
    var step = hours >= 2 ? 2 : 1; // piezas largas arrancan en hora en punto
    for (var s = 0; s + need <= n; s += step) {
      var free = true;
      for (var k = s; k < s + need; k++) if (b[k]) { free = false; break; }
      out.push({ start: OPEN + s / 2, free: free });
    }
    return out;
  }

  function isOpenDay(d) { return d > today && DAYS_OPEN.indexOf(d.getDay()) > -1; }
  function hhmm(h) { var hh = Math.floor(h), mm = Math.round((h - hh) * 60); return String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0'); }
  function longDate(d) { return WEEK[d.getDay()] + ' ' + d.getDate() + ' de ' + MONTHS[d.getMonth()]; }
  function curType() { return TYPES.filter(function (t) { return t.id === state.type; })[0]; }

  // Tipos
  var typesEl = $('[data-types]');
  TYPES.forEach(function (t, i) {
    var w = document.createElement('div'); w.className = 'type';
    w.innerHTML = '<input type="radio" name="tipo" id="t-' + t.id + '" value="' + t.id + '"' + (i === 2 ? ' checked' : '') + '>' +
      '<label for="t-' + t.id + '"><span class="type__n">' + t.n + '</span><span class="type__m">' + t.m + '</span><span class="type__p">' + t.p + '</span></label>';
    typesEl.appendChild(w);
  });
  state.type = 'mediano';
  typesEl.addEventListener('change', function (e) {
    state.type = e.target.value; state.time = null;
    renderCal(); renderSlots(); summary();
  });

  // Calendario
  var daysEl = $('[data-days]'), monthLbl = $('[data-monthlabel]');
  var prevBtn = $('[data-month="-1"]'), nextBtn = $('[data-month="1"]');
  function renderCal() {
    var y = view.getFullYear(), m = view.getMonth();
    monthLbl.textContent = MONTHS[m] + ' ' + y;
    prevBtn.setAttribute('aria-disabled', String(view <= new Date(today.getFullYear(), today.getMonth(), 1)));
    nextBtn.setAttribute('aria-disabled', String(view >= maxView));
    daysEl.innerHTML = '';
    var first = (new Date(y, m, 1).getDay() + 6) % 7, total = new Date(y, m + 1, 0).getDate();
    for (var e = 0; e < first; e++) { var sp = document.createElement('span'); sp.className = 'day day--empty'; sp.setAttribute('aria-hidden', 'true'); daysEl.appendChild(sp); }
    var h = curType() ? curType().h : 4;
    for (var d = 1; d <= total; d++) {
      var date = new Date(y, m, d), btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'day'; btn.textContent = d; btn.style.setProperty('--i', d);
      var label = longDate(date), status = 'cerrado';
      if (+date === +today) btn.classList.add('day--today');
      if (isOpenDay(date)) {
        var free = slotsFor(date, h).filter(function (s) { return s.free; }).length;
        if (free === 0) { btn.disabled = true; status = 'completo'; }
        else if (free <= 2) { btn.classList.add('day--few'); status = 'pocos lugares'; }
        else { btn.classList.add('day--ok'); status = 'disponible'; }
      } else { btn.disabled = true; if (date <= today) status = 'no disponible'; }
      btn.setAttribute('aria-label', label + ', ' + status);
      btn.setAttribute('aria-pressed', String(!!state.date && +state.date === +date));
      btn.dataset.date = iso(date);
      daysEl.appendChild(btn);
    }
  }
  daysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.day'); if (!b || b.disabled) return;
    var p = b.dataset.date.split('-');
    state.date = new Date(+p[0], +p[1] - 1, +p[2]); state.time = null;
    $$('.day', daysEl).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    renderSlots(); summary();
    if (window.innerWidth < 900) $('.slots').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });
  $$('[data-month]').forEach(function (b) {
    b.addEventListener('click', function () { if (b.getAttribute('aria-disabled') === 'true') return; view = new Date(view.getFullYear(), view.getMonth() + parseInt(b.dataset.month, 10), 1); renderCal(); });
  });

  // Horarios
  var slotsEl = $('[data-slots]'), slotDate = $('[data-slotdate]');
  function renderSlots() {
    slotsEl.innerHTML = '';
    if (!state.date) { slotDate.textContent = 'Primero elegí un día en el calendario.'; return; }
    var t = curType();
    var list = slotsFor(state.date, t.h);
    slotDate.textContent = longDate(state.date).replace(/^./, function (c) { return c.toUpperCase(); }) + ' · ' + t.n.toLowerCase();
    var any = false;
    list.forEach(function (s, i) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'slot';
      b.textContent = hhmm(s.start); b.style.setProperty('--i', i); b.dataset.start = s.start;
      b.disabled = !s.free; if (s.free) any = true;
      b.setAttribute('aria-label', hhmm(s.start) + ' a ' + hhmm(s.start + t.h) + (s.free ? '' : ', ocupado'));
      b.setAttribute('aria-pressed', String(state.time === s.start));
      slotsEl.appendChild(b);
    });
    if (!any) {
      var p = document.createElement('p'); p.className = 'slots__empty';
      p.textContent = 'Ese día ya no tiene lugar para esta pieza. Probá con otro día o con una pieza más corta.';
      slotsEl.appendChild(p);
    }
  }
  slotsEl.addEventListener('click', function (e) {
    var b = e.target.closest('.slot'); if (!b || b.disabled) return;
    state.time = parseFloat(b.dataset.start);
    $$('.slot', slotsEl).forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    summary();
  });

  // Resumen y pasos
  var sumTxt = $('[data-sumtxt]'), formErr = $('[data-formerr]');
  function summary() {
    var t = curType(), parts = [t.n];
    if (state.date) parts.push(longDate(state.date));
    if (state.time != null) parts.push(hhmm(state.time) + ' a ' + hhmm(state.time + t.h) + ' h');
    sumTxt.textContent = parts.join(' · ');
    var step = state.time != null ? 4 : state.date ? 3 : 2;
    $$('[data-stepdot]').forEach(function (li) { li.classList.toggle('is-on', +li.dataset.stepdot <= step); });
    formErr.textContent = '';
  }

  function setErr(id, msg) {
    var input = $('#f-' + id), err = $('#e-' + id);
    err.textContent = msg;
    if (msg) { input.setAttribute('aria-invalid', 'true'); input.setAttribute('aria-describedby', 'e-' + id); }
    else { input.removeAttribute('aria-invalid'); input.removeAttribute('aria-describedby'); }
    return !msg;
  }
  ['nombre', 'zona'].forEach(function (id) { $('#f-' + id).addEventListener('input', function () { setErr(id, ''); }); });

  var done = $('[data-done]');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!state.date || state.time == null) {
      formErr.textContent = !state.date ? 'Elegí un día en el calendario.' : 'Elegí un horario para ese día.';
      (!state.date ? $('.day:not(:disabled)', daysEl) : $('.slot:not(:disabled)', slotsEl) || daysEl).focus();
      return;
    }
    var nombre = $('#f-nombre').value.trim(), zona = $('#f-zona').value, idea = $('#f-idea').value.trim();
    var ok1 = setErr('nombre', nombre.length < 3 ? 'Escribí tu nombre y apellido.' : '');
    var ok2 = setErr('zona', !zona ? 'Elegí la zona del cuerpo.' : '');
    if (!ok1) { $('#f-nombre').focus(); return; }
    if (!ok2) { $('#f-zona').focus(); return; }

    var t = curType();
    var code = 'TF-' + iso(state.date).slice(5).replace('-', '') + '-' + hhmm(state.time).replace(':', '');
    var list = store(); list.push({ date: iso(state.date), start: state.time, h: t.h, code: code }); save(list);

    var when = longDate(state.date) + ', de ' + hhmm(state.time) + ' a ' + hhmm(state.time + t.h) + ' h';
    var msg = 'Hola Tomás, soy ' + nombre + '. Quiero confirmar mi turno ' + code + ':\n' +
      '• ' + t.n + '\n• ' + when.charAt(0).toUpperCase() + when.slice(1) + '\n• Zona: ' + zona + (idea ? '\n• Idea: ' + idea : '');
    $('[data-code]').textContent = code;
    $('[data-donetxt]').textContent = t.n + ' · ' + when + '.';
    $('[data-wa]').href = 'https://wa.me/' + WA + '?text=' + encodeURIComponent(msg);
    form.hidden = true; done.hidden = false; done.focus();
  });

  $('[data-again]').addEventListener('click', function () {
    form.reset(); $('#t-mediano').checked = true;
    state = { type: 'mediano', date: null, time: null };
    done.hidden = true; form.hidden = false;
    renderCal(); renderSlots(); summary();
    $('#t-mediano').focus();
  });

  renderCal(); renderSlots(); summary();
})();
