// =========================================================
// main.js — Cerebro del SPA (router, PIP, header, search)
// =========================================================
import * as feed from './feed.js';
import * as watch from './watch.js';
import * as embed from './embed.js';
import * as share from './share.js';
import { getPage } from './pages.js';
import { todasLasCategorias, buscar, episodiosPorCategoria } from './utilidades.js';
import { pushSearch } from './memoria.js';
import { escapeHtml, escapeAttr } from './feed.js';

const container = document.getElementById('app-container');
const pip = document.getElementById('pip-player');

let currentView = null;       // { module, ctx }
let currentPlayer = null;     // referencia al reproductor activo
let pipState = null;          // { episodio, queue, queueIndex, currentTime }

// =========================================================
// Router
// =========================================================
function navigate(url, opts = {}) {
  if (!url) return;
  // si es URL absoluta del mismo origen, normaliza
  if (url.startsWith(location.origin)) url = url.slice(location.origin.length);
  if (!url.startsWith('/')) url = '/' + url;

  if (url === location.pathname + location.search) {
    return; // misma URL
  }

  // ¿salimos de un episodio para ir a otro? -> minimizar a PIP el actual
  if (currentPlayer && currentView?.kind === 'watch') {
    minimizeToPip(currentPlayer.episodio);
  }

  if (!opts.replace) history.pushState({}, '', url);
  else history.replaceState({}, '', url);
  resolveAndRender(url);
}

function resolveAndRender(pathname) {
  pathname = pathname.replace(/\/+$/, '') || '/';

  // Cleanup vista anterior
  if (currentView?.module?.teardown) try { currentView.module.teardown(); } catch {}
  document.body.classList.remove('embed-mode');
  currentPlayer = null;

  // ---- /embed/... ----
  if (pathname.startsWith('/embed')) {
    const ctx = embed.resolve(pathname);
    if (!ctx) return notFound();
    ctx.navigate = navigate;
    ctx.registerPlayer = registerPlayer;
    ctx.minimizeToPip = minimizeToPip;
    embed.render(container, ctx);
    currentView = { module: embed, ctx, kind: 'embed' };
    applyMeta(embed.meta(ctx));
    return;
  }

  // ---- /share/... (servidor inyecta meta; cliente render normal) ----
  if (pathname.startsWith('/share')) {
    const ctx = share.resolve(pathname);
    if (!ctx) return notFound();
    ctx.navigate = navigate;
    ctx.registerPlayer = registerPlayer;
    ctx.minimizeToPip = minimizeToPip;
    share.render(container, ctx);
    currentView = { module: share, ctx, kind: 'share' };
    applyMeta(share.meta(ctx));
    return;
  }

  // ---- Páginas especiales ----
  const page = getPage(pathname);
  if (page) {
    const ctx = { navigate };
    page.render(container, ctx);
    currentView = { module: page, ctx, kind: 'page' };
    applyMeta(page.meta);
    setActiveNav(pathname);
    return;
  }

  // ---- /categoria/:cat ----
  const catMatch = pathname.match(/^\/categoria\/(.+)$/);
  if (catMatch) {
    const cat = decodeURIComponent(catMatch[1]);
    renderCategoria(cat);
    return;
  }

  // ---- /buscar?q=... ----
  if (pathname === '/buscar') {
    const q = new URLSearchParams(location.search).get('q') || '';
    renderBusqueda(q);
    return;
  }

  // ---- / (feed) ----
  if (pathname === '/' || pathname === '') {
    const ctx = { navigate };
    feed.render(container, ctx);
    currentView = { module: feed, ctx, kind: 'feed' };
    applyMeta(feed.meta);
    setActiveNav('/');
    return;
  }

  // ---- watch (episodio o serie) ----
  const wctx = watch.resolveFromUrl(pathname);
  if (wctx) {
    wctx.navigate = navigate;
    wctx.registerPlayer = registerPlayer;
    wctx.minimizeToPip = minimizeToPip;
    watch.render(container, wctx);
    currentView = { module: watch, ctx: wctx, kind: 'watch' };
    applyMeta(watch.meta(wctx));
    hidePip(); // estamos viendo el episodio en grande
    return;
  }

  notFound();
}

function notFound() {
  container.innerHTML = `<div class="empty"><h1>404</h1><p>No encontramos esa página.</p><a href="/" data-link style="color:#ff2d55;">← Volver al inicio</a></div>`;
  applyMeta({ title: '404 — NikichitonJesús TV' });
}

function renderCategoria(cat) {
  const eps = episodiosPorCategoria(cat);
  container.innerHTML = `
    <div class="feed">
      <h1 style="padding:24px 20px 0;margin:0;">Categoría: ${escapeHtml(cat)}</h1>
      <section class="feed-section" style="padding:0 20px;">
        ${eps.length ? `<div class="feed-grid" style="margin-top:14px;">
          ${eps.map(ep => `<article class="ep-card" data-link="${escapeAttr(ep.detailUrl)}">
            <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')"></div>
            <div class="body"><div class="title">${escapeHtml(ep.title)}</div><div class="meta">${escapeHtml(ep.author||'')}</div></div>
          </article>`).join('')}
        </div>` : `<p class="empty">No hay episodios en esta categoría.</p>`}
      </section>
    </div>`;
  container.querySelectorAll('[data-link]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.link)));
  applyMeta({ title: `${cat} — NikichitonJesús TV` });
}

function renderBusqueda(q) {
  const res = q ? buscar(q) : [];
  if (q) pushSearch(q);
  container.innerHTML = `
    <div class="feed">
      <h1 style="padding:24px 20px 0;margin:0;">🔎 ${escapeHtml(q || 'Buscar')}</h1>
      <section class="feed-section" style="padding:0 20px;">
        ${res.length ? `<div class="feed-grid" style="margin-top:14px;">
          ${res.map(ep => `<article class="ep-card" data-link="${escapeAttr(ep.detailUrl)}">
            <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')"></div>
            <div class="body"><div class="title">${escapeHtml(ep.title)}</div><div class="meta">${escapeHtml(ep.author||'')}</div></div>
          </article>`).join('')}
        </div>` : `<p class="empty">${q ? 'Sin resultados.' : 'Escribe algo para buscar.'}</p>`}
      </section>
    </div>`;
  container.querySelectorAll('[data-link]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.link)));
  applyMeta({ title: `Buscar: ${q} — NikichitonJesús TV` });
}

// =========================================================
// Meta tags dinámicos
// =========================================================
function applyMeta({ title, description, image } = {}) {
  if (title) document.title = title;
  setMeta('description', description);
  setMeta('og:title', title, true);
  setMeta('og:description', description, true);
  if (image) setMeta('og:image', image, true);
  setMeta('og:url', location.href, true);
}
function setMeta(name, value, og = false) {
  if (!value) return;
  const sel = og ? `meta[property="${name}"]` : `meta[name="${name}"]`;
  let el = document.querySelector(sel);
  if (!el) {
    el = document.createElement('meta');
    if (og) el.setAttribute('property', name); else el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', value);
}

// =========================================================
// PIP (reproductor minimizado)
// =========================================================
function registerPlayer(p) {
  currentPlayer = p;
  // Si veníamos de PIP del mismo episodio, restaurar tiempo
  if (pipState && pipState.episodio.id === p.episodio.id) {
    p.media.addEventListener('loadedmetadata', () => {
      try { p.media.currentTime = pipState.currentTime || 0; } catch {}
    }, { once: true });
    pipState = null;
  }
  hidePip();
}

function minimizeToPip(ep) {
  if (!currentPlayer || currentPlayer.episodio.id !== ep.id) return;
  pipState = {
    episodio: ep,
    currentTime: currentPlayer.media.currentTime,
    queue: currentPlayer.queue,
    queueIndex: currentPlayer.queueIndex
  };
  showPip(ep);
}

function showPip(ep) {
  pip.querySelector('.pip-thumb').style.backgroundImage = `url('${ep.coverUrl}')`;
  pip.querySelector('.pip-title').textContent = ep.title;
  pip.querySelector('.pip-author').textContent = ep.author || '';
  pip.classList.remove('hidden');

  // re-bind controles
  pip.querySelectorAll('[data-pip-action]').forEach(b => {
    b.onclick = () => {
      const act = b.dataset.pipAction;
      if (act === 'expand') navigate(ep.detailUrl);
      else if (act === 'close') { hidePip(); pipState = null; }
      else if (act === 'toggle') {
        // No hay media activa en PIP en esta versión simplificada (audio-only persistente requería refactor mayor)
        // Reanudar -> ir al watch
        navigate(ep.detailUrl);
      } else if (act === 'next' && pipState?.queue && pipState.queueIndex < pipState.queue.length - 1) {
        navigate(pipState.queue[pipState.queueIndex + 1].detailUrl);
      } else if (act === 'prev' && pipState?.queue && pipState.queueIndex > 0) {
        navigate(pipState.queue[pipState.queueIndex - 1].detailUrl);
      }
    };
  });
}
function hidePip() { pip.classList.add('hidden'); }

// =========================================================
// Header: navegación, búsqueda, categorías
// =========================================================
function setupHeader() {
  // links data-link y nav
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-link]');
    if (a) {
      const href = a.getAttribute('href');
      if (href && href.startsWith('/')) {
        e.preventDefault();
        navigate(href);
      }
    }
  });

  // search
  const input = document.getElementById('global-search');
  let t = null;
  input.addEventListener('input', () => {
    clearTimeout(t);
    const v = input.value.trim();
    t = setTimeout(() => {
      if (v) navigate(`/buscar?q=${encodeURIComponent(v)}`);
    }, 350);
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value.trim();
      if (v) navigate(`/buscar?q=${encodeURIComponent(v)}`);
    }
  });

  // categorías
  const bar = document.getElementById('categories-bar');
  const cats = todasLasCategorias().slice(0, 16);
  bar.innerHTML = `<button class="cat-chip active" data-cat="">Todas</button>` +
    cats.map(c => `<button class="cat-chip" data-cat="${escapeAttr(c.name)}">${escapeHtml(c.name)} <span style="opacity:.6;">${c.count}</span></button>`).join('');
  bar.querySelectorAll('[data-cat]').forEach(b => {
    b.addEventListener('click', () => {
      bar.querySelectorAll('.cat-chip').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      const cat = b.dataset.cat;
      if (!cat) navigate('/');
      else navigate('/categoria/' + encodeURIComponent(cat));
    });
  });
}

function setActiveNav(path) {
  document.querySelectorAll('.main-nav a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === path);
  });
}

// =========================================================
// Boot
// =========================================================
window.addEventListener('popstate', () => resolveAndRender(location.pathname));
setupHeader();
resolveAndRender(location.pathname);

// Exponer para debug / pages
window.__niki = { navigate };
