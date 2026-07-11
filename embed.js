// =============================================================
// Embed.js — Reproductor para incrustar (iframe o div)
// Comportamiento: ocupar todo el contenedor, controles toggle por clic
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
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>'
};

const IMG_ICONS = {
  back10:
    '<img src="https://video-nikichitonjesus.odoo.com/web/image/438-deea748f/-10.webp" alt="-10" style="width:100%;height:100%;object-fit:contain;">',
  fwd10:
    '<img src="https://video-nikichitonjesus.odoo.com/web/image/439-9448d521/%2B10.webp" alt="+10" style="width:100%;height:100%;object-fit:contain;">'
};

// ========== ESTADO GLOBAL ==========
let active = null;

// ========== ESTILOS (solo para embed) ==========
function injectEmbedStyles() {
  if (document.getElementById('embed-styles')) return;
  const style = document.createElement('style');
  style.id = 'embed-styles';
  style.textContent = `
    /* === Embed: ocupar todo el espacio, sin scroll === */
    body.embed-mode {
      margin: 0;
      padding: 0;
      overflow: hidden;
      height: 100%;
      min-height: 100vh;
      background: #000;
    }
    .embed-container {
      width: 100%;
      height: 100%;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #0a0a0a;
      position: relative;
    }
    .embed-player {
      flex: 1;
      position: relative;
      background: #0a0a0a;
      overflow: hidden;
    }
    .embed-media-host {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #000;
    }
    .embed-media-host video,
    .embed-media-host audio {
      width: 100%;
      height: 100%;
      display: block;
      background: #000;
    }
    .embed-audio-cover {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0,0,0,0.5);
    }
    .embed-audio-cover img {
      max-width: 70%;
      max-height: 70%;
      object-fit: contain;
      border-radius: 12px;
      box-shadow: 0 0 40px rgba(0,0,0,0.8);
    }
    .embed-audio-pulse {
      position: absolute;
      inset: 20%;
      border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.1);
      animation: pulse-embed 2s infinite;
    }
    @keyframes pulse-embed {
      0% { transform: scale(0.95); opacity: 0.7; }
      50% { transform: scale(1.05); opacity: 0.3; }
      100% { transform: scale(0.95); opacity: 0.7; }
    }

    /* Cabecera con logo y título (opcional) */
    .embed-header {
      position: absolute;
      top: 16px;
      left: 16px;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 12px;
      background: linear-gradient(90deg, rgba(0,0,0,0.6), transparent);
      padding: 8px 16px;
      border-radius: 40px;
      pointer-events: none;
      transition: opacity 0.3s, visibility 0.3s;
    }
    .embed-logo {
      height: clamp(24px, 4vw, 40px);
      width: auto;
    }
    .embed-title {
      color: #fff;
      font-size: clamp(12px, 2.5vw, 18px);
      font-weight: 500;
      text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 60vw;
    }

    /* Controles flotantes (siempre encima) */
    .embed-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
      padding: 20px 16px 12px;
      transition: opacity 0.35s ease, visibility 0.35s ease;
      z-index: 10;
    }
    .embed-controls-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .embed-ctrl {
      background: none;
      border: none;
      color: #fff;
      width: 36px;
      height: 36px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: transform 0.15s;
    }
    .embed-ctrl:hover {
      transform: scale(1.1);
      background: rgba(255,255,255,0.1);
    }
    .embed-ctrl svg,
    .embed-ctrl img {
      width: 100%;
      height: 100%;
      fill: currentColor;
    }
    .embed-vol-wrap {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .embed-vol {
      width: 60px;
      accent-color: #e50914;
    }
    .embed-time {
      color: #fff;
      font-size: 12px;
      font-family: monospace;
    }
    .embed-spacer {
      flex: 1;
    }

    /* Barra de progreso */
    .embed-progress {
      margin-bottom: 8px;
    }
    .embed-seekbar {
      position: relative;
      width: 100%;
      height: 4px;
      background: rgba(255,255,255,0.2);
      cursor: pointer;
      border-radius: 2px;
    }
    .embed-seek-fill {
      position: absolute;
      height: 100%;
      top: 0;
      left: 0;
      background: #e50914;
      border-radius: 2px;
      pointer-events: none;
      width: 0;
      z-index: 1;
    }
    .embed-seek-thumb {
      position: absolute;
      top: 50%;
      transform: translate(-50%, -50%);
      width: 14px;
      height: 14px;
      background: #e50914;
      border-radius: 50%;
      z-index: 2;
      pointer-events: none;
      left: 0;
      box-shadow: 0 0 8px rgba(229,9,20,0.6);
    }
    .embed-seek-input {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0;
      cursor: pointer;
      z-index: 3;
    }

    /* Botones centrales (embed) */
    .embed-center-controls {
      position: absolute;
      bottom: 50%;
      left: 50%;
      transform: translate(-50%, 50%);
      display: flex;
      gap: clamp(12px, 5vw, 32px);
      z-index: 5;
      transition: opacity 0.35s ease, visibility 0.35s ease;
      pointer-events: none;
    }
    .embed-center-controls .embed-ctrl-center {
      pointer-events: auto;
      background: radial-gradient(circle at center, rgba(0,0,0,0.5) 0%, transparent 80%);
      border: none;
      width: clamp(48px, 10vw, 70px);
      height: clamp(48px, 10vw, 70px);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: transform 0.15s;
    }
    .embed-center-controls .embed-ctrl-center.main {
      width: clamp(56px, 12vw, 84px);
      height: clamp(56px, 12vw, 84px);
    }
    .embed-center-controls .embed-ctrl-center svg {
      width: 60%;
      height: 60%;
      color: #fff;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));
    }
    .embed-center-controls .embed-ctrl-center img {
      width: 60%;
      height: 60%;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.7));
    }
    .embed-center-controls .embed-ctrl-center:hover {
      transform: scale(1.05);
    }

    /* Ocultar controles (toggle) */
    .embed-controls.hide-controls,
    .embed-center-controls.hide-controls,
    .embed-header.hide-controls {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    /* Ajustes para pantallas pequeñas */
    @media (max-width: 600px) {
      .embed-controls-row .embed-ctrl {
        width: 30px;
        height: 30px;
      }
      .embed-vol {
        width: 40px;
      }
    }
  `;
  document.head.appendChild(style);
}

// ========== FUNCIONES DE RENDER ==========
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

export function render(container, ctx) {
  // Detener reproducción anterior
  if (active) {
    active._cleanup?.();
    if (active.media) {
      active.media.pause();
      active.media.src = '';
    }
    active = null;
  }

  injectEmbedStyles();
  document.body.classList.add('embed-mode');

  const { episodio, queue, queueIndex } = ctx;
  const reclaim = ctx.reclaimPipMedia?.(episodio);
  const initialMode = reclaim
    ? (reclaim.tagName === 'VIDEO' ? 'video' : 'audio')
    : (episodio.hasVideo && episodio.initialMode !== 'audio' ? 'video' : 'audio');

  container.innerHTML = `
    <div class="embed-container">
      <div class="embed-player" id="embed-player" data-mode="${initialMode}">
        <div class="embed-header" id="embed-header">
          <img class="embed-logo" src="https://nikichitonjesus.odoo.com/web/image/1668-134717bf/Comp%20Logo%20con%20fondo.svg" alt="Logo">
          <span class="embed-title">${escapeHtml(episodio.title)}</span>
        </div>
        <div class="embed-media-host" id="embed-media-host"></div>

        <!-- Controles centrales -->
        <div class="embed-center-controls" id="embed-center-controls">
          <button class="embed-ctrl-center" data-act="back10" title="Retroceder 10s">${IMG_ICONS.back10}</button>
          <button class="embed-ctrl-center main" data-act="toggle" id="embed-center-play">${ICONS.play}</button>
          <button class="embed-ctrl-center" data-act="fwd10" title="Avanzar 10s">${IMG_ICONS.fwd10}</button>
        </div>

        <!-- Controles inferiores -->
        <div class="embed-controls" id="embed-controls">
          <div class="embed-progress">
            <div class="embed-seekbar" id="embed-seekbar">
              <div class="embed-seek-fill" id="embed-seek-fill"></div>
              <div class="embed-seek-thumb" id="embed-seek-thumb"></div>
              <input type="range" id="embed-seek" min="0" max="1000" step="1" value="0" class="embed-seek-input"/>
            </div>
          </div>
          <div class="embed-controls-row">
            <button class="embed-ctrl" data-act="toggle" id="embed-btn-toggle" title="Play/Pause">${ICONS.play}</button>
            <button class="embed-ctrl" data-act="prev" title="Anterior" ${queue.length > 1 ? '' : 'disabled'}>${ICONS.prev}</button>
            <button class="embed-ctrl" data-act="next" title="Siguiente" ${queue.length > 1 ? '' : 'disabled'}>${ICONS.next}</button>
            <div class="embed-vol-wrap">
              <button class="embed-ctrl" data-act="mute" id="embed-btn-mute" title="Silenciar">${ICONS.vol}</button>
              <input type="range" id="embed-vol" min="0" max="1" step="0.01" value="1" class="embed-vol"/>
            </div>
            <div class="embed-time"><span id="embed-current">0:00</span> / <span id="embed-total">0:00</span></div>
            <div class="embed-spacer"></div>
            <button class="embed-ctrl" data-act="fullscreen" id="embed-fullscreen" title="Pantalla completa (F)">${ICONS.full}</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const host = container.querySelector('#embed-media-host');
  const audioCoverHTML = `<div class="embed-audio-cover"><img src="${escapeAttr(episodio.coverUrl)}" alt="${escapeAttr(episodio.title)}"/><div class="embed-audio-pulse"></div></div>`;

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

  active = { episodio, container, ctx, queue, queueIndex, media };
  setupEmbedPlayer(container, media, episodio, queue, queueIndex, ctx, initialMode);
  trackView(episodio);
}

// ========== AUXILIARES ==========
function createMediaElement(mode, ep) {
  const el = document.createElement(mode === 'video' ? 'video' : 'audio');
  el.id = 'embed-media';
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

// ========== LÓGICA DEL REPRODUCTOR EMBED ==========
function setupEmbedPlayer(root, media, ep, queue, queueIndex, ctx, initialMode) {
  const area = root.querySelector('#embed-player');
  const seek = root.querySelector('#embed-seek');
  const seekFill = root.querySelector('#embed-seek-fill');
  const seekThumb = root.querySelector('#embed-seek-thumb');
  const tCur = root.querySelector('#embed-current');
  const tTot = root.querySelector('#embed-total');
  const btnToggle = root.querySelector('#embed-btn-toggle');
  const btnMute = root.querySelector('#embed-btn-mute');
  const vol = root.querySelector('#embed-vol');
  const centerControls = root.querySelector('#embed-center-controls');
  const centerPlay = root.querySelector('#embed-center-play');
  const controls = root.querySelector('#embed-controls');
  const header = root.querySelector('#embed-header');
  const btnFullscreen = root.querySelector('#embed-fullscreen');

  let currentMode = initialMode;
  let seekingUser = false;
  let controlsVisible = true;

  // ========== TOGGLE CONTROLS (clic en el área, excepto botones) ==========
  const toggleControls = () => {
    controlsVisible = !controlsVisible;
    controls.classList.toggle('hide-controls', !controlsVisible);
    centerControls.classList.toggle('hide-controls', !controlsVisible);
    header.classList.toggle('hide-controls', !controlsVisible);
  };

  // Mostrar al inicio
  controlsVisible = true;
  controls.classList.remove('hide-controls');
  centerControls.classList.remove('hide-controls');
  header.classList.remove('hide-controls');

  const onAreaClick = (e) => {
    if (
      e.target.closest('.embed-ctrl') ||
      e.target.closest('.embed-ctrl-center') ||
      e.target.closest('.embed-vol-wrap') ||
      e.target.closest('.embed-seekbar')
    ) return;
    toggleControls();
  };
  area.addEventListener('click', onAreaClick);

  // ========== SINCRONIZAR PLAY/PAUSE ==========
  const syncToggle = () => {
    const isPaused = media.paused;
    const icon = isPaused ? ICONS.play : ICONS.pause;
    if (btnToggle) btnToggle.innerHTML = icon;
    if (centerPlay) centerPlay.innerHTML = icon;
  };
  syncToggle();

  // ========== PROGRESO GUARDADO ==========
  const prog = getProgress(ep.id);
  if (prog && prog.duration && prog.progress < prog.duration - 5 && media.currentTime < 1) {
    const restore = () => { try { media.currentTime = prog.progress; } catch {} };
    if (media.readyState >= 1) restore();
    else media.addEventListener('loadedmetadata', restore, { once: true });
  }

  // ========== EVENTOS DEL MEDIO ==========
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
    console.warn('Embed media error', media.error);
    centerControls.innerHTML = `<div style="color:#fff;font-size:14px;text-align:center;padding:20px;">⚠️ No se pudo cargar el medio</div>`;
  });

  media.addEventListener('play', () => { syncToggle(); updateMediaSession(ep, media); });
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
  media.addEventListener('loadedmetadata', () => {
    tTot.textContent = formatTime(media.duration);
  });
  media.addEventListener('ended', () => {
    if (queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
  });
  media.addEventListener('volumechange', () => {
    if (btnMute) btnMute.innerHTML = (media.muted || media.volume === 0) ? ICONS.mute : ICONS.vol;
    vol.value = media.muted ? 0 : media.volume;
  });

  // ========== SEEK ==========
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

  // ========== VOLUMEN ==========
  vol.value = media.muted ? 0 : media.volume;
  vol.addEventListener('input', () => {
    media.volume = parseFloat(vol.value);
    media.muted = media.volume === 0;
  });

  // ========== ACCIONES DE BOTONES ==========
  const togglePlayPause = () => { media.paused ? media.play() : media.pause(); };

  root.querySelectorAll('[data-act]').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      switch (act) {
        case 'toggle':
          togglePlayPause();
          break;
        case 'back10':
          media.currentTime = Math.max(0, media.currentTime - 10);
          break;
        case 'fwd10':
          media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
          break;
        case 'prev':
          if (queueIndex > 0) ctx.navigate(queue[queueIndex - 1].detailUrl);
          break;
        case 'next':
          if (queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
          break;
        case 'mute':
          media.muted = !media.muted;
          break;
        case 'fullscreen':
          if (!document.fullscreenElement) {
            area.requestFullscreen?.();
            if (btnFullscreen) btnFullscreen.innerHTML = ICONS.fullExit;
          } else {
            document.exitFullscreen();
            if (btnFullscreen) btnFullscreen.innerHTML = ICONS.full;
          }
          break;
        default:
          break;
      }
    });
  });

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      if (btnFullscreen) btnFullscreen.innerHTML = ICONS.fullExit;
    } else {
      if (btnFullscreen) btnFullscreen.innerHTML = ICONS.full;
    }
  });

  // ========== TECLADO (limitado) ==========
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlayPause(); }
    else if (e.code === 'ArrowLeft') media.currentTime = Math.max(0, media.currentTime - 10);
    else if (e.code === 'ArrowRight') media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
    else if (e.key === 'f' || e.key === 'F') {
      if (!document.fullscreenElement) area.requestFullscreen?.();
      else document.exitFullscreen();
    }
  };
  document.addEventListener('keydown', onKey);

  // ========== LIMPIEZA ==========
  active._cleanup = () => {
    document.removeEventListener('keydown', onKey);
    area.removeEventListener('click', onAreaClick);
  };

  // ========== SUBTÍTULOS (si video) ==========
  if (currentMode === 'video' && ep.subtitlesUrl && !media.querySelector('track')) {
    const tr = document.createElement('track');
    tr.kind = 'subtitles';
    tr.src = ep.subtitlesUrl;
    tr.srclang = 'es';
    tr.label = 'Español';
    tr.default = true;
    media.appendChild(tr);
  }

  // ========== REGISTRAR EN CTX ==========
  ctx.registerPlayer?.({
    media,
    episodio: ep,
    queue,
    queueIndex,
    mode: currentMode,
    play: () => media.play(),
    pause: () => media.pause(),
    isPaused: () => media.paused,
    next: () => queueIndex < queue.length - 1 && ctx.navigate(queue[queueIndex + 1].detailUrl),
    prev: () => queueIndex > 0 && ctx.navigate(queue[queueIndex - 1].detailUrl)
  });
}

// ========== MEDIA SESSION ==========
function updateMediaSession(ep, media) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ep.title,
      artist: ep.author || '',
      album: ep.seriesid || '',
      artwork: [{ src: ep.coverUrl, sizes: '512x512' }]
    });
    navigator.mediaSession.setActionHandler('play', () => media.play());
    navigator.mediaSession.setActionHandler('pause', () => media.pause());
    navigator.mediaSession.setActionHandler('seekbackward', () => media.currentTime -= 10);
    navigator.mediaSession.setActionHandler('seekforward', () => media.currentTime += 10);
  } catch {}
}

// ========== TEARDOWN ==========
export function teardown() {
  if (active) {
    active._cleanup?.();
    if (active.media) {
      active.media.pause();
      active.media.src = '';
    }
    active = null;
  }
  document.body.classList.remove('embed-mode');
}
