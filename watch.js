// =========================================================
// watch.js — Vista del reproductor (modo cine profesional)
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

// SVG icons (estilo YouTube/Netflix)
const ICONS = {
  play:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  pause:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>',
  prev:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>',
  next:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6h2v12h-2z"/></svg>',
  back10: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 3a9 9 0 1 0 8.94 8H19.4a7 7 0 1 1-2.05-4.96L14 9.5h7v-7l-2.62 2.62A8.96 8.96 0 0 0 12.5 3zm-1.1 11.83V9.4h-.94l-1.7.59v.78l1.45-.43v4.49h1.19zm3.36-2.67c0 .53-.06.94-.18 1.22-.12.28-.32.43-.6.43s-.48-.15-.6-.43-.18-.69-.18-1.22.06-.94.18-1.22c.12-.28.32-.43.6-.43s.48.15.6.43c.12.28.18.69.18 1.22zm1.22-.85c-.12-.28-.32-.5-.58-.66s-.57-.24-.92-.24-.66.08-.92.24-.46.38-.58.66-.21.65-.21 1.1v.69c0 .45.07.81.21 1.1.12.28.32.5.58.66s.57.24.92.24.66-.08.92-.24.46-.38.58-.66c.12-.28.21-.65.21-1.1v-.69c0-.45-.07-.82-.21-1.1z"/></svg>',
  fwd10:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 3a9 9 0 1 1-8.94 8H4.6a7 7 0 1 0 2.05-4.96L10 9.5H3v-7l2.62 2.62A8.96 8.96 0 0 1 11.5 3zm1.05 11.83V9.4h-.93l-1.7.59v.78l1.45-.43v4.49h1.18zm3.37-2.67c0 .53-.06.94-.18 1.22-.12.28-.32.43-.6.43s-.48-.15-.6-.43-.18-.69-.18-1.22.06-.94.18-1.22c.12-.28.32-.43.6-.43s.48.15.6.43c.12.28.18.69.18 1.22zm1.22-.85c-.12-.28-.32-.5-.58-.66s-.57-.24-.92-.24-.66.08-.92.24-.46.38-.58.66-.21.65-.21 1.1v.69c0 .45.07.81.21 1.1.12.28.32.5.58.66s.57.24.92.24.66-.08.92-.24.46-.38.58-.66c.12-.28.21-.65.21-1.1v-.69c0-.45-.07-.82-.21-1.1z"/></svg>',
  vol:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8.04v7.92A4.5 4.5 0 0 0 16.5 12zM14 3.23v2.06A7 7 0 0 1 14 18.7v2.06A9 9 0 0 0 14 3.23z"/></svg>',
  mute:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.17v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  full:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>',
  pip:    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 7h-8v6h8V7zm2-4H3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16.01H3V4.98h18v14.03z"/></svg>',
  settings:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.3 7.3 0 0 0-1.69-.98l-.38-2.65A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.57-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.43.34.68.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.04.24.25.42.49.42h4c.24 0 .45-.18.49-.42l.38-2.65c.61-.25 1.17-.57 1.69-.98l2.49 1c.25.1.55 0 .68-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z"/></svg>',
  mode:   '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zm0 14H4V6h16v12zM10 8v8l5-4-5-4z"/></svg>',
  queue:  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10h11v2H3zM3 6h11v2H3zM3 14h7v2H3zM16 13v8l7-4z"/></svg>'
};

let active = null;

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
  const { episodio, queue, queueIndex, serie } = ctx;
  const sugeridos = recomendar(episodio, 8);

  // ¿Tenemos un media reciclado desde PIP del mismo episodio?
  const reclaim = ctx.reclaimPipMedia?.(episodio);
  const initialMode = reclaim
    ? (reclaim.tagName === 'VIDEO' ? 'video' : 'audio')
    : (episodio.hasVideo && episodio.initialMode !== 'audio' ? 'video' : 'audio');

  container.innerHTML = `
    <div class="watch">
      <section class="player-stage" style="--stage-bg:${escapeAttr(episodio.bgColor || '#0a0a0a')}">
        <div class="player-area" id="player-area" data-mode="${initialMode}">
          <div class="media-host" id="media-host"></div>
          <div class="player-gradient"></div>
          <div class="center-play hidden" id="center-play">${ICONS.play}</div>
          ${controlsHTML(episodio, queue.length > 1)}
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
            <button id="btn-embed">&lt;&gt; Incrustar</button>
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
    </div>
  `;

  // Montar el media: reciclado o nuevo
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
  setupPlayer(container, media, episodio, queue, queueIndex, ctx, initialMode);
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

function controlsHTML(ep, hasQueue) {
  const canSwitch = ep.hasVideo && ep.hasAudio;
  return `
    <div class="player-controls" id="player-controls">
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
        <button class="ctrl" data-act="back10" title="-10s (←)">${ICONS.back10}</button>
        <button class="ctrl" data-act="fwd10" title="+10s (→)">${ICONS.fwd10}</button>
        <button class="ctrl" data-act="next" title="Siguiente" ${hasQueue ? '' : 'disabled'}>${ICONS.next}</button>
        <div class="volume-wrap">
          <button class="ctrl" data-act="mute" id="btn-mute" title="Silenciar (M)">${ICONS.vol}</button>
          <input type="range" id="vol" min="0" max="1" step="0.01" value="1" aria-label="Volumen"/>
        </div>
        <div class="time-display"><span id="t-current">0:00</span> / <span id="t-total">0:00</span></div>
        <div class="spacer"></div>
        ${canSwitch ? `<button class="ctrl" data-act="switch-mode" id="btn-mode" title="Cambiar audio/video">${ICONS.mode}</button>` : ''}
        ${hasQueue ? `<button class="ctrl" data-act="toggle-queue" title="Lista de episodios">${ICONS.queue}</button>` : ''}
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
        <button class="ctrl" data-act="minimize" title="Mini reproductor (PIP)">${ICONS.pip}</button>
        <button class="ctrl" data-act="fullscreen" title="Pantalla completa (F)">${ICONS.full}</button>
      </div>
    </div>
  `;
}

function suggestCardHTML(ep) {
  const tipo = ep.hasVideo ? '🎬' : '🎧';
  return `<article class="ep-card" data-ep-link="${escapeAttr(ep.detailUrl)}">
    <div class="thumb" style="background-image:url('${escapeAttr(ep.coverUrl)}')">
      <span class="badge">${tipo}</span>
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
// Lógica del reproductor
// =========================================================
function setupPlayer(root, media, ep, queue, queueIndex, ctx, initialMode) {
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
  const centerPlay = root.querySelector('#center-play');

  if (!media) return;
  let currentMode = initialMode;

  // Subs (sólo si video y url disponible)
  if (currentMode === 'video' && ep.subtitlesUrl && !media.querySelector('track')) {
    const tr = document.createElement('track');
    tr.kind = 'subtitles'; tr.src = ep.subtitlesUrl; tr.srclang = 'es'; tr.label = 'Español'; tr.default = true;
    media.appendChild(tr);
  }

  // Restore progress (sólo si NO viene reciclado de PIP — ya tiene tiempo)
  const prog = getProgress(ep.id);
  if (prog && prog.duration && prog.progress < prog.duration - 5 && media.currentTime < 1) {
    const restore = () => { try { media.currentTime = prog.progress; } catch {} };
    if (media.readyState >= 1) restore();
    else media.addEventListener('loadedmetadata', restore, { once: true });
  }

  // Sync UI inicial
  const syncToggle = () => {
    btnToggle.innerHTML = media.paused ? ICONS.play : ICONS.pause;
    centerPlay.classList.toggle('hidden', !media.paused);
  };
  syncToggle();

  // Autoplay inteligente
  const attemptPlay = () => {
    media.play().catch(() => {
      // Bloqueado por autoplay: probar muteado
      media.muted = true;
      btnMute.innerHTML = ICONS.mute;
      media.play().catch(() => {
        // Mostrar overlay click
        centerPlay.classList.remove('hidden');
      });
    });
  };
  if (media.paused) {
    if (media.readyState >= 2) attemptPlay();
    else media.addEventListener('canplay', attemptPlay, { once: true });
  }

  // Errores de carga
  media.addEventListener('error', () => {
    console.warn('Media error', media.error);
    centerPlay.innerHTML = `<div style="font-size:14px;text-align:center;padding:20px;">⚠️ No se pudo cargar el medio</div>`;
    centerPlay.classList.remove('hidden');
  });

  // Eventos
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
    btnMute.innerHTML = (media.muted || media.volume === 0) ? ICONS.mute : ICONS.vol;
    vol.value = media.muted ? 0 : media.volume;
  });

  // Seek (drag)
  let seekingUser = false;
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

  // Click central / video para play-pause
  const togglePlay = () => { media.paused ? media.play() : media.pause(); };
  centerPlay.addEventListener('click', togglePlay);
  if (currentMode === 'video') {
    media.addEventListener('click', togglePlay);
    media.addEventListener('dblclick', () => area.requestFullscreen?.());
  }

  // Controles
  root.querySelectorAll('[data-act]').forEach(b => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const act = b.dataset.act;
      if (act === 'toggle') togglePlay();
      else if (act === 'back10') media.currentTime = Math.max(0, media.currentTime - 10);
      else if (act === 'fwd10') media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
      else if (act === 'prev' && queueIndex > 0) ctx.navigate(queue[queueIndex - 1].detailUrl);
      else if (act === 'next' && queueIndex < queue.length - 1) ctx.navigate(queue[queueIndex + 1].detailUrl);
      else if (act === 'mute') { media.muted = !media.muted; }
      else if (act === 'switch-mode') {
        const newMode = currentMode === 'video' ? 'audio' : 'video';
        currentMode = newMode;
        switchMode(area, ep, newMode, media);
      }
      else if (act === 'toggle-queue') toggleSidePanel(side, sideInner, 'queue', ep, queue, ctx);
      else if (act === 'info') toggleSidePanel(side, sideInner, 'info', ep, queue, ctx);
      else if (act === 'minimize') {
        ctx.minimizeToPip?.();
        ctx.navigate('/');
      }
      else if (act === 'fullscreen') {
        if (document.fullscreenElement) document.exitFullscreen();
        else area.requestFullscreen?.();
      }
      else if (act === 'menu') { e.stopPropagation(); menuPop.classList.toggle('open'); }
      else if (act === 'subs' && ep.subtitlesUrl) {
        const tr = media.textTracks[0];
        if (tr) tr.mode = tr.mode === 'showing' ? 'hidden' : 'showing';
      }
    });
  });

  // Velocidad/calidad
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

  // Cerrar menú al click fuera
  const outsideClose = (e) => {
    if (!e.target.closest('.menu-wrap')) menuPop?.classList.remove('open');
  };
  document.addEventListener('click', outsideClose);

  // Teclado
  const onKey = (e) => {
    if (e.target.matches('input, textarea')) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.code === 'ArrowLeft') media.currentTime = Math.max(0, media.currentTime - 10);
    else if (e.code === 'ArrowRight') media.currentTime = Math.min(media.duration || 0, media.currentTime + 10);
    else if (e.code === 'ArrowUp') { e.preventDefault(); media.volume = Math.min(1, media.volume + 0.05); }
    else if (e.code === 'ArrowDown') { e.preventDefault(); media.volume = Math.max(0, media.volume - 0.05); }
    else if (e.key === 'm' || e.key === 'M') media.muted = !media.muted;
    else if (e.key === 'f' || e.key === 'F') { document.fullscreenElement ? document.exitFullscreen() : area.requestFullscreen?.(); }
  };
  document.addEventListener('keydown', onKey);

  // Auto-hide controles
  let hideT;
  const showCtrls = () => {
    area.classList.add('show-controls');
    clearTimeout(hideT);
    hideT = setTimeout(() => { if (!media.paused) area.classList.remove('show-controls'); }, 2800);
  };
  area.addEventListener('mousemove', showCtrls);
  area.addEventListener('mouseleave', () => area.classList.remove('show-controls'));

  // Cleanup
  active._cleanup = () => {
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('click', outsideClose);
  };

  // Exponer
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

function switchMode(area, ep, newMode, oldMedia) {
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

  // Re-bind: el setup más simple: re-render completo de los handlers no, mejor recargar la vista
  active.ctx.navigate(active.episodio.detailUrl);
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
    const shareUrl = `${location.origin}/share${ep.detailUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: ep.title, text: ep.description, url }); return; } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert('Enlace copiado:\n' + url + '\n\nCon preview enriquecido:\n' + shareUrl); }
    catch { prompt('Copia este enlace:', url); }
  });
  root.querySelector('#btn-embed')?.addEventListener('click', () => {
    const code = `<iframe src="${location.origin}/embed${ep.detailUrl}" width="560" height="315" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
    prompt('Código de incrustación:', code);
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
