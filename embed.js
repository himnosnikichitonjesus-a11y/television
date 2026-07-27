// =============================================================
// embed.js — Reproductor incrustable (iframe / div)
// Totalmente autónomo: estilos, iconos y lógica propios.
// Ocupa 100% del contenedor. Controles con toggle por clic.
// =============================================================

import {
  getEpisodioById,
  getEpisodioByDetailUrl,
  getSerieByUrl,
  getEpisodiosBySerieId,
  getSerieById
} from './episodios.js';
import { formatTime } from './utilidades.js';
import { saveProgress, getProgress, trackView } from './memoria.js';
import { escapeHtml, escapeAttr } from './feed.js';

// ========== ICONOS ==========
const ICONS = {
  play:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  prev:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  next:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>',
  vol:      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.04v7.92A4.5 4.5 0 0 0 16.5 12z"/></svg>',
  mute:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  full:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  fullExit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  mode:     '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 6h13v10H4z" opacity=".35"/><path d="M18 8l4-2v12l-4-2z"/></svg>'
};
const IMG_ICONS = {
  back10: '<img src="https://video-nikichitonjesus.odoo.com/web/image/438-deea748f/-10.webp" alt="-10">',
  fwd10:  '<img src="https://video-nikichitonjesus.odoo.com/web/image/439-9448d521/%2B10.webp" alt="+10">'
};

// ========== ESTADO GLOBAL ==========
let active = null;

// ========== ESTILOS ==========
function injectEmbedStyles() {
  if (document.getElementById('nk-embed-styles')) return;
  const style = document.createElement('style');
  style.id = 'nk-embed-styles';
  style.textContent = `
    html, body {
      margin: 0; padding: 0;
      width: 100%; height: 100%;
      background: #000;
      -webkit-tap-highlight-color: transparent;
      -webkit-font-smoothing: antialiased;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    body.embed-mode {
      overflow: hidden;
      height: 100dvh;
    }
    body.embed-mode #app,
    body.embed-mode [data-app-root] {
      height: 100dvh;
    }

    .nk-embed {
      position: fixed;
      inset: 0;
      width: 100%;
      height: 100dvh;
      background: #000;
      color: #fff;
      display: flex;
      overflow: hidden;
      user-select: none;
    }
    .nk-embed * { box-sizing: border-box; }

    .nk-embed-stage {
      position: relative;
      flex: 1;
      background: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .nk-embed-media {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    .nk-embed-media video,
    .nk-embed-media audio {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      background: #000;
      display: block;
    }
    .nk-embed-media audio { height: 0; opacity: 0; pointer-events: none; }

    .nk-embed-cover {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at center, rgba(30,30,40,.6), #000 70%);
    }
    .nk-embed-cover img {
      width: min(55vmin, 320px);
      height: min(55vmin, 320px);
      object-fit: cover;
      border-radius: 16px;
      box-shadow: 0 20px 60px -10px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06);
      animation: nk-cover-float 6s ease-in-out infinite;
    }
    @keyframes nk-cover-float {
      0%,100% { transform: translateY(0) scale(1); }
      50%     { transform: translateY(-6px) scale(1.015); }
    }

    /* Header */
    .nk-embed-header {
      position: absolute;
      top: 0; left: 0; right: 0;
      padding: 14px 18px;
      display: flex; align-items: center; gap: 12px;
      background: linear-gradient(180deg, rgba(0,0,0,.75), transparent);
      z-index: 20;
      pointer-events: none;
      transition: opacity .35s ease;
    }
    .nk-embed-header img.logo {
      height: clamp(22px, 4vw, 36px);
      width: auto;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.6));
    }
    .nk-embed-header .title {
      font-size: clamp(12px, 2.2vw, 16px);
      font-weight: 600;
      letter-spacing: .01em;
      text-shadow: 0 1px 3px rgba(0,0,0,.9);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      min-width: 0;
      flex: 1;
    }

    /* Centro: play + skip */
    .nk-embed-center {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: clamp(20px, 8vw, 56px);
      z-index: 15;
      pointer-events: none;
      transition: opacity .35s ease;
    }
    .nk-embed-center button {
      pointer-events: auto;
      background: rgba(0,0,0,.35);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,.12);
      color: #fff;
      border-radius: 999px;
      width: clamp(46px, 11vmin, 64px);
      height: clamp(46px, 11vmin, 64px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform .15s ease, background .2s ease, border-color .2s ease;
      padding: 0;
    }
    .nk-embed-center button.main {
      width: clamp(60px, 15vmin, 88px);
      height: clamp(60px, 15vmin, 88px);
      background: rgba(255,255,255,.14);
      border-color: rgba(255,255,255,.28);
    }
    .nk-embed-center button:hover { transform: scale(1.06); background: rgba(255,255,255,.18); }
    .nk-embed-center button:active { transform: scale(.94); }
    .nk-embed-center svg,
    .nk-embed-center img {
      width: 52%; height: 52%;
      object-fit: contain;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,.7));
    }

    /* Controles inferiores */
    .nk-embed-bar {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      padding: 26px 14px 10px;
      background: linear-gradient(0deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,.55) 55%, transparent 100%);
      z-index: 20;
      transition: opacity .35s ease, transform .35s ease;
    }

    .nk-embed-seek {
      position: relative;
      height: 18px;
      margin-bottom: 6px;
      cursor: pointer;
      display: flex; align-items: center;
    }
    .nk-embed-seek-track {
      position: relative;
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,.22);
      border-radius: 4px;
      overflow: visible;
      transition: height .15s ease;
    }
    .nk-embed-seek:hover .nk-embed-seek-track { height: 6px; }
    .nk-embed-seek-buffer,
    .nk-embed-seek-fill {
      position: absolute; top: 0; left: 0; height: 100%;
      border-radius: 4px;
      pointer-events: none;
    }
    .nk-embed-seek-buffer { background: rgba(255,255,255,.32); width: 0; }
    .nk-embed-seek-fill { background: linear-gradient(90deg, #ff2d55, #ff5e3a); width: 0; z-index: 1; }
    .nk-embed-seek-thumb {
      position: absolute;
      top: 50%;
      width: 14px; height: 14px;
      background: #fff;
      border-radius: 50%;
      transform: translate(-50%, -50%) scale(0);
      transition: transform .15s ease;
      pointer-events: none;
      z-index: 2;
      box-shadow: 0 2px 8px rgba(0,0,0,.5);
      left: 0;
    }
    .nk-embed-seek:hover .nk-embed-seek-thumb { transform: translate(-50%,-50%) scale(1); }
    .nk-embed-seek input[type="range"] {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      opacity: 0; cursor: pointer;
      margin: 0;
    }

    .nk-embed-row {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .nk-embed-btn {
      background: transparent;
      border: none;
      color: #fff;
      width: 38px; height: 38px;
      padding: 8px;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: background .2s ease, transform .15s ease;
    }
    .nk-embed-btn:hover { background: rgba(255,255,255,.14); }
    .nk-embed-btn:active { transform: scale(.9); }
    .nk-embed-btn:disabled { opacity: .35; cursor: default; }
    .nk-embed-btn svg,
    .nk-embed-btn img { width: 100%; height: 100%; object-fit: contain; }

    .nk-embed-vol {
      display: flex; align-items: center; gap: 4px;
      min-width: 0;
    }
    .nk-embed-vol input[type="range"] {
      width: 0;
      overflow: hidden;
      opacity: 0;
      transition: width .25s ease, opacity .25s ease;
      accent-color: #ff2d55;
    }
    .nk-embed-vol:hover input[type="range"],
    .nk-embed-vol:focus-within input[type="range"] {
      width: 70px;
      opacity: 1;
    }

    .nk-embed-time {
      font-size: 12px;
      font-variant-numeric: tabular-nums;
      color: rgba(255,255,255,.85);
      margin: 0 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .nk-embed-spacer { flex: 1; min-width: 0; }

    /* Menú */
    .nk-embed-menu {
      position: relative;
    }
    .nk-embed-menu-pop {
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      min-width: 140px;
      background: rgba(20,20,24,.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px;
      padding: 6px;
      display: none;
      flex-direction: column;
      z-index: 30;
      box-shadow: 0 10px 30px rgba(0,0,0,.6);
    }
    .nk-embed-menu-pop.open { display: flex; }
    .nk-embed-menu-pop .sec {
      font-size: 11px;
      color: rgba(255,255,255,.5);
      text-transform: uppercase;
      letter-spacing: .08em;
      padding: 6px 10px 4px;
    }
    .nk-embed-menu-pop button {
      background: transparent;
      border: none;
      color: #fff;
      text-align: left;
      padding: 8px 10px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }
    .nk-embed-menu-pop button:hover { background: rgba(255,255,255,.08); }
    .nk-embed-menu-pop button.active { color: #ff5e3a; }

    /* Estado oculto */
    .nk-hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .nk-embed-bar.nk-hidden { transform: translateY(6px); }

    /* Cursor idle */
    .nk-embed.idle,
    .nk-embed.idle * { cursor: none !important; }

    /* Loading / error */
    .nk-embed-status {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: rgba(255,255,255,.75);
      font-size: 14px;
      z-index: 25;
      pointer-events: none;
      background: rgba(0,0,0,.4);
    }
    .nk-embed-spinner {
      width: 36px; height: 36px;
      border: 3px solid rgba(255,255,255,.2);
      border-top-color: #ff2d55;
      border-radius: 50%;
      animation: nk-spin .8s linear infinite;
    }
    @keyframes nk-spin { to { transform: rotate(360deg); } }

    /* Responsive */
    @media (max-width: 640px) {
      .nk-embed-bar { padding: 22px 10px 8px; }
      .nk-embed-btn { width: 34px; height: 34px; padding: 7px; }
      .nk-embed-time { font-size: 11px; margin: 0 4px; }
      .nk-embed-header { padding: 10px 12px; }
      .nk-embed-vol input[type="range"] { display: none; }
      .nk-embed-btn.hide-sm { display: none; }
    }
    @media (max-width: 380px) {
      .nk-embed-btn.hide-xs { display: none; }
    }
  `;
  document.head.appendChild(style);
}

// ========== META / ROUTING ==========
export const meta = (ctx) => {
  const ep = ctx?.episodio;
  return ep
    ? { title: `${ep.title} — Reproductor`, description: ep.description, image: ep.coverUrl }
    : { title: 'Reproductor — NikichitonJesús TV' };
};

export function resolve(pathname) {
  const inner = pathname.replace(/^\/embed/, '') || '/';
  return resolveFromUrl(inner);
}

function resolveFromUrl(pathname) {
  const epDirect = pathname.match(/^\/episodio\/([^\/]+)\/?$/);
  if (epDirect) {
    const ep = getEpisodioById(epDirect[1]);
    if (ep) return buildContext(ep);
  }
  const serie = getSerieByUrl(pathname);
  if (serie) {
    const queue = getEpisodiosBySerieId(serie.seriesid);
    if (queue.length) return { episodio: queue[0], queue, queueIndex: 0, serie };
  }
  const ep = getEpisodioByDetailUrl(pathname);
  if (ep) return buildContext(ep);
  return null;
}

function buildContext(ep) {
  const serie = ep.seriesid ? getSerieById(ep.seriesid) : null;
  const queue = serie ? getEpisodiosBySerieId(serie.seriesid) : [ep];
  const queueIndex = Math.max(0, queue.findIndex((x) => x.id === ep.id));
  return { episodio: ep, queue, queueIndex, serie };
}

// ========== LIMPIEZA GLOBAL (para evitar doble reproducción) ==========
function destroyMedia(el) {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute('src');
    // Vaciar <source> hijos si existen
    while (el.firstChild) el.removeChild(el.firstChild);
    el.load();
  } catch {}
  try { el.remove(); } catch {}
}

function killAnyLingeringMedia(exceptEl) {
  // Barrido defensivo: pausa y libera cualquier <video>/<audio> huérfano en la página.
  document.querySelectorAll('video, audio').forEach((el) => {
    if (el === exceptEl) return;
    destroyMedia(el);
  });
}

// ========== RENDER ==========
export function render(container, ctx) {
  // 1. Teardown de instancia previa antes de nada
  if (active) {
    try { active._cleanup?.(); } catch {}
    destroyMedia(active.media);
    active = null;
  }
  killAnyLingeringMedia();

  injectEmbedStyles();
  document.body.classList.add('embed-mode');

  const { episodio, queue, queueIndex } = ctx;
  const reclaim = ctx.reclaimPipMedia?.(episodio);
  const initialMode = reclaim
    ? (reclaim.tagName === 'VIDEO' ? 'video' : 'audio')
    : (episodio.hasVideo && episodio.initialMode !== 'audio' ? 'video' : 'audio');
  const canSwitch = episodio.hasVideo && episodio.hasAudio;
  const hasQueue = queue.length > 1;

  container.innerHTML = `
    <div class="nk-embed" id="nk-embed" data-mode="${initialMode}">
      <div class="nk-embed-stage" id="nk-stage">

        <div class="nk-embed-media" id="nk-media-host"></div>

        <div class="nk-embed-header" id="nk-header">
          <img class="logo" src="https://nikichitonjesus.odoo.com/web/image/1668-134717bf/Comp%20Logo%20con%20fondo.svg" alt="">
          <span class="title">${escapeHtml(episodio.title)}</span>
        </div>

        <div class="nk-embed-status" id="nk-status">
          <div class="nk-embed-spinner"></div>
        </div>

        <div class="nk-embed-center" id="nk-center">
          <button class="nk-embed-btn-center" data-act="back10" aria-label="Retroceder 10s">${IMG_ICONS.back10}</button>
          <button class="nk-embed-btn-center main" data-act="toggle" aria-label="Play/Pause">${ICONS.play}</button>
          <button class="nk-embed-btn-center" data-act="fwd10" aria-label="Avanzar 10s">${IMG_ICONS.fwd10}</button>
        </div>

        <div class="nk-embed-bar" id="nk-bar">
          <div class="nk-embed-seek" id="nk-seek">
            <div class="nk-embed-seek-track">
              <div class="nk-embed-seek-buffer" id="nk-seek-buffer"></div>
              <div class="nk-embed-seek-fill" id="nk-seek-fill"></div>
              <div class="nk-embed-seek-thumb" id="nk-seek-thumb"></div>
            </div>
            <input type="range" min="0" max="1000" step="1" value="0" id="nk-seek-input" aria-label="Progreso"/>
          </div>
          <div class="nk-embed-row">
            <button class="nk-embed-btn" data-act="toggle" id="nk-toggle" aria-label="Play/Pause">${ICONS.play}</button>
            <button class="nk-embed-btn hide-xs" data-act="prev" ${hasQueue ? '' : 'disabled'} aria-label="Anterior">${ICONS.prev}</button>
            <button class="nk-embed-btn hide-xs" data-act="next" ${hasQueue ? '' : 'disabled'} aria-label="Siguiente">${ICONS.next}</button>
            <div class="nk-embed-vol">
              <button class="nk-embed-btn" data-act="mute" id="nk-mute" aria-label="Silenciar">${ICONS.vol}</button>
              <input type="range" min="0" max="1" step="0.01" value="1" id="nk-vol" aria-label="Volumen"/>
            </div>
            <div class="nk-embed-time"><span id="nk-tc">0:00</span> / <span id="nk-tt">0:00</span></div>
            <div class="nk-embed-spacer"></div>
            ${canSwitch ? `<button class="nk-embed-btn hide-sm" data-act="switch-mode" id="nk-mode" aria-label="Cambiar audio/video">${ICONS.mode}</button>` : ''}
            <div class="nk-embed-menu">
              <button class="nk-embed-btn" data-act="menu" aria-label="Opciones">
                <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
              </button>
              <div class="nk-embed-menu-pop" id="nk-menu">
                <div class="sec">Velocidad</div>
                <button data-rate="0.5">0.5x</button>
                <button data-rate="0.75">0.75x</button>
                <button data-rate="1" class="active">Normal</button>
                <button data-rate="1.25">1.25x</button>
                <button data-rate="1.5">1.5x</button>
                <button data-rate="2">2x</button>
              </div>
            </div>
            <button class="nk-embed-btn" data-act="fullscreen" id="nk-full" aria-label="Pantalla completa">${ICONS.full}</button>
          </div>
        </div>

      </div>
    </div>
  `;

  const host = container.querySelector('#nk-media-host');
  const media = reclaim || createMediaElement(initialMode, episodio);
  mountMedia(host, media, initialMode, episodio);

  active = { episodio, container, ctx, queue, queueIndex, media };
  setupPlayer(container, media, episodio, queue, queueIndex, ctx, initialMode);
  trackView(episodio);
}

function mountMedia(host, media, mode, ep) {
  host.innerHTML = '';
  if (mode === 'audio') {
    const cover = document.createElement('div');
    cover.className = 'nk-embed-cover';
    cover.innerHTML = `<img src="${escapeAttr(ep.coverUrl)}" alt="${escapeAttr(ep.title)}"/>`;
    host.appendChild(cover);
  }
  host.appendChild(media);
}

function createMediaElement(mode, ep) {
  const el = document.createElement(mode === 'video' ? 'video' : 'audio');
  el.id = 'nk-media';
  el.preload = 'metadata';
  el.playsInline = true;
  el.crossOrigin = 'anonymous';
  if (mode === 'video') el.poster = ep.coverUrl || '';
  setMediaSrc(el, ep, mode);
  return el;
}

function setMediaSrc(media, ep, mode) {
  if (mode === 'video' && ep.mediaVideo) media.src = ep.mediaVideo;
  else if (ep.mediaUrl) media.src = ep.mediaUrl;
  else if (ep.mediaVideo) media.src = ep.mediaVideo;
}

// ========== LÓGICA ==========
function setupPlayer(root, initialMedia, ep, queue, queueIndex, ctx, initialMode) {
  const embed = root.querySelector('#nk-embed');
  const stage = root.querySelector('#nk-stage');
  const header = root.querySelector('#nk-header');
  const center = root.querySelector('#nk-center');
  const bar = root.querySelector('#nk-bar');
  const status = root.querySelector('#nk-status');
  const seekWrap = root.querySelector('#nk-seek');
  const seekInput = root.querySelector('#nk-seek-input');
  const seekFill = root.querySelector('#nk-seek-fill');
  const seekBuf = root.querySelector('#nk-seek-buffer');
  const seekThumb = root.querySelector('#nk-seek-thumb');
  const tc = root.querySelector('#nk-tc');
  const tt = root.querySelector('#nk-tt');
  const btnToggle = root.querySelector('#nk-toggle');
  const btnMute = root.querySelector('#nk-mute');
  const vol = root.querySelector('#nk-vol');
  const menuPop = root.querySelector('#nk-menu');
  const btnFull = root.querySelector('#nk-full');
  const centerToggle = center.querySelector('[data-act="toggle"]');
  const btnMode = root.querySelector('#nk-mode');
  const host = root.querySelector('#nk-media-host');

  let media = initialMedia;
  let currentMode = initialMode;
  let seekingUser = false;
  let controlsVisible = true;
  let hideTimer = null;

  // ---- Controles: mostrar/ocultar ----
  const setControlsVisible = (v) => {
    controlsVisible = v;
    bar.classList.toggle('nk-hidden', !v);
    center.classList.toggle('nk-hidden', !v);
    header.classList.toggle('nk-hidden', !v);
    embed.classList.toggle('idle', !v);
  };
  const scheduleHide = () => {
    clearTimeout(hideTimer);
    if (media.paused) return;
    hideTimer = setTimeout(() => setControlsVisible(false), 2600);
  };
  const wake = () => {
    setControlsVisible(true);
    scheduleHide();
  };

  // Toggle por clic en el stage (no sobre controles)
  const onStageClick = (e) => {
    if (
      e.target.closest('.nk-embed-btn') ||
      e.target.closest('.nk-embed-btn-center') ||
      e.target.closest('.nk-embed-seek') ||
      e.target.closest('.nk-embed-menu') ||
      e.target.closest('.nk-embed-vol')
    ) return;
    setControlsVisible(!controlsVisible);
    if (controlsVisible) scheduleHide();
  };
  stage.addEventListener('click', onStageClick);
  stage.addEventListener('mousemove', wake);
  stage.addEventListener('touchstart', wake, { passive: true });

  // ---- Sincronizar iconos play/pause ----
  const syncToggle = () => {
    const icon = media.paused ? ICONS.play : ICONS.pause;
    if (btnToggle) btnToggle.innerHTML = icon;
    if (centerToggle) centerToggle.innerHTML = icon;
  };

  // ---- Estado de carga ----
  const hideStatus = () => { status.style.display = 'none'; };
  const showStatus = () => { status.style.display = 'flex'; status.innerHTML = '<div class="nk-embed-spinner"></div>'; };
  const showError = () => {
    status.style.display = 'flex';
    status.innerHTML = '<div style="text-align:center;padding:20px;">⚠️ No se pudo cargar el medio</div>';
  };

  // ---- Bindings del medio ----
  const bindMedia = (el) => {
    el.addEventListener('play',         onPlay);
    el.addEventListener('pause',        onPause);
    el.addEventListener('timeupdate',   onTime);
    el.addEventListener('progress',     onProgress);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended',        onEnded);
    el.addEventListener('volumechange', onVol);
    el.addEventListener('waiting',      showStatus);
    el.addEventListener('playing',      hideStatus);
    el.addEventListener('canplay',      hideStatus);
    el.addEventListener('error',        showError);
  };
  const unbindMedia = (el) => {
    el.removeEventListener('play',         onPlay);
    el.removeEventListener('pause',        onPause);
    el.removeEventListener('timeupdate',   onTime);
    el.removeEventListener('progress',     onProgress);
    el.removeEventListener('loadedmetadata', onMeta);
    el.removeEventListener('ended',        onEnded);
    el.removeEventListener('volumechange', onVol);
    el.removeEventListener('waiting',      showStatus);
    el.removeEventListener('playing',      hideStatus);
    el.removeEventListener('canplay',      hideStatus);
    el.removeEventListener('error',        showError);
  };

  function onPlay()  { syncToggle(); updateMediaSession(ep, media); hideStatus(); scheduleHide(); }
  function onPause() { syncToggle(); setControlsVisible(true); clearTimeout(hideTimer); }
  function onTime() {
    if (!media.duration || seekingUser) return;
    const pct = (media.currentTime / media.duration) * 100;
    seekFill.style.width = pct + '%';
    seekThumb.style.left = pct + '%';
    seekInput.value = pct * 10;
    tc.textContent = formatTime(media.currentTime);
    saveProgress(ep.id, media.currentTime, media.duration);
  }
  function onProgress() {
    if (!media.buffered.length || !media.duration) return;
    const end = media.buffered.end(media.buffered.length - 1);
    seekBuf.style.width = ((end / media.duration) * 100) + '%';
  }
  function onMeta() { tt.textContent = formatTime(media.duration); }
  function onEnded() {
    if (queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
  }
  function onVol() {
    if (btnMute) btnMute.innerHTML = (media.muted || media.volume === 0) ? ICONS.mute : ICONS.vol;
    vol.value = media.muted ? 0 : media.volume;
  }

  bindMedia(media);
  syncToggle();

  // Restaurar progreso
  const prog = getProgress(ep.id);
  if (prog && prog.duration && prog.progress < prog.duration - 5 && media.currentTime < 1) {
    const restore = () => { try { media.currentTime = prog.progress; } catch {} };
    if (media.readyState >= 1) restore();
    else media.addEventListener('loadedmetadata', restore, { once: true });
  }

  // Autoplay (con fallback a muted)
  const attemptPlay = () => {
    media.play().catch(() => {
      media.muted = true;
      if (btnMute) btnMute.innerHTML = ICONS.mute;
      media.play().catch(() => {});
    });
  };
  if (media.paused) {
    if (media.readyState >= 2) attemptPlay();
    else media.addEventListener('canplay', attemptPlay, { once: true });
  }

  // ---- Seek ----
  seekInput.addEventListener('input', () => {
    seekingUser = true;
    const pct = seekInput.value / 10;
    seekFill.style.width = pct + '%';
    seekThumb.style.left = pct + '%';
    if (media.duration) tc.textContent = formatTime((pct / 100) * media.duration);
  });
  seekInput.addEventListener('change', () => {
    if (media.duration) media.currentTime = (seekInput.value / 1000) * media.duration;
    seekingUser = false;
  });

  // ---- Volumen ----
  vol.value = media.muted ? 0 : media.volume;
  vol.addEventListener('input', () => {
    media.volume = parseFloat(vol.value);
    media.muted = media.volume === 0;
  });

  // ---- Cambio de modo audio<->video (SIN duplicar sonido) ----
  const switchMode = (newMode) => {
    if (newMode === currentMode) return;
    const t = media.currentTime;
    const wasPlaying = !media.paused;
    const v = media.volume;
    const muted = media.muted;

    // 1. Destruir el medio actual COMPLETAMENTE
    unbindMedia(media);
    destroyMedia(media);

    // 2. Barrer cualquier medio residual
    killAnyLingeringMedia();

    // 3. Crear y montar el nuevo
    const next = createMediaElement(newMode, ep);
    mountMedia(host, next, newMode, ep);
    next.volume = v;
    next.muted = muted;
    bindMedia(next);
    media = next;
    active.media = next;
    currentMode = newMode;
    embed.dataset.mode = newMode;

    next.addEventListener('loadedmetadata', () => {
      try { next.currentTime = t; } catch {}
      if (wasPlaying) next.play().catch(() => {});
    }, { once: true });
  };

  // ---- Botones ----
  const togglePlayPause = () => { media.paused ? media.play() : media.pause(); };

  root.querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      switch (act) {
        case 'toggle':      togglePlayPause(); break;
        case 'back10':      media.currentTime = Math.max(0, media.currentTime - 10); break;
        case 'fwd10':       media.currentTime = Math.min(media.duration || 0, media.currentTime + 10); break;
        case 'prev':        if (queueIndex > 0) ctx.navigate(queue[queueIndex - 1].detailUrl); break;
        case 'next':        if (queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl); break;
        case 'mute':        media.muted = !media.muted; break;
        case 'switch-mode': switchMode(currentMode === 'video' ? 'audio' : 'video'); break;
        case 'menu':        menuPop.classList.toggle('open'); break;
        case 'fullscreen':
          if (!document.fullscreenElement) embed.requestFullscreen?.();
          else document.exitFullscreen();
          break;
      }
      wake();
    });
  });

  // Rates
  root.querySelectorAll('[data-rate]').forEach((b) => {
    b.addEventListener('click', () => {
      media.playbackRate = parseFloat(b.dataset.rate);
      root.querySelectorAll('[data-rate]').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      menuPop.classList.remove('open');
    });
  });

  const outsideClose = (e) => {
    if (!e.target.closest('.nk-embed-menu')) menuPop.classList.remove('open');
  };
  document.addEventListener('click', outsideClose);

  document.addEventListener('fullscreenchange', () => {
    if (!btnFull) return;
    btnFull.innerHTML = document.fullscreenElement ? ICONS.fullExit : ICONS.full;
  });

  // Teclado
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space')       { e.preventDefault(); togglePlayPause(); }
    else if (e.code === 'ArrowLeft')  media.currentTime = Math.max(0, media.currentTime - 10);
    else if (e.code === 'ArrowRight') media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
    else if (e.key.toLowerCase() === 'm') media.muted = !media.muted;
    else if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) embed.requestFullscreen?.();
      else document.exitFullscreen();
    }
    wake();
  };
  document.addEventListener('keydown', onKey);

  // Subtítulos
  if (currentMode === 'video' && ep.subtitlesUrl && !media.querySelector('track')) {
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.src = ep.subtitlesUrl; tr.srclang = 'es'; tr.label = 'Español'; tr.default = true;
    media.appendChild(tr);
  }

  // Cleanup del reproductor
  active._cleanup = () => {
    clearTimeout(hideTimer);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', outsideClose);
    stage.removeEventListener('click', onStageClick);
    stage.removeEventListener('mousemove', wake);
    stage.removeEventListener('touchstart', wake);
    unbindMedia(media);
  };

  // Registro
  ctx.registerPlayer?.({
    media, episodio: ep, queue, queueIndex,
    get mode() { return currentMode; },
    play: () => media.play(),
    pause: () => media.pause(),
    isPaused: () => media.paused,
    next: () => queueIndex < queue.length - 1 && ctx.navigate(queue[queueIndex + 1].detailUrl),
    prev: () => queueIndex > 0 && ctx.navigate(queue[queueIndex - 1].detailUrl)
  });

  // Inicial: ocultar spinner cuando ya haya datos
  if (media.readyState >= 2) hideStatus();
}

// ========== MEDIA SESSION ==========
function updateMediaSession(ep, media) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ep.title, artist: ep.author || '', album: ep.seriesid || '',
      artwork: [{ src: ep.coverUrl, sizes: '512x512' }]
    });
    navigator.mediaSession.setActionHandler('play',  () => media.play());
    navigator.mediaSession.setActionHandler('pause', () => media.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => media.currentTime -= 10);
    navigator.mediaSession.setActionHandler('seekforward',  () => media.currentTime += 10);
  } catch {}
}

// ========== TEARDOWN ==========
export function teardown() {
  if (active) {
    try { active._cleanup?.(); } catch {}
    destroyMedia(active.media);
    active = null;
  }
  killAnyLingeringMedia();
  document.body.classList.remove('embed-mode');
}
