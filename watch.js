// =========================================================
// watch.js — Vista del reproductor (modo cine profesional)
// Comportamiento diferenciado: normal (hover/auto-ocultar) y embed (toggle con clic)
// =========================================================
import {
  getEpisodioById, getEpisodioByDetailUrl, getSerieByUrl,
  getEpisodiosBySerieId, getSerieById
} from './episodios.js';
import { recomendar, formatTime } from './utilidades.js';
import {
  isLiked, toggleLike, saveProgress, getProgress, trackView
} from './memoria.js';
import { escapeHtml, escapeAttr } from './feed.js';

// Iconos SVG estándar
const ICONS = {
  play:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  prev:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  next:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>',
  vol:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.04v7.92A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06A7 7 0 0 1 14 18.7v2.06A9 9 0 0 0 14 3.23z"/></svg>',
  mute:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  full:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  fullExit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>',
  pip:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.57-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.68.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.25 1.17-.57 1.69-.98l2.49 1c.25.1.55 0 .68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>',
  queue:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h11v2H3zM3 6h11v2H3zM3 14h7v2H3zM16 13v8l7-4z"/></svg>'
};

// Iconos reemplazados por imágenes
const IMG_ICONS = {
  back10: '<img src="https://video-nikichitonjesus.odoo.com/web/image/438-deea748f/-10.webp" alt="-10" style="width:100%; height:100%; object-fit:contain;">',
  fwd10:  '<img src="https://video-nikichitonjesus.odoo.com/web/image/439-9448d521/%2B10.webp" alt="+10" style="width:100%; height:100%; object-fit:contain;">',
  modeVideo: '<img src="https://nikichitonjesus.odoo.com/web/image/1110-40385f0d/video.webp" alt="video" style="width:100%; height:100%; object-fit:contain;">',
  modeAudio: '<img src="https://nikichitonjesus.odoo.com/web/image/625-e42b8a86/audio.png" alt="audio" style="width:100%; height:100%; object-fit:contain;">'
};

let active = null;

function isEmbedMode() {
  return document.body.classList.contains('embed-mode');
}

// --- Sistema de Notificaciones Modal (genérico) ---
const modal = {
  element: null,
  overlay: null,
  contentElement: null,
  init() {
    if (this.element) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'nk-modal-overlay';
    this.element = document.createElement('div');
    this.element.className = 'nk-modal';
    this.element.innerHTML = `
      <div class="nk-modal-header">
        <span class="nk-modal-title"></span>
        <button class="nk-modal-close">&times;</button>
      </div>
      <div class="nk-modal-body"></div>
    `;
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.element);
    this.contentElement = this.element.querySelector('.nk-modal-body');
    this.titleElement = this.element.querySelector('.nk-modal-title');
    const closeBtn = this.element.querySelector('.nk-modal-close');
    closeBtn.addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', () => this.hide());
  },
  show(title, content, onClose) {
    this.init();
    this.titleElement.textContent = title;
    this.contentElement.innerHTML = content;
    this.overlay.classList.add('active');
    this.element.classList.add('active');
    this._onClose = onClose;
  },
  hide() {
    if (this.overlay) this.overlay.classList.remove('active');
    if (this.element) this.element.classList.remove('active');
    if (this._onClose) {
      this._onClose();
      delete this._onClose;
    }
  }
};

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `nk-toast nk-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Inyectar estilos esenciales (incluyendo los que faltaban para el auto-ocultado)
function injectEssentialStyles() {
  if (document.getElementById('watch-essential-styles')) return;
  const style = document.createElement('style');
  style.id = 'watch-essential-styles';
  style.textContent = `
    /* Evitar scroll horizontal en general */
    body, .watch, .player-stage, .media-host {
      overflow-x: hidden !important;
      max-width: 100% !important;
    }
    /* Modo embed: sin scroll vertical ni horizontal, el reproductor ocupa todo el contenedor */
    body.embed-mode {
      overflow: hidden !important;
      height: 100vh;
      margin: 0;
      padding: 0;
    }
    body.embed-mode .watch {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    body.embed-mode .player-stage {
      flex: 1;
      min-height: 0;
    }
    .player-area {
      position: relative;
      overflow: hidden;
      background: var(--stage-bg, #0a0a0a);
      height: 100%;
      width: 100%;
    }
    .media-host {
      width: 100%;
      height: 100%;
      background: var(--stage-bg, #0a0a0a);
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .player-audio-cover {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
    }
    .player-audio-cover img {
      max-width: 70%;
      max-height: 70%;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 0 30px rgba(0,0,0,0.5);
    }
    /* Barra de progreso */
    .progress-row {
      margin-bottom: 8px;
    }
    .seekbar {
      position: relative;
      width: 100%;
      height: 5px;
      background: rgba(255,255,255,0.2);
      cursor: pointer;
      border-radius: 3px;
    }
    .seek-buffer, .seek-fill {
      position: absolute;
      height: 100%;
      top: 0;
      left: 0;
      border-radius: 3px;
      pointer-events: none;
    }
    .seek-buffer { background: rgba(255,255,255,0.3); width: 0; }
    .seek-fill { background: #ff0000; width: 0; z-index: 1; }
    .seek-thumb {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 12px;
      height: 12px;
      background: #ff0000;
      border-radius: 50%;
      z-index: 2;
      pointer-events: none;
      left: 0;
    }
    #seek {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 3;
    }
    /* Controles flotantes del reproductor */
    .player-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
      padding: 20px 16px 12px;
      transition: opacity 0.3s, visibility 0.3s;
      z-index: 10;
    }
    .controls-row {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .ctrl {
      background: none;
      border: none;
      color: white;
      width: 36px;
      height: 36px;
      cursor: pointer;
      transition: transform 0.1s;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .ctrl svg, .ctrl img { width: 100%; height: 100%; }
    .volume-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    #vol { width: 70px; }
    .time-display {
      color: white;
      font-size: 13px;
      font-family: monospace;
    }
    .spacer { flex: 1; }
    .menu-wrap { position: relative; }
    .menu-pop {
      position: absolute;
      bottom: 100%;
      right: 0;
      background: #1a1a1a;
      border-radius: 8px;
      padding: 8px;
      display: none;
      flex-direction: column;
      gap: 6px;
      z-index: 20;
      min-width: 120px;
    }
    .menu-pop.open { display: flex; }
    .menu-pop button {
      background: none;
      border: none;
      color: white;
      padding: 6px 12px;
      text-align: left;
      cursor: pointer;
    }
    .menu-pop button:hover { background: #333; }
    /* Panel lateral superpuesto (overlay) */
    .player-side {
      position: absolute;
      top: 0;
      right: -100%;
      width: 100%;
      max-width: 380px;
      height: 100%;
      background: rgba(0,0,0,0.9);
      backdrop-filter: blur(12px);
      z-index: 50;
      transition: right 0.3s ease;
      overflow-y: auto;
    }
    .player-side.open {
      right: 0;
    }
    .side-inner {
      padding: 20px;
      color: white;
    }
    .side-close {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      float: right;
      cursor: pointer;
    }
    .side-ep-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 20px;
    }
    .side-ep-item {
      display: flex;
      gap: 12px;
      cursor: pointer;
      padding: 8px;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
    }
    .side-ep-item.active { background: #e50914; }
    .side-ep-item .t {
      width: 60px;
      height: 60px;
      background-size: cover;
      background-position: center;
      border-radius: 4px;
    }
    /* Estilos para los botones centrales */
    .center-controls {
      position: absolute;
      bottom: 50%;
      left: 50%;
      transform: translate(-50%, 50%);
      display: flex;
      gap: 24px;
      z-index: 20;
      transition: opacity 0.3s, visibility 0.3s;
    }
    /* Modo Normal: Botón Play elegante (blanco) */
    body:not(.embed-mode) .center-controls .ctrl-center {
      background: rgba(0,0,0,0.6);
      border-radius: 50%;
      width: 70px;
      height: 70px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      box-shadow: 0 0 20px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.2);
      transition: transform 0.2s, background 0.2s;
      cursor: pointer;
    }
    body:not(.embed-mode) .center-controls .ctrl-center svg {
      width: 40px;
      height: 40px;
      color: white;
      filter: drop-shadow(0 0 2px black);
    }
    body:not(.embed-mode) .center-controls .ctrl-center:hover {
      transform: scale(1.05);
      background: rgba(0,0,0,0.8);
    }
    /* Modo Embed: Botones centrales con degradado circular tenue y botón blanco */
    body.embed-mode .center-controls {
      gap: clamp(12px, 5vw, 32px);
    }
    body.embed-mode .ctrl-center {
      background: radial-gradient(circle at center, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 80%);
      border: none;
      width: clamp(48px, 10vw, 70px);
      height: clamp(48px, 10vw, 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.1s;
    }
    body.embed-mode .ctrl-center.main {
      width: clamp(56px, 12vw, 84px);
      height: clamp(56px, 12vw, 84px);
    }
    body.embed-mode .ctrl-center svg {
      width: 60%;
      height: 60%;
      color: white !important;
      filter: drop-shadow(0 0 4px black);
    }
    body.embed-mode .ctrl-center img {
      width: 60%;
      height: 60%;
      filter: drop-shadow(0 0 4px black);
    }
    /* Ocultar controles por inactividad (normal) o por toggle (embed) */
    .player-controls.hide-controls,
    .center-controls.hide-controls,
    .embed-header.hide-controls {
      opacity: 0;
      visibility: hidden;
    }
    /* Cabecera embed */
    body.embed-mode .embed-header {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 30;
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(90deg, rgba(0,0,0,0.6), transparent);
      padding: 8px 16px;
      border-radius: 40px;
      pointer-events: none;
      transition: opacity 0.3s;
    }
    body.embed-mode .embed-logo {
      height: clamp(24px, 5vw, 40px);
      width: auto;
    }
    body.embed-mode .embed-title {
      color: white;
      font-size: clamp(12px, 3vw, 18px);
      font-weight: 500;
      text-shadow: 0 1px 2px black;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60vw;
    }
    /* Estilos para el Modal y Toast (sin cambios) */
    .nk-modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.8);
      backdrop-filter: blur(5px);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s, visibility 0.3s;
    }
    .nk-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.9);
      background: #1e1e1e;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      z-index: 1001;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s, visibility 0.3s, transform 0.3s;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      border: 1px solid rgba(255,255,255,0.1);
    }
    .nk-modal.active,
    .nk-modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .nk-modal.active {
      transform: translate(-50%, -50%) scale(1);
    }
    .nk-modal-header {
      padding: 16px 20px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .nk-modal-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #fff;
    }
    .nk-modal-close {
      background: none;
      border: none;
      color: #fff;
      font-size: 24px;
      cursor: pointer;
      opacity: 0.7;
      transition: opacity 0.2s;
    }
    .nk-modal-close:hover {
      opacity: 1;
    }
    .nk-modal-body {
      padding: 20px;
      color: #e0e0e0;
      line-height: 1.5;
    }
    .nk-modal-body button {
      background: #333;
      border: none;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      margin: 8px;
    }
    .nk-modal-body button:hover {
      background: #555;
    }
    .nk-toast {
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: #333;
      color: white;
      padding: 12px 24px;
      border-radius: 40px;
      z-index: 1100;
      transition: transform 0.3s;
      font-size: 14px;
      pointer-events: none;
    }
    .nk-toast.show {
      transform: translateX(-50%) translateY(0);
    }
    .nk-toast-info { background: #2196f3; }
    .nk-toast-success { background: #4caf50; }
    .nk-toast-error { background: #f44336; }
    html {
      scroll-behavior: smooth;
    }
  `;
  document.head.appendChild(style);
}

export const meta = (ctx) => {
  const ep = ctx?.episodio;
  if (!ep) return { title: 'Reproductor — NikichitonJesús TV' };
  return {
    title: `${ep.title} — NikichitonJesús TV`,
    description: ep.description,
    image: ep.coverUrl
  };
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

export function render(container, ctx) {
  injectEssentialStyles();
  if (!isEmbedMode()) {
    window.scrollTo(0, 0);
    if (container.scrollTo) container.scrollTo(0, 0);
  }

  const { episodio, queue, queueIndex, serie } = ctx;
  const sugeridos = recomendar(episodio, 8);
  const embed = isEmbedMode();

  const reclaim = ctx.reclaimPipMedia?.(episodio);
  const initialMode = reclaim
    ? (reclaim.tagName === 'VIDEO' ? 'video' : 'audio')
    : (episodio.hasVideo && episodio.initialMode !== 'audio' ? 'video' : 'audio');

  container.innerHTML = `
    <div class="watch">
      <section class="player-stage" style="--stage-bg:${escapeAttr(episodio.bgColor || '#0a0a0a')}">
        <div class="player-area" id="player-area" data-mode="${initialMode}">
          ${embed ? `
            <div class="embed-header" id="embed-header">
              <img class="embed-logo" src="https://nikichitonjesus.odoo.com/web/image/1668-134717bf/Comp%20Logo%20con%20fondo.svg" alt="Logo">
              <span class="embed-title">${escapeHtml(episodio.title)}</span>
            </div>
          ` : ''}
          <div class="media-host" id="media-host"></div>
          <div class="player-gradient"></div>
          <div class="center-controls ${embed ? 'embed-center' : ''}" id="center-controls">
            ${embed ? `
              <button class="ctrl-center" data-act="back10" title="Retroceder 10s">${IMG_ICONS.back10}</button>
              <button class="ctrl-center main" data-act="toggle" title="Play/Pause (Espacio)">${ICONS.play}</button>
              <button class="ctrl-center" data-act="fwd10" title="Avanzar 10s">${IMG_ICONS.fwd10}</button>
            ` : `
              <button class="ctrl-center" data-act="toggle" id="center-play">${ICONS.play}</button>
            `}
          </div>
          ${controlsHTML(episodio, queue.length > 1, embed)}
        </div>
        <aside class="player-side" id="player-side">
          <div class="side-inner" id="side-inner"></div>
        </aside>
      </section>

      ${!embed ? `
        <div class="watch-info">
          <h1 class="watch-title">${escapeHtml(episodio.title)}</h1>
          <div class="watch-meta-row">
            <span class="watch-author">${escapeHtml(episodio.author || '')}</span>
            <span>· ${formatDate(episodio.date)}</span>
            ${episodio.categoria ? `<span>· ${escapeHtml(episodio.categoria)}</span>` : ''}
            <div class="watch-actions">
              <button id="btn-like" class="${isLiked(episodio.id) ? 'liked' : ''}">❤ <span>${isLiked(episodio.id) ? 'Te gusta' : 'Me gusta'}</span></button>
              <button id="btn-share">↗ Compartir</button>
              <button id="btn-embed">&lt;&gt; Incrustar</button>
              <button id="btn-report">⚠️ Reportar</button>
              ${episodio.allowDownload ? `<button id="btn-download">⬇ Descargar</button>` : ''}
            </div>
          </div>
          ${episodio.description ? `<div class="watch-description">${escapeHtml(episodio.description)}</div>` : ''}
        </div>

        <div class="watch-below ${serie ? 'has-series' : ''}">
          <section>
            <h2 style="margin:0 0 14px;font-size:18px;">Te puede interesar</h2>
            <div class="suggest-grid">
              ${sugeridos.map(e => suggestCardHTML(e)).join('')}
            </div>
          </section>
          ${serie ? seriesPanelHTML(serie, queue, episodio) : ''}
        </div>
      ` : ''}
    </div>
  `;

  const host = container.querySelector('#media-host');
  const audioCoverHTML = `<div class="player-audio-cover"><img src="${escapeAttr(episodio.coverUrl)}" alt="${escapeAttr(episodio.title)}"/><div class="audio-pulse"></div></div>`;

  let media;
  if (reclaim) {
    media = reclaim;
    media.classList.add(initialMode === 'video' ? 'player-media' : 'player-audio');
    if (initialMode === 'audio') host.insertAdjacentHTML('beforeend', audioCoverHTML);
    host.appendChild(media);
  } else {
    media = createMediaElement(initialMode, episodio);
    if (initialMode === 'audio') host.insertAdjacentHTML('beforeend', audioCoverHTML);
    host.appendChild(media);
  }

  active = { episodio, container, ctx, queue, queueIndex };
  setupPlayer(container, media, episodio, queue, queueIndex, ctx, initialMode, embed);
  setupActions(container, episodio, ctx);

  container.querySelectorAll('[data-ep-link]').forEach(el => {
    el.addEventListener('click', () => ctx.navigate(el.dataset.epLink));
  });

  trackView(episodio);
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

function controlsHTML(ep, hasQueue, embed) {
  const canSwitch = ep.hasVideo && ep.hasAudio;
  const modeIcon = IMG_ICONS.modeVideo;
  return `
    <div class="player-controls ${embed ? 'embed-controls' : ''}" id="player-controls">
      <div class="progress-row">
        <div class="seekbar" id="seekbar">
          <div class="seek-buffer" id="seek-buffer"></div>
          <div class="seek-fill" id="seek-fill"></div>
          <div class="seek-thumb" id="seek-thumb"></div>
          <input type="range" id="seek" min="0" max="1000" step="1" value="0" aria-label="Progreso"/>
        </div>
      </div>
      <div class="controls-row">
        <button class="ctrl" data-act="toggle" id="btn-toggle" title="Play/Pause (Espacio)">${ICONS.play}</button>
        <button class="ctrl" data-act="prev" title="Anterior" ${hasQueue ? '' : 'disabled'}>${ICONS.prev}</button>
        ${!embed ? `<button class="ctrl" data-act="back10" title="-10s (←)">${IMG_ICONS.back10}</button>` : ''}
        ${!embed ? `<button class="ctrl" data-act="fwd10" title="+10s (→)">${IMG_ICONS.fwd10}</button>` : ''}
        <button class="ctrl" data-act="next" title="Siguiente" ${hasQueue ? '' : 'disabled'}>${ICONS.next}</button>
        <div class="volume-wrap">
          <button class="ctrl" data-act="mute" id="btn-mute" title="Silenciar (M)">${ICONS.vol}</button>
          <input type="range" id="vol" min="0" max="1" step="0.01" value="1" aria-label="Volumen"/>
        </div>
        <div class="time-display"><span id="t-current">0:00</span> / <span id="t-total">0:00</span></div>
        <div class="spacer"></div>
        ${canSwitch ? `<button class="ctrl" data-act="switch-mode" id="btn-mode" title="Cambiar audio/video">${modeIcon}</button>` : ''}
        ${!embed && hasQueue ? `<button class="ctrl" data-act="toggle-queue" title="Lista de episodios">${ICONS.queue}</button>` : ''}
        <div class="menu-wrap">
          <button class="ctrl" data-act="menu" title="Opciones">${ICONS.settings}</button>
          <div class="menu-pop" id="menu-pop">
            <div class="menu-section">Velocidad</div>
            <button data-rate="0.5">0.5x</button>
            <button data-rate="0.75">0.75x</button>
            <button data-rate="1" class="default">Normal</button>
            <button data-rate="1.25">1.25x</button>
            <button data-rate="1.5">1.5x</button>
            <button data-rate="2">2x</button>
            ${ep.mediaCalidadbaja ? `<div class="menu-section">Calidad</div>
              <button data-quality="alta" class="default">Alta</button>
              <button data-quality="baja">Baja (datos)</button>` : ''}
            ${ep.subtitlesUrl ? `<div class="menu-section">Subtítulos</div><button data-act="subs">Activar/Desactivar</button>` : ''}
          </div>
        </div>
        ${!embed ? `<button class="ctrl" data-act="minimize" title="Mini reproductor (PIP)">${ICONS.pip}</button>` : ''}
        <button class="ctrl" data-act="fullscreen" id="btn-fullscreen" title="Pantalla completa (F)">${ICONS.full}</button>
      </div>
    </div>
  `;
}

function suggestCardHTML(ep) {
  const tipoImg = ep.hasVideo
    ? '<img src="https://nikichitonjesus.odoo.com/web/image/1110-40385f0d/video.webp" style="width:16px; height:16px; object-fit:contain;" alt="video">'
    : '<img src="https://nikichitonjesus.odoo.com/web/image/625-e42b8a86/audio.png" style="width:16px; height:16px; object-fit:contain;" alt="audio">';
  return `<article class="ep-card" data-ep-link="${escapeAttr(ep.detailUrl)}">
    <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')">
      <span class="badge">${tipoImg}</span>
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

// =========================================================
// Lógica del reproductor con comportamiento diferenciado
// =========================================================
function setupPlayer(root, media, ep, queue, queueIndex, ctx, initialMode, embed) {
  const area = root.querySelector('#player-area');
  const seek = root.querySelector('#seek');
  const seekFill = root.querySelector('#seek-fill');
  const seekBuf = root.querySelector('#seek-buffer');
  const seekThumb = root.querySelector('#seek-thumb');
  const tCur = root.querySelector('#t-current');
  const tTot = root.querySelector('#t-total');
  const btnToggle = root.querySelector('#btn-toggle');
  const btnMute = root.querySelector('#btn-mute');
  const vol = root.querySelector('#vol');
  const sideInner = root.querySelector('#side-inner');
  const side = root.querySelector('#player-side');
  const menuPop = root.querySelector('#menu-pop');
  const centerControls = root.querySelector('#center-controls');
  const embedHeader = root.querySelector('#embed-header');
  const modeBtn = root.querySelector('#btn-mode');
  const btnFullscreen = root.querySelector('#btn-fullscreen');

  let currentMode = initialMode;
  let controlsTimeout;
  let seekingUser = false;
  let isFullscreen = false;
  let controlsVisible = true; // solo para embed

  // Funciones para mostrar/ocultar controles (ambos modos)
  const hideControls = () => {
    const ctrlGroup = root.querySelector('.player-controls');
    if (ctrlGroup) ctrlGroup.classList.add('hide-controls');
    if (centerControls) centerControls.classList.add('hide-controls');
    if (embed && embedHeader) embedHeader.classList.add('hide-controls');
    controlsVisible = false;
  };
  const showControls = () => {
    const ctrlGroup = root.querySelector('.player-controls');
    if (ctrlGroup) ctrlGroup.classList.remove('hide-controls');
    if (centerControls) centerControls.classList.remove('hide-controls');
    if (embed && embedHeader) embedHeader.classList.remove('hide-controls');
    controlsVisible = true;
  };
  const toggleControls = () => {
    if (controlsVisible) hideControls();
    else showControls();
  };

  // Configuración según modo
  if (embed) {
    // Modo embed: los controles se muestran/ocultan con un clic en el área (no sobre botones)
    // Inicialmente visibles
    showControls();
    // Evento de clic en el área (no en botones) para toggle
    const onAreaClickEmbed = (e) => {
      if (e.target.closest('.ctrl') || e.target.closest('.ctrl-center') || e.target.closest('.menu-wrap') || e.target.closest('.volume-wrap')) return;
      toggleControls();
    };
    area.addEventListener('click', onAreaClickEmbed);
    // Guardar limpieza
    active._cleanupExtra = () => {
      area.removeEventListener('click', onAreaClickEmbed);
    };
  } else {
    // Modo normal: auto-ocultado con hover/inactividad
    const hideControlsNormal = () => {
      const ctrlGroup = root.querySelector('.player-controls');
      if (ctrlGroup) ctrlGroup.classList.add('hide-controls');
      if (centerControls) centerControls.classList.add('hide-controls');
    };
    const showControlsNormal = () => {
      const ctrlGroup = root.querySelector('.player-controls');
      if (ctrlGroup) ctrlGroup.classList.remove('hide-controls');
      if (centerControls) centerControls.classList.remove('hide-controls');
      clearTimeout(controlsTimeout);
      if (!media.paused) {
        controlsTimeout = setTimeout(() => {
          hideControlsNormal();
        }, 3000);
      }
    };
    // Mostrar al inicio
    showControlsNormal();
    area.addEventListener('mousemove', showControlsNormal);
    area.addEventListener('mouseleave', () => {
      if (!media.paused) hideControlsNormal();
    });
    // El clic en el área pausa/reproduce (ya se maneja aparte con onAreaClick)
    active._cleanupExtra = () => {
      area.removeEventListener('mousemove', showControlsNormal);
      area.removeEventListener('mouseleave', hideControlsNormal);
    };
  }

  // Evento común de clic en el área para play/pause (solo en normal, en embed no porque ya tiene toggle)
  const onAreaClick = (e) => {
    if (e.target.closest('.ctrl') || e.target.closest('.ctrl-center') || e.target.closest('.menu-wrap') || e.target.closest('.volume-wrap')) return;
    if (!embed) {
      // Modo normal: pausar/reproducir
      media.paused ? media.play() : media.pause();
    }
    // En embed ya manejamos el toggle por separado, no hacemos nada aquí
  };
  area.addEventListener('click', onAreaClick);

  // Actualizar icono del botón de modo
  const updateModeIcon = () => {
    if (modeBtn) {
      modeBtn.innerHTML = currentMode === 'video' ? IMG_ICONS.modeVideo : IMG_ICONS.modeAudio;
    }
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

  const syncToggle = () => {
    const isPaused = media.paused;
    const playPauseIcon = isPaused ? ICONS.play : ICONS.pause;
    if (btnToggle) btnToggle.innerHTML = playPauseIcon;
    if (centerControls) {
      const centerPlayBtn = centerControls.querySelector('[data-act="toggle"]');
      if (centerPlayBtn) centerPlayBtn.innerHTML = playPauseIcon;
    }
    if (!embed) {
      const centerPlayOriginal = root.querySelector('#center-play');
      if (centerPlayOriginal) centerPlayOriginal.innerHTML = playPauseIcon;
    }
  };
  syncToggle();

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

  media.addEventListener('error', () => {
    console.warn('Media error', media.error);
    if (centerControls) centerControls.innerHTML = `<div style="font-size:14px;text-align:center;padding:20px;">⚠️ No se pudo cargar el medio</div>`;
  });

  media.addEventListener('play', () => { syncToggle(); updateMediaSession(ep, media); area.classList.add('playing'); });
  media.addEventListener('pause', syncToggle);
  media.addEventListener('timeupdate', () => {
    if (media.duration && !seekingUser) {
      const pct = (media.currentTime / media.duration) * 100;
      seekFill.style.width = pct + '%';
      seekThumb.style.left = pct + '%';
      seek.value = pct * 10;
      tCur.textContent = formatTime(media.currentTime);
      saveProgress(ep.id, media.currentTime, media.duration);
    }
  });
  media.addEventListener('progress', () => {
    if (media.buffered.length && media.duration) {
      const end = media.buffered.end(media.buffered.length - 1);
      seekBuf.style.width = ((end / media.duration) * 100) + '%';
    }
  });
  media.addEventListener('loadedmetadata', () => { tTot.textContent = formatTime(media.duration); });
  media.addEventListener('ended', () => {
    if (queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
  });
  media.addEventListener('volumechange', () => {
    if (btnMute) btnMute.innerHTML = (media.muted || media.volume === 0) ? ICONS.mute : ICONS.vol;
    vol.value = media.muted ? 0 : media.volume;
  });

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

  vol.value = media.muted ? 0 : media.volume;
  vol.addEventListener('input', () => {
    media.volume = parseFloat(vol.value);
    media.muted = media.volume === 0;
  });

  const togglePlayPause = () => { media.paused ? media.play() : media.pause(); };

  // Acciones de botones (independientes del modo)
  root.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'toggle') togglePlayPause();
      else if (act === 'back10') media.currentTime = Math.max(0, media.currentTime - 10);
      else if (act === 'fwd10') media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
      else if (act === 'prev' && queueIndex > 0) ctx.navigate(queue[queueIndex - 1].detailUrl);
      else if (act === 'next' && queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
      else if (act === 'mute') media.muted = !media.muted;
      else if (act === 'switch-mode') {
        const newMode = currentMode === 'video' ? 'audio' : 'video';
        currentMode = newMode;
        updateModeIcon();
        switchMode(area, ep, newMode, media, ctx);
      }
      else if (act === 'toggle-queue') toggleSidePanel(side, sideInner, 'queue', ep, queue, ctx);
      else if (act === 'minimize') {
        ctx.minimizeToPip?.();
        ctx.navigate('/');
      }
      else if (act === 'fullscreen') {
        if (!document.fullscreenElement) {
          area.requestFullscreen?.();
          isFullscreen = true;
          if (btnFullscreen) btnFullscreen.innerHTML = ICONS.fullExit;
        } else {
          document.exitFullscreen();
          isFullscreen = false;
          if (btnFullscreen) btnFullscreen.innerHTML = ICONS.full;
        }
      }
      else if (act === 'menu') menuPop.classList.toggle('open');
      else if (act === 'subs' && ep.subtitlesUrl) {
        const tr = media.textTracks[0];
        if (tr) tr.mode = tr.mode === 'showing' ? 'hidden' : 'showing';
      }
    });
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      isFullscreen = true;
      if (btnFullscreen) btnFullscreen.innerHTML = ICONS.fullExit;
    } else {
      isFullscreen = false;
      if (btnFullscreen) btnFullscreen.innerHTML = ICONS.full;
    }
  });

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
      media.addEventListener('loadedmetadata', () => { media.currentTime = t; if (wasPlaying) media.play(); }, { once: true });
      menuPop.classList.remove('open');
    });
  });

  const outsideClose = (e) => {
    if (!e.target.closest('.menu-wrap')) menuPop?.classList.remove('open');
  };
  document.addEventListener('click', outsideClose);

  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
    else if (e.code === 'ArrowLeft') media.currentTime = Math.max(0, media.currentTime - 10);
    else if (e.code === 'ArrowRight') media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
    else if (e.code === 'ArrowUp') { e.preventDefault(); media.volume = Math.min(1, media.volume + 0.05); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); media.volume = Math.max(0, media.volume - 0.05); }
    else if (e.key === 'm' || e.key === 'M') media.muted = !media.muted;
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) {
        area.requestFullscreen?.();
      } else {
        document.exitFullscreen();
      }
    }
  };
  document.addEventListener('keydown', onKey);

  active._cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', outsideClose);
    area.removeEventListener('click', onAreaClick);
    if (active._cleanupExtra) active._cleanupExtra();
  };

  ctx.registerPlayer?.({
    media, episodio: ep, queue, queueIndex, mode: currentMode,
    play: () => media.play(), pause: () => media.pause(),
    isPaused: () => media.paused,
    next: () => queueIndex < queue.length - 1 && ctx.navigate(queue[queueIndex + 1].detailUrl),
    prev: () => queueIndex > 0 && ctx.navigate(queue[queueIndex - 1].detailUrl)
  });
}

function setMediaSrc(media, ep, mode) {
  if (mode === 'video' && ep.mediaVideo) media.src = ep.mediaVideo;
  else if (ep.mediaUrl) media.src = ep.mediaUrl;
  else if (ep.mediaVideo) media.src = ep.mediaVideo;
}

function switchMode(area, ep, newMode, oldMedia, ctx) {
  const t = oldMedia.currentTime;
  const wasPlaying = !oldMedia.paused;
  const vol = oldMedia.volume;
  const muted = oldMedia.muted;
  oldMedia.pause();

  const host = area.querySelector('#media-host');
  host.innerHTML = '';
  if (newMode === 'audio') {
    host.insertAdjacentHTML('beforeend',
      `<div class="player-audio-cover"><img src="${escapeAttr(ep.coverUrl)}" alt=""/><div class="audio-pulse"></div></div>`);
  }
  const media = createMediaElement(newMode, ep);
  host.appendChild(media);
  area.dataset.mode = newMode;

  media.volume = vol; media.muted = muted;
  media.addEventListener('loadedmetadata', () => {
    try { media.currentTime = t; } catch {}
    if (wasPlaying) media.play();
  }, { once: true });

  ctx.navigate(ep.detailUrl);
}

function toggleSidePanel(side, inner, kind, ep, queue, ctx) {
  if (side.classList.contains('open') && side.dataset.kind === kind) {
    side.classList.remove('open'); return;
  }
  side.dataset.kind = kind;
  inner.innerHTML = `<button class="side-close">✕</button>
    <h3>Lista de episodios</h3>
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
    modal.show('Compartir', `<p>Comparte este episodio:</p><input type="text" value="${url}" readonly><br><button id="copy-share-link">Copiar enlace</button>`);
    setTimeout(() => {
      document.getElementById('copy-share-link')?.addEventListener('click', () => {
        navigator.clipboard.writeText(url);
        modal.hide();
        showToast('Enlace copiado al portapapeles', 'success');
      });
    }, 100);
  });
  
  root.querySelector('#btn-embed')?.addEventListener('click', () => {
    const code = `<iframe src="${location.origin}/embed${ep.detailUrl}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    modal.show('Código para incrustar', `<p>Copia este código HTML para incrustar el reproductor:</p><textarea rows="4" readonly>${escapeHtml(code)}</textarea><br><button id="copy-embed-code">Copiar código</button>`);
    setTimeout(() => {
      document.getElementById('copy-embed-code')?.addEventListener('click', () => {
        navigator.clipboard.writeText(code);
        modal.hide();
        showToast('Código copiado al portapapeles', 'success');
      });
    }, 100);
  });
  
  root.querySelector('#btn-report')?.addEventListener('click', () => {
    const reportHtml = `
      <p>¿Has encontrado un problema con este contenido?</p>
      <div style="display: flex; justify-content: space-around; margin-top: 20px;">
        <button id="report-action" style="background:#e50914;">Reportar</button>
        <button id="report-close">Cerrar</button>
      </div>
    `;
    modal.show('Reportar problema', reportHtml);
    setTimeout(() => {
      const reportBtn = document.getElementById('report-action');
      const closeBtn = document.getElementById('report-close');
      if (reportBtn) {
        reportBtn.addEventListener('click', () => {
          window.open('https://forms.gle/ejemplo', '_blank');
          modal.hide();
        });
      }
      if (closeBtn) {
        closeBtn.addEventListener('click', () => modal.hide());
      }
    }, 100);
  });
  
  root.querySelector('#btn-download')?.addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = ep.mediaVideo || ep.mediaUrl; a.download = ep.title; a.click();
  });
}

function updateMediaSession(ep, media) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ep.title, artist: ep.author || '', album: ep.seriesid || '',
      artwork: [{ src: ep.coverUrl, sizes: '512x512' }]
    });
    navigator.mediaSession.setActionHandler('play', () => media.play());
    navigator.mediaSession.setActionHandler('pause', () => media.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => media.currentTime -= 10);
    navigator.mediaSession.setActionHandler('seekforward', () => media.currentTime += 10);
  } catch {}
}

function formatDate(d) {
  try { return new Date(d).toLocaleDateString('es-ES', { year:'numeric', month:'short', day:'numeric' }); }
  catch { return d || ''; }
}

export function teardown() {
  try { active?._cleanup?.(); } catch {}
  active = null;
}
