// =============================================================
// watch.js — Reproductor principal (modo cine)
// SOLO para la vista normal. La lógica embed vive en embed.js.
// Diseño profesional, auto-ocultado por inactividad, sin
// duplicación de audio al cambiar de episodio o de modo.
// =============================================================

import {
  getEpisodioById, getEpisodioByDetailUrl, getSerieByUrl,
  getEpisodiosBySerieId, getSerieById
} from './episodios.js';
import { recomendar, formatTime } from './utilidades.js';
import {
  isLiked, toggleLike, saveProgress, getProgress, trackView
} from './memoria.js';
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
  pip:      '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H3V5h18v14z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.57-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.68.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.25 1.17-.57 1.69-.98l2.49 1c.25.1.55 0 .68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>',
  queue:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h11v2H3zM3 6h11v2H3zM3 14h7v2H3zM16 13v8l7-4z"/></svg>'
};
const IMG_ICONS = {
  back10:    '<img src="https://video-nikichitonjesus.odoo.com/web/image/438-deea748f/-10.webp" alt="-10">',
  fwd10:     '<img src="https://video-nikichitonjesus.odoo.com/web/image/439-9448d521/%2B10.webp" alt="+10">',
  modeVideo: '<img src="https://nikichitonjesus.odoo.com/web/image/1110-40385f0d/video.webp" alt="video">',
  modeAudio: '<img src="https://nikichitonjesus.odoo.com/web/image/625-e42b8a86/audio.png" alt="audio">'
};

// ========== ESTADO ==========
let active = null;

// ========== MODAL / TOAST ==========
const modal = {
  el: null, overlay: null, body: null, titleEl: null,
  init() {
    if (this.el) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'nk-modal-overlay';
    this.el = document.createElement('div');
    this.el.className = 'nk-modal';
    this.el.innerHTML = `
      <div class="nk-modal-header">
        <span class="nk-modal-title"></span>
        <button class="nk-modal-close">&times;</button>
      </div>
      <div class="nk-modal-body"></div>`;
    document.body.append(this.overlay, this.el);
    this.body = this.el.querySelector('.nk-modal-body');
    this.titleEl = this.el.querySelector('.nk-modal-title');
    this.el.querySelector('.nk-modal-close').addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', () => this.hide());
  },
  show(title, html) {
    this.init();
    this.titleEl.textContent = title;
    this.body.innerHTML = html;
    this.overlay.classList.add('active');
    this.el.classList.add('active');
  },
  hide() {
    this.overlay?.classList.remove('active');
    this.el?.classList.remove('active');
  }
};

function toast(message, type = 'info') {
  const t = document.createElement('div');
  t.className = `nk-toast nk-toast-${type}`;
  t.textContent = message;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('show'));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3000);
}

// ========== ESTILOS ==========
function injectStyles() {
  if (document.getElementById('nk-watch-styles')) return;
  const style = document.createElement('style');
  style.id = 'nk-watch-styles';
  style.textContent = `
    .watch {
      display: flex;
      flex-direction: column;
      max-width: 100%;
      overflow-x: hidden;
      color: #eee;
      -webkit-tap-highlight-color: transparent;
    }
    .watch * { box-sizing: border-box; }

    /* ===== Stage ===== */
    .player-stage {
      background: var(--stage-bg, #0a0a0a);
      position: relative;
    }
    .player-area {
      position: relative;
      background: var(--stage-bg, #0a0a0a);
      width: 100%;
      aspect-ratio: 16 / 9;
      max-height: 78vh;
      overflow: hidden;
    }
    .player-area:fullscreen {
      max-height: none;
      aspect-ratio: auto;
      height: 100vh;
    }
    .media-host {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: var(--stage-bg, #000);
    }
    .media-host video,
    .media-host audio {
      width: 100%; height: 100%;
      max-width: 100%; max-height: 100%;
      object-fit: contain;
      background: #000;
      display: block;
    }
    .media-host audio { height: 0; opacity: 0; pointer-events: none; }
    .player-audio-cover {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: radial-gradient(circle at center, rgba(30,30,40,.6), var(--stage-bg, #000) 70%);
    }
    .player-audio-cover img {
      width: min(45vmin, 280px);
      height: min(45vmin, 280px);
      object-fit: cover;
      border-radius: 14px;
      box-shadow: 0 20px 60px -10px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.06);
      animation: nk-float 6s ease-in-out infinite;
    }
    @keyframes nk-float {
      0%,100% { transform: translateY(0) scale(1); }
      50%     { transform: translateY(-6px) scale(1.015); }
    }

    /* ===== Controles centrales ===== */
    .center-controls {
      position: absolute; inset: 0;
      display: flex; align-items: center; justify-content: center;
      z-index: 15;
      pointer-events: none;
      transition: opacity .35s ease;
    }
    .center-controls .ctrl-center {
      pointer-events: auto;
      background: rgba(0,0,0,.5);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      border: 1px solid rgba(255,255,255,.18);
      color: #fff;
      width: 72px; height: 72px;
      border-radius: 999px;
      display: inline-flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: transform .15s ease, background .2s ease;
      padding: 0;
    }
    .center-controls .ctrl-center:hover { transform: scale(1.06); background: rgba(0,0,0,.7); }
    .center-controls .ctrl-center:active { transform: scale(.94); }
    .center-controls .ctrl-center svg {
      width: 42px; height: 42px;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,.6));
    }

    /* ===== Barra inferior ===== */
    .player-controls {
      position: absolute;
      left: 0; right: 0; bottom: 0;
      padding: 30px 16px 12px;
      background: linear-gradient(0deg, rgba(0,0,0,.85), rgba(0,0,0,.45) 55%, transparent);
      z-index: 20;
      transition: opacity .3s ease, transform .3s ease;
    }
    .progress-row { margin-bottom: 6px; }
    .seekbar {
      position: relative;
      height: 18px;
      display: flex; align-items: center;
      cursor: pointer;
    }
    .seek-track {
      position: relative;
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,.22);
      border-radius: 4px;
      transition: height .15s ease;
    }
    .seekbar:hover .seek-track { height: 6px; }
    .seek-buffer, .seek-fill {
      position: absolute; top: 0; left: 0; height: 100%;
      border-radius: 4px; pointer-events: none;
    }
    .seek-buffer { background: rgba(255,255,255,.32); width: 0; }
    .seek-fill { background: linear-gradient(90deg, #ff2d55, #ff5e3a); width: 0; z-index: 1; }
    .seek-thumb {
      position: absolute;
      top: 50%; left: 0;
      width: 14px; height: 14px;
      background: #fff; border-radius: 50%;
      transform: translate(-50%,-50%) scale(0);
      transition: transform .15s ease;
      pointer-events: none; z-index: 2;
      box-shadow: 0 2px 8px rgba(0,0,0,.5);
    }
    .seekbar:hover .seek-thumb { transform: translate(-50%,-50%) scale(1); }
    #seek {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      opacity: 0; cursor: pointer; margin: 0;
    }

    .controls-row {
      display: flex; align-items: center; gap: 6px;
      min-width: 0;
    }
    .ctrl {
      background: transparent; border: none; color: #fff;
      width: 40px; height: 40px; padding: 9px;
      border-radius: 999px;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      transition: background .2s ease, transform .15s ease;
    }
    .ctrl:hover { background: rgba(255,255,255,.14); }
    .ctrl:active { transform: scale(.9); }
    .ctrl:disabled { opacity: .35; cursor: default; }
    .ctrl svg, .ctrl img { width: 100%; height: 100%; object-fit: contain; }

    .volume-wrap { display: flex; align-items: center; gap: 4px; }
    #vol {
      width: 0; overflow: hidden; opacity: 0;
      transition: width .25s ease, opacity .25s ease;
      accent-color: #ff2d55;
    }
    .volume-wrap:hover #vol, .volume-wrap:focus-within #vol { width: 80px; opacity: 1; }

    .time-display {
      color: rgba(255,255,255,.9);
      font-size: 13px;
      font-variant-numeric: tabular-nums;
      margin: 0 6px;
      white-space: nowrap;
    }
    .spacer { flex: 1; }

    /* Menú */
    .menu-wrap { position: relative; }
    .menu-pop {
      position: absolute;
      bottom: calc(100% + 8px); right: 0;
      min-width: 160px;
      background: rgba(20,20,24,.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px;
      padding: 6px;
      display: none; flex-direction: column;
      z-index: 30;
      box-shadow: 0 10px 30px rgba(0,0,0,.6);
    }
    .menu-pop.open { display: flex; }
    .menu-pop .menu-section {
      font-size: 11px;
      color: rgba(255,255,255,.5);
      text-transform: uppercase;
      letter-spacing: .08em;
      padding: 6px 10px 4px;
    }
    .menu-pop button {
      background: transparent; border: none; color: #fff;
      text-align: left; padding: 8px 10px; border-radius: 6px;
      font-size: 13px; cursor: pointer;
    }
    .menu-pop button:hover { background: rgba(255,255,255,.08); }
    .menu-pop button.active { color: #ff5e3a; }

    /* Panel lateral (cola de episodios) */
    .player-side {
      position: absolute; top: 0; right: -100%;
      width: 100%; max-width: 380px; height: 100%;
      background: rgba(10,10,14,.95);
      backdrop-filter: blur(14px);
      z-index: 50;
      transition: right .3s ease;
      overflow-y: auto;
      border-left: 1px solid rgba(255,255,255,.08);
    }
    .player-side.open { right: 0; }
    .side-inner { padding: 20px; color: #fff; }
    .side-close {
      background: transparent; border: none; color: #fff;
      font-size: 22px; float: right; cursor: pointer;
    }
    .side-ep-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
    .side-ep-item {
      display: flex; gap: 12px; cursor: pointer;
      padding: 8px; border-radius: 8px;
      background: rgba(255,255,255,.04);
      transition: background .2s ease;
    }
    .side-ep-item:hover { background: rgba(255,255,255,.09); }
    .side-ep-item.active { background: linear-gradient(90deg, rgba(255,45,85,.25), transparent); }
    .side-ep-item .t {
      width: 72px; height: 48px; flex-shrink: 0;
      background-size: cover; background-position: center;
      border-radius: 4px;
    }
    .side-ep-item .info { min-width: 0; }
    .side-ep-item .info b {
      display: block; font-size: 13px; font-weight: 600;
      overflow: hidden; text-overflow: ellipsis;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
    }
    .side-ep-item .info span { font-size: 11px; color: rgba(255,255,255,.5); }

    /* Estado oculto */
    .hide-controls { opacity: 0; visibility: hidden; pointer-events: none; }
    .player-controls.hide-controls { transform: translateY(8px); }
    .player-area.idle,
    .player-area.idle * { cursor: none !important; }

    /* Info debajo */
    .watch-info {
      padding: 20px 16px;
      max-width: 1400px; margin: 0 auto;
    }
    .watch-title {
      font-size: clamp(20px, 3vw, 28px);
      font-weight: 700; margin: 0 0 8px;
      color: #fff;
    }
    .watch-meta-row {
      display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
      color: rgba(255,255,255,.7); font-size: 14px;
      margin-bottom: 14px;
    }
    .watch-author { font-weight: 600; color: #fff; }
    .watch-actions {
      display: flex; flex-wrap: wrap; gap: 8px;
      margin-left: auto;
    }
    .watch-actions button {
      background: rgba(255,255,255,.08);
      border: 1px solid rgba(255,255,255,.1);
      color: #fff;
      padding: 8px 14px;
      border-radius: 999px;
      font-size: 13px; cursor: pointer;
      transition: background .2s ease, transform .1s ease;
      display: inline-flex; align-items: center; gap: 6px;
    }
    .watch-actions button:hover { background: rgba(255,255,255,.14); }
    .watch-actions button:active { transform: scale(.96); }
    .watch-actions button.liked { background: #ff2d55; border-color: #ff2d55; }
    .watch-description {
      background: rgba(255,255,255,.04);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 14px; line-height: 1.55;
      color: rgba(255,255,255,.85);
      white-space: pre-wrap;
    }
    .watch-below {
      padding: 20px 16px 60px;
      max-width: 1400px; margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }
    .watch-below.has-series {
      grid-template-columns: 1fr;
    }
    @media (min-width: 960px) {
      .watch-below.has-series { grid-template-columns: 1fr 360px; }
    }

    .suggest-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 14px;
    }
    .ep-card {
      cursor: pointer;
      background: rgba(255,255,255,.03);
      border-radius: 10px;
      overflow: hidden;
      transition: transform .15s ease, background .2s ease;
    }
    .ep-card:hover { transform: translateY(-2px); background: rgba(255,255,255,.07); }
    .ep-card .thumb {
      aspect-ratio: 16 / 9;
      background-size: cover; background-position: center;
      position: relative;
    }
    .ep-card .badge {
      position: absolute; top: 8px; right: 8px;
      background: rgba(0,0,0,.7);
      padding: 4px 6px; border-radius: 4px;
      display: inline-flex;
    }
    .ep-card .body { padding: 10px 12px; }
    .ep-card .title {
      font-size: 14px; font-weight: 600; color: #fff;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .ep-card .meta { font-size: 12px; color: rgba(255,255,255,.5); margin-top: 4px; }

    .series-panel {
      background: rgba(255,255,255,.04);
      border-radius: 12px;
      padding: 16px;
    }
    .series-panel .s-cover {
      width: 100%; aspect-ratio: 16 / 9;
      background-size: cover; background-position: center;
      border-radius: 8px; margin-bottom: 12px;
    }
    .series-panel .s-title { font-weight: 700; font-size: 18px; margin-bottom: 4px; color: #fff; }
    .series-panel .s-desc { font-size: 13px; color: rgba(255,255,255,.65); margin-bottom: 12px; }
    .series-list { display: flex; flex-direction: column; gap: 8px; }

    /* Modal / Toast */
    .nk-modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.75);
      backdrop-filter: blur(6px);
      z-index: 1000;
      opacity: 0; visibility: hidden;
      transition: opacity .25s ease, visibility .25s ease;
    }
    .nk-modal {
      position: fixed; top: 50%; left: 50%;
      transform: translate(-50%,-50%) scale(.94);
      background: #17181c;
      border-radius: 16px;
      width: 92%; max-width: 500px;
      z-index: 1001;
      opacity: 0; visibility: hidden;
      transition: opacity .25s ease, visibility .25s ease, transform .25s ease;
      box-shadow: 0 20px 60px rgba(0,0,0,.6);
      border: 1px solid rgba(255,255,255,.08);
    }
    .nk-modal.active, .nk-modal-overlay.active { opacity: 1; visibility: visible; }
    .nk-modal.active { transform: translate(-50%,-50%) scale(1); }
    .nk-modal-header {
      padding: 14px 18px;
      border-bottom: 1px solid rgba(255,255,255,.08);
      display: flex; justify-content: space-between; align-items: center;
    }
    .nk-modal-title { font-size: 16px; font-weight: 600; color: #fff; }
    .nk-modal-close {
      background: none; border: none; color: #fff;
      font-size: 22px; cursor: pointer; opacity: .7;
    }
    .nk-modal-close:hover { opacity: 1; }
    .nk-modal-body { padding: 18px; color: #ddd; line-height: 1.5; font-size: 14px; }
    .nk-modal-body input, .nk-modal-body textarea {
      width: 100%; padding: 10px; margin: 8px 0;
      background: rgba(255,255,255,.05);
      border: 1px solid rgba(255,255,255,.1);
      color: #fff; border-radius: 8px;
      font-family: inherit; font-size: 13px;
    }
    .nk-modal-body button {
      background: #ff2d55; border: none; color: #fff;
      padding: 9px 16px; border-radius: 8px;
      cursor: pointer; font-size: 13px; font-weight: 600;
    }
    .nk-modal-body button:hover { background: #ff4066; }

    .nk-toast {
      position: fixed; bottom: 24px; left: 50%;
      transform: translateX(-50%) translateY(80px);
      background: #17181c;
      color: #fff; padding: 12px 20px;
      border-radius: 999px;
      z-index: 1100;
      transition: transform .3s ease;
      font-size: 13px;
      border: 1px solid rgba(255,255,255,.1);
      box-shadow: 0 10px 30px rgba(0,0,0,.5);
      pointer-events: none;
    }
    .nk-toast.show { transform: translateX(-50%) translateY(0); }
    .nk-toast-success { background: #16a34a; border-color: #16a34a; }
    .nk-toast-error   { background: #dc2626; border-color: #dc2626; }

    @media (max-width: 640px) {
      .ctrl { width: 36px; height: 36px; padding: 8px; }
      .center-controls .ctrl-center { width: 60px; height: 60px; }
      .center-controls .ctrl-center svg { width: 34px; height: 34px; }
      .time-display { font-size: 12px; margin: 0 4px; }
      .player-controls { padding: 24px 10px 8px; }
      .ctrl.hide-sm { display: none; }
    }
  `;
  document.head.appendChild(style);
}

// ========== LIMPIEZA DE MEDIOS (contra doble reproducción) ==========
function destroyMedia(el) {
  if (!el) return;
  try {
    el.pause();
    el.removeAttribute('src');
    while (el.firstChild) el.removeChild(el.firstChild);
    el.load();
  } catch {}
  try { el.remove(); } catch {}
}
function killAnyLingeringMedia(exceptEl) {
  document.querySelectorAll('video, audio').forEach((el) => {
    if (el === exceptEl) return;
    destroyMedia(el);
  });
}

// ========== META / ROUTING ==========
export const meta = (ctx) => {
  const ep = ctx?.episodio;
  if (!ep) return { title: 'Reproductor — NikichitonJesús TV' };
  return { title: `${ep.title} — NikichitonJesús TV`, description: ep.description, image: ep.coverUrl };
};

export function resolveFromUrl(pathname) {
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
  const queueIndex = Math.max(0, queue.findIndex(x => x.id === ep.id));
  return { episodio: ep, queue, queueIndex, serie };
}

// ========== RENDER ==========
export function render(container, ctx) {
  // Teardown previo solo si el episodio es diferente al que está activo
  if (active) {
    if (active.episodio.id !== ctx.episodio.id) {
      // Destruir el medio anterior si es otro episodio
      try { active._cleanup?.(); } catch {}
      destroyMedia(active.media);
      active = null;
    } else {
      // Si es el mismo episodio, solo limpiamos eventos pero conservamos el medio
      try { active._cleanup?.(); } catch {}
      // No destruimos el medio, lo reutilizaremos
    }
  }

  // Si no hay active o se destruyó, aseguramos que no queden medios sueltos
  if (!active) {
    killAnyLingeringMedia();
  }

  injectStyles();
  window.scrollTo(0, 0);
  if (container.scrollTo) container.scrollTo(0, 0);

  const { episodio, queue, queueIndex, serie } = ctx;
  const sugeridos = recomendar(episodio, 8);
  const reclaim = ctx.reclaimPipMedia?.(episodio);
  const initialMode = reclaim
    ? (reclaim.tagName === 'VIDEO' ? 'video' : 'audio')
    : (episodio.hasVideo && episodio.initialMode !== 'audio' ? 'video' : 'audio');
  const canSwitch = episodio.hasVideo && episodio.hasAudio;
  const hasQueue = queue.length > 1;

  // Si ya tenemos un medio (porque es el mismo episodio y no se destruyó), lo usamos
  let existingMedia = active ? active.media : null;

  container.innerHTML = `
    <div class="watch">
      <section class="player-stage" style="--stage-bg:${escapeAttr(episodio.bgColor || '#0a0a0a')}">
        <div class="player-area" id="player-area" data-mode="${initialMode}">
          <div class="media-host" id="media-host"></div>

          <div class="center-controls" id="center-controls">
            <button class="ctrl-center" data-act="toggle" id="center-play" aria-label="Play/Pause">${ICONS.play}</button>
          </div>

          <div class="player-controls" id="player-controls">
            <div class="progress-row">
              <div class="seekbar" id="seekbar">
                <div class="seek-track">
                  <div class="seek-buffer" id="seek-buffer"></div>
                  <div class="seek-fill" id="seek-fill"></div>
                  <div class="seek-thumb" id="seek-thumb"></div>
                </div>
                <input type="range" id="seek" min="0" max="1000" step="1" value="0" aria-label="Progreso"/>
              </div>
            </div>
            <div class="controls-row">
              <button class="ctrl" data-act="toggle" id="btn-toggle" title="Play/Pause (Espacio)">${ICONS.play}</button>
              <button class="ctrl hide-sm" data-act="prev" title="Anterior" ${hasQueue ? '' : 'disabled'}>${ICONS.prev}</button>
              <button class="ctrl" data-act="back10" title="-10s (←)">${IMG_ICONS.back10}</button>
              <button class="ctrl" data-act="fwd10" title="+10s (→)">${IMG_ICONS.fwd10}</button>
              <button class="ctrl hide-sm" data-act="next" title="Siguiente" ${hasQueue ? '' : 'disabled'}>${ICONS.next}</button>
              <div class="volume-wrap">
                <button class="ctrl" data-act="mute" id="btn-mute" title="Silenciar (M)">${ICONS.vol}</button>
                <input type="range" id="vol" min="0" max="1" step="0.01" value="1" aria-label="Volumen"/>
              </div>
              <div class="time-display"><span id="t-current">0:00</span> / <span id="t-total">0:00</span></div>
              <div class="spacer"></div>
              ${canSwitch ? `<button class="ctrl hide-sm" data-act="switch-mode" id="btn-mode" title="Cambiar audio/video">${IMG_ICONS.modeVideo}</button>` : ''}
              ${hasQueue ? `<button class="ctrl hide-sm" data-act="toggle-queue" title="Lista de episodios">${ICONS.queue}</button>` : ''}
              <div class="menu-wrap">
                <button class="ctrl" data-act="menu" title="Opciones">${ICONS.settings}</button>
                <div class="menu-pop" id="menu-pop">
                  <div class="menu-section">Velocidad</div>
                  <button data-rate="0.5">0.5x</button>
                  <button data-rate="0.75">0.75x</button>
                  <button data-rate="1" class="active">Normal</button>
                  <button data-rate="1.25">1.25x</button>
                  <button data-rate="1.5">1.5x</button>
                  <button data-rate="2">2x</button>
                  ${episodio.mediaCalidadbaja ? `
                    <div class="menu-section">Calidad</div>
                    <button data-quality="alta" class="active">Alta</button>
                    <button data-quality="baja">Baja (datos)</button>` : ''}
                  ${episodio.subtitlesUrl ? `<div class="menu-section">Subtítulos</div><button data-act="subs">Activar/Desactivar</button>` : ''}
                </div>
              </div>
              <button class="ctrl hide-sm" data-act="minimize" title="Mini reproductor">${ICONS.pip}</button>
              <button class="ctrl" data-act="fullscreen" id="btn-fullscreen" title="Pantalla completa (F)">${ICONS.full}</button>
            </div>
          </div>
        </div>
        <aside class="player-side" id="player-side">
          <div class="side-inner" id="side-inner"></div>
        </aside>
      </section>

      <div class="watch-info">
        <h1 class="watch-title">${escapeHtml(episodio.title)}</h1>
        <div class="watch-meta-row">
          <span class="watch-author">${escapeHtml(episodio.author || '')}</span>
          <span>· ${formatDate(episodio.date)}</span>
          ${episodio.categoria ? `<span>· ${escapeHtml(episodio.categoria)}</span>` : ''}
          <div class="watch-actions">
            <button id="btn-like" class="${isLiked(episodio.id) ? 'liked' : ''}">❤ <span>${isLiked(episodio.id) ? 'Te gusta' : 'Me gusta'}</span></button>
            <button id="btn-share">↗ Compartir</button>
            <button id="btn-embed">&lt;/&gt; Incrustar</button>
            <button id="btn-report">⚠ Reportar</button>
            ${episodio.allowDownload ? `<button id="btn-download">⬇ Descargar</button>` : ''}
          </div>
        </div>
        ${episodio.description ? `<div class="watch-description">${escapeHtml(episodio.description)}</div>` : ''}
      </div>

      <div class="watch-below ${serie ? 'has-series' : ''}">
        <section>
          <h2 style="margin:0 0 14px;font-size:18px;color:#fff;">Te puede interesar</h2>
          <div class="suggest-grid">
            ${sugeridos.map(e => suggestCardHTML(e)).join('')}
          </div>
        </section>
        ${serie ? seriesPanelHTML(serie, queue, episodio) : ''}
      </div>
    </div>
  `;

  const host = container.querySelector('#media-host');

  let media;
  if (existingMedia) {
    // Reutilizar el medio existente
    media = existingMedia;
    // Si estaba en PIP, lo movemos al host
    host.appendChild(media);
    // Ajustar clase y modo visual según el modo actual
    const mode = media.tagName === 'VIDEO' ? 'video' : 'audio';
    if (mode === 'audio') {
      host.innerHTML = '';
      const cover = document.createElement('div');
      cover.className = 'player-audio-cover';
      cover.innerHTML = `<img src="${escapeAttr(episodio.coverUrl)}" alt="${escapeAttr(episodio.title)}"/>`;
      host.appendChild(cover);
      host.appendChild(media);
    }
    // Actualizar el modo actual en el área
    container.querySelector('#player-area').dataset.mode = mode;
  } else {
    // Crear nuevo medio
    media = createMediaElement(initialMode, episodio);
    mountMedia(host, media, initialMode, episodio);
  }

  // Actualizar estado activo
  active = { episodio, container, ctx, queue, queueIndex, media };
  setupPlayer(container, media, episodio, queue, queueIndex, ctx, initialMode);
  setupActions(container, episodio, ctx);

  container.querySelectorAll('[data-ep-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.epLink));
  });
  trackView(episodio);
}

function mountMedia(host, media, mode, ep) {
  host.innerHTML = '';
  if (mode === 'audio') {
    const cover = document.createElement('div');
    cover.className = 'player-audio-cover';
    cover.innerHTML = `<img src="${escapeAttr(ep.coverUrl)}" alt="${escapeAttr(ep.title)}"/>`;
    host.appendChild(cover);
  }
  host.appendChild(media);
}

function createMediaElement(mode, ep) {
  const el = document.createElement(mode === 'video' ? 'video' : 'audio');
  el.id = 'player-media';
  el.className = mode === 'video' ? 'player-media' : 'player-audio';
  el.preload = 'metadata';
  el.playsInline = true;
  if (mode === 'video') el.poster = ep.coverUrl || '';
  setMediaSrc(el, ep, mode);
  return el;
}

function setMediaSrc(media, ep, mode) {
  if (mode === 'video' && ep.mediaVideo) media.src = ep.mediaVideo;
  else if (ep.mediaUrl) media.src = ep.mediaUrl;
  else if (ep.mediaVideo) media.src = ep.mediaVideo;
}

function suggestCardHTML(ep) {
  const badge = ep.hasVideo
    ? '<img src="https://nikichitonjesus.odoo.com/web/image/1110-40385f0d/video.webp" style="width:16px;height:16px;object-fit:contain;" alt="video">'
    : '<img src="https://nikichitonjesus.odoo.com/web/image/625-e42b8a86/audio.png" style="width:16px;height:16px;object-fit:contain;" alt="audio">';
  return `<article class="ep-card" data-ep-link="${escapeAttr(ep.detailUrl)}">
    <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')">
      <span class="badge">${badge}</span>
    </div>
    <div class="body">
      <div class="title">${escapeHtml(ep.title)}</div>
      <div class="meta">${escapeHtml(ep.author || '')}</div>
    </div>
  </article>`;
}

function seriesPanelHTML(serie, queue, currentEp) {
  return `<aside class="series-panel">
    <div class="s-cover" style="background-image:url('${escapeAttr(serie.portada_serie)}')"></div>
    <div class="s-title">${escapeHtml(serie.titulo_serie)}</div>
    <div class="s-desc">${escapeHtml(serie.descripcion_serie || '')}</div>
    <div class="series-list">
      ${queue.map((e, i) => `
        <div class="side-ep-item ${e.id === currentEp.id ? 'active' : ''}" data-ep-link="${escapeAttr(e.detailUrl)}">
          <div class="t" style="background-image:url('${escapeAttr(e.coverUrl)}')"></div>
          <div class="info"><b>${i+1}. ${escapeHtml(e.title)}</b><span>${formatDate(e.date)}</span></div>
        </div>`).join('')}
    </div>
  </aside>`;
}

// ========== LÓGICA DEL REPRODUCTOR ==========
function setupPlayer(root, initialMedia, ep, queue, queueIndex, ctx, initialMode) {
  const area = root.querySelector('#player-area');
  const host = root.querySelector('#media-host');
  const seek = root.querySelector('#seek');
  const seekFill = root.querySelector('#seek-fill');
  const seekBuf = root.querySelector('#seek-buffer');
  const seekThumb = root.querySelector('#seek-thumb');
  const tCur = root.querySelector('#t-current');
  const tTot = root.querySelector('#t-total');
  const btnToggle = root.querySelector('#btn-toggle');
  const btnMute = root.querySelector('#btn-mute');
  const vol = root.querySelector('#vol');
  const side = root.querySelector('#player-side');
  const sideInner = root.querySelector('#side-inner');
  const menuPop = root.querySelector('#menu-pop');
  const center = root.querySelector('#center-controls');
  const centerBtn = root.querySelector('#center-play');
  const controls = root.querySelector('#player-controls');
  const modeBtn = root.querySelector('#btn-mode');
  const btnFull = root.querySelector('#btn-fullscreen');

  let media = initialMedia;
  let currentMode = initialMode;
  let seekingUser = false;
  let hideTimer = null;

  // ---- Ocultar/mostrar controles por inactividad ----
  const setControlsVisible = (v) => {
    controls.classList.toggle('hide-controls', !v);
    center.classList.toggle('hide-controls', !v);
    area.classList.toggle('idle', !v);
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
  wake();

  const onMove = () => wake();
  const onLeave = () => { if (!media.paused) setControlsVisible(false); };
  area.addEventListener('mousemove', onMove);
  area.addEventListener('mouseleave', onLeave);
  area.addEventListener('touchstart', wake, { passive: true });

  // Clic en el área (fuera de controles) = pausar/reproducir
  const onAreaClick = (e) => {
    if (
      e.target.closest('.ctrl') ||
      e.target.closest('.ctrl-center') ||
      e.target.closest('.menu-wrap') ||
      e.target.closest('.volume-wrap') ||
      e.target.closest('.seekbar')
    ) return;
    media.paused ? media.play() : media.pause();
  };
  area.addEventListener('click', onAreaClick);

  // ---- Sincronización de iconos play/pause ----
  const syncToggle = () => {
    const icon = media.paused ? ICONS.play : ICONS.pause;
    if (btnToggle) btnToggle.innerHTML = icon;
    if (centerBtn) centerBtn.innerHTML = icon;
  };

  // ---- Bindings del medio ----
  const onPlay = () => { syncToggle(); updateMediaSession(ep, media); area.classList.add('playing'); scheduleHide(); };
  const onPause = () => { syncToggle(); setControlsVisible(true); clearTimeout(hideTimer); };
  const onTime = () => {
    if (!media.duration || seekingUser) return;
    const pct = (media.currentTime / media.duration) * 100;
    seekFill.style.width = pct + '%';
    seekThumb.style.left = pct + '%';
    seek.value = pct * 10;
    tCur.textContent = formatTime(media.currentTime);
    saveProgress(ep.id, media.currentTime, media.duration);
  };
  const onProgress = () => {
    if (!media.buffered.length || !media.duration) return;
    const end = media.buffered.end(media.buffered.length - 1);
    seekBuf.style.width = ((end / media.duration) * 100) + '%';
  };
  const onMeta = () => { tTot.textContent = formatTime(media.duration); };
  const onEnded = () => {
    if (queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
  };
  const onVolChange = () => {
    if (btnMute) btnMute.innerHTML = (media.muted || media.volume === 0) ? ICONS.mute : ICONS.vol;
    vol.value = media.muted ? 0 : media.volume;
  };
  const bindMedia = (el) => {
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('progress', onProgress);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('ended', onEnded);
    el.addEventListener('volumechange', onVolChange);
  };
  const unbindMedia = (el) => {
    el.removeEventListener('play', onPlay);
    el.removeEventListener('pause', onPause);
    el.removeEventListener('timeupdate', onTime);
    el.removeEventListener('progress', onProgress);
    el.removeEventListener('loadedmetadata', onMeta);
    el.removeEventListener('ended', onEnded);
    el.removeEventListener('volumechange', onVolChange);
  };
  bindMedia(media);
  syncToggle();

  // Botón de modo icon
  const updateModeIcon = () => {
    if (modeBtn) modeBtn.innerHTML = currentMode === 'video' ? IMG_ICONS.modeVideo : IMG_ICONS.modeAudio;
  };
  updateModeIcon();

  // Subtítulos
  if (currentMode === 'video' && ep.subtitlesUrl && !media.querySelector('track')) {
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.src = ep.subtitlesUrl; tr.srclang = 'es'; tr.label = 'Español'; tr.default = true;
    media.appendChild(tr);
  }

  // Restaurar progreso
  const prog = getProgress(ep.id);
  if (prog && prog.duration && prog.progress < prog.duration - 5 && media.currentTime < 1) {
    const restore = () => { try { media.currentTime = prog.progress; } catch {} };
    if (media.readyState >= 1) restore();
    else media.addEventListener('loadedmetadata', restore, { once: true });
  }

  // Autoplay con fallback a muted
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

  media.addEventListener('error', () => console.warn('Media error', media.error));

  // ---- Seek ----
  seek.addEventListener('input', () => {
    seekingUser = true;
    const pct = seek.value / 10;
    seekFill.style.width = pct + '%';
    seekThumb.style.left = pct + '%';
    if (media.duration) tCur.textContent = formatTime((pct / 100) * media.duration);
  });
  seek.addEventListener('change', () => {
    if (media.duration) media.currentTime = (seek.value / 1000) * media.duration;
    seekingUser = false;
  });

  // ---- Volumen ----
  vol.value = media.muted ? 0 : media.volume;
  vol.addEventListener('input', () => {
    media.volume = parseFloat(vol.value);
    media.muted = media.volume === 0;
  });

  // ---- Cambio de modo audio<->video (fix duplicación) ----
  const switchMode = (newMode) => {
    if (newMode === currentMode) return;
    const t = media.currentTime;
    const wasPlaying = !media.paused;
    const v = media.volume;
    const muted = media.muted;

    unbindMedia(media);
    destroyMedia(media);
    killAnyLingeringMedia();

    const next = createMediaElement(newMode, ep);
    mountMedia(host, next, newMode, ep);
    next.volume = v;
    next.muted = muted;
    bindMedia(next);
    media = next;
    active.media = next;
    currentMode = newMode;
    area.dataset.mode = newMode;
    updateModeIcon();

    next.addEventListener('loadedmetadata', () => {
      try { next.currentTime = t; } catch {}
      if (wasPlaying) next.play().catch(() => {});
    }, { once: true });
  };

  // ---- Botones ----
  const togglePlayPause = () => { media.paused ? media.play() : media.pause(); };

  root.querySelectorAll('[data-act]').forEach(b => {
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
        case 'toggle-queue': toggleSidePanel(side, sideInner, ep, queue, ctx); break;
        case 'minimize':    ctx.minimizeToPip?.(); ctx.navigate('/'); break;
        case 'fullscreen':
          if (!document.fullscreenElement) area.requestFullscreen?.();
          else document.exitFullscreen();
          break;
        case 'menu':        menuPop.classList.toggle('open'); break;
        case 'subs':
          if (ep.subtitlesUrl) {
            const tr = media.textTracks[0];
            if (tr) tr.mode = tr.mode === 'showing' ? 'hidden' : 'showing';
          }
          break;
      }
      wake();
    });
  });

  // Rates / Calidad
  root.querySelectorAll('[data-rate]').forEach(b => {
    b.addEventListener('click', () => {
      media.playbackRate = parseFloat(b.dataset.rate);
      root.querySelectorAll('[data-rate]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      menuPop.classList.remove('open');
    });
  });
  root.querySelectorAll('[data-quality]').forEach(b => {
    b.addEventListener('click', () => {
      const t = media.currentTime;
      const wasPlaying = !media.paused;
      const url = b.dataset.quality === 'baja' ? (ep.mediaCalidadbaja || ep.mediaVideo) : ep.mediaVideo;
      media.src = url;
      media.addEventListener('loadedmetadata', () => {
        try { media.currentTime = t; } catch {}
        if (wasPlaying) media.play();
      }, { once: true });
      root.querySelectorAll('[data-quality]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      menuPop.classList.remove('open');
    });
  });

  const outsideClose = (e) => {
    if (!e.target.closest('.menu-wrap')) menuPop?.classList.remove('open');
  };
  document.addEventListener('click', outsideClose);

  document.addEventListener('fullscreenchange', () => {
    if (!btnFull) return;
    btnFull.innerHTML = document.fullscreenElement ? ICONS.fullExit : ICONS.full;
  });

  // Teclado
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space')             { e.preventDefault(); togglePlayPause(); }
    else if (e.code === 'ArrowLeft')    media.currentTime = Math.max(0, media.currentTime - 10);
    else if (e.code === 'ArrowRight')   media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
    else if (e.code === 'ArrowUp')      { e.preventDefault(); media.volume = Math.min(1, media.volume + 0.05); }
    else if (e.code === 'ArrowDown')    { e.preventDefault(); media.volume = Math.max(0, media.volume - 0.05); }
    else if (e.key.toLowerCase() === 'm') media.muted = !media.muted;
    else if (e.key.toLowerCase() === 'f') {
      if (!document.fullscreenElement) area.requestFullscreen?.();
      else document.exitFullscreen();
    }
    wake();
  };
  document.addEventListener('keydown', onKey);

  active._cleanup = () => {
    clearTimeout(hideTimer);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', outsideClose);
    area.removeEventListener('mousemove', onMove);
    area.removeEventListener('mouseleave', onLeave);
    area.removeEventListener('touchstart', wake);
    area.removeEventListener('click', onAreaClick);
    unbindMedia(media);
    // NO destruimos el medio, solo limpiamos eventos y referencias.
    // El medio será reutilizado o movido a PIP por el contexto.
  };

  ctx.registerPlayer?.({
    media, episodio: ep, queue, queueIndex,
    get mode() { return currentMode; },
    play: () => media.play(),
    pause: () => media.pause(),
    isPaused: () => media.paused,
    next: () => queueIndex < queue.length - 1 && ctx.navigate(queue[queueIndex + 1].detailUrl),
    prev: () => queueIndex > 0 && ctx.navigate(queue[queueIndex - 1].detailUrl)
  });
}

// ========== PANEL LATERAL ==========
function toggleSidePanel(side, inner, ep, queue, ctx) {
  if (side.classList.contains('open')) { side.classList.remove('open'); return; }
  inner.innerHTML = `<button class="side-close" aria-label="Cerrar">✕</button>
    <h3 style="margin:0 0 6px;font-size:16px;">Lista de episodios</h3>
    <div class="side-ep-list">
      ${queue.map((e, i) => `
        <div class="side-ep-item ${e.id===ep.id?'active':''}" data-ep-link="${escapeAttr(e.detailUrl)}">
          <div class="t" style="background-image:url('${escapeAttr(e.coverUrl)}')"></div>
          <div class="info"><b>${i+1}. ${escapeHtml(e.title)}</b><span>${formatDate(e.date)}</span></div>
        </div>`).join('')}
    </div>`;
  inner.querySelector('.side-close').addEventListener('click', () => side.classList.remove('open'));
  inner.querySelectorAll('[data-ep-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.epLink));
  });
  side.classList.add('open');
}

// ========== ACCIONES INFERIORES ==========
function setupActions(root, ep, ctx) {
  root.querySelector('#btn-like')?.addEventListener('click', (e) => {
    const liked = toggleLike(ep.id, ep);
    e.currentTarget.classList.toggle('liked', liked);
    e.currentTarget.querySelector('span').textContent = liked ? 'Te gusta' : 'Me gusta';
  });

  root.querySelector('#btn-share')?.addEventListener('click', async () => {
    const url = `${location.origin}${ep.detailUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: ep.title, text: ep.description, url }); return; } catch {}
    }
    modal.show('Compartir',
      `<p>Comparte este episodio:</p><input type="text" value="${escapeAttr(url)}" readonly><button id="copy-share-link">Copiar enlace</button>`);
    setTimeout(() => {
      document.getElementById('copy-share-link')?.addEventListener('click', () => {
        navigator.clipboard.writeText(url);
        modal.hide();
        toast('Enlace copiado', 'success');
      });
    }, 50);
  });

  root.querySelector('#btn-embed')?.addEventListener('click', () => {
    const code = `<iframe src="${location.origin}/embed${ep.detailUrl}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    modal.show('Código para incrustar',
      `<p>Copia este código HTML:</p><textarea rows="4" readonly>${escapeHtml(code)}</textarea><button id="copy-embed-code">Copiar código</button>`);
    setTimeout(() => {
      document.getElementById('copy-embed-code')?.addEventListener('click', () => {
        navigator.clipboard.writeText(code);
        modal.hide();
        toast('Código copiado', 'success');
      });
    }, 50);
  });

  root.querySelector('#btn-report')?.addEventListener('click', () => {
    modal.show('Reportar problema', `
      <p>¿Has encontrado un problema con este contenido?</p>
      <div style="display:flex;gap:10px;margin-top:14px;">
        <button id="report-action">Reportar</button>
        <button id="report-close" style="background:rgba(255,255,255,.1);">Cerrar</button>
      </div>`);
    setTimeout(() => {
      document.getElementById('report-action')?.addEventListener('click', () => {
        window.open('https://forms.gle/ejemplo', '_blank');
        modal.hide();
      });
      document.getElementById('report-close')?.addEventListener('click', () => modal.hide());
    }, 50);
  });

  root.querySelector('#btn-download')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = ep.mediaVideo || ep.mediaUrl;
    a.download = ep.title;
    a.click();
  });
}

// ========== MEDIA SESSION ==========
function updateMediaSession(ep, media) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ep.title, artist: ep.author || '', album: ep.seriesid || '',
      artwork: [{ src: ep.coverUrl, sizes: '512x512' }]
    });
    navigator.mediaSession.setActionHandler('play',         () => media.play());
    navigator.mediaSession.setActionHandler('pause',        () => media.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => media.currentTime -= 10);
    navigator.mediaSession.setActionHandler('seekforward',  () => media.currentTime += 10);
  } catch {}
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return d || ''; }
}

// ========== TEARDOWN ==========
export function teardown() {
  if (active) {
    try { active._cleanup?.(); } catch {}
    // No destruimos el medio, solo limpiamos eventos.
    // El medio se conserva para ser usado en PIP por el contexto.
    active = null;
  }
  // No matamos medios huérfanos porque podrían estar en PIP.
}
