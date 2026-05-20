// =========================================================
// memoria.js — Almacenamiento del usuario (localStorage)
// =========================================================
//version 2
const KEY = 'niki.tv.memoria.v1';

const defaults = {
  likes: [],            // ids de episodios
  likedSeries: [],      // ids de series
  history: {},          // { epId: { progress: seconds, duration, ts } }
  preferences: {        // pesos por categoría / autor
    categories: {}, authors: {}
  },
  playlists: [],        // [{ id, name, episodeIds: [] }]
  searchHistory: []
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(defaults);
    return { ...structuredClone(defaults), ...JSON.parse(raw) };
  } catch { return structuredClone(defaults); }
}
function write(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  emit();
}

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { listeners.forEach(fn => { try { fn(read()); } catch {} }); }

// ---------- LIKES ----------
export function isLiked(epId) { return read().likes.includes(epId); }
export function toggleLike(epId, episodio) {
  const s = read();
  const i = s.likes.indexOf(epId);
  if (i >= 0) s.likes.splice(i, 1);
  else {
    s.likes.unshift(epId);
    if (episodio) bumpPreference(s, episodio, 3);
  }
  write(s); return isLiked(epId);
}
export function getLikes() { return read().likes; }

// ---------- LIKED SERIES ----------
export function isSeriesLiked(id) { return read().likedSeries.includes(id); }
export function toggleSeriesLike(id) {
  const s = read();
  const i = s.likedSeries.indexOf(id);
  if (i >= 0) s.likedSeries.splice(i, 1); else s.likedSeries.unshift(id);
  write(s); return isSeriesLiked(id);
}

// ---------- HISTORIAL / PROGRESO ----------
export function saveProgress(epId, progress, duration) {
  if (!epId || !isFinite(progress)) return;
  const s = read();
  s.history[epId] = { progress, duration: duration || 0, ts: Date.now() };
  write(s);
}
export function getProgress(epId) { return read().history[epId] || null; }
export function getHistory() { return read().history; }
export function clearHistory() { const s = read(); s.history = {}; write(s); }

// ---------- PREFERENCIAS ----------
function bumpPreference(state, episodio, weight = 1) {
  if (!episodio) return;
  (episodio.categoria || '').split(',').map(c => c.trim()).filter(Boolean).forEach(cat => {
    state.preferences.categories[cat] = (state.preferences.categories[cat] || 0) + weight;
  });
  if (episodio.author) {
    state.preferences.authors[episodio.author] =
      (state.preferences.authors[episodio.author] || 0) + weight;
  }
}
export function trackView(episodio) {
  if (!episodio) return;
  const s = read(); bumpPreference(s, episodio, 1); write(s);
}
export function getPreferences() { return read().preferences; }

// ---------- PLAYLISTS ----------
export function getPlaylists() { return read().playlists; }
export function createPlaylist(name) {
  const s = read();
  const pl = { id: 'pl_' + Date.now(), name, episodeIds: [] };
  s.playlists.push(pl); write(s); return pl;
}
export function addToPlaylist(plId, epId) {
  const s = read();
  const pl = s.playlists.find(p => p.id === plId);
  if (pl && !pl.episodeIds.includes(epId)) { pl.episodeIds.push(epId); write(s); }
}
export function removeFromPlaylist(plId, epId) {
  const s = read();
  const pl = s.playlists.find(p => p.id === plId);
  if (pl) { pl.episodeIds = pl.episodeIds.filter(x => x !== epId); write(s); }
}

// ---------- BÚSQUEDAS ----------
export function pushSearch(q) {
  if (!q) return;
  const s = read();
  s.searchHistory = [q, ...s.searchHistory.filter(x => x !== q)].slice(0, 20);
  write(s);
}
export function getSearchHistory() { return read().searchHistory; }

export function getAll() { return read(); }
