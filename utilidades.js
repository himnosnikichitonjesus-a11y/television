// =========================================================
// utilidades.js — Algoritmo de descubrimiento, búsqueda, ranking
// =========================================================
import { getAllEpisodios, getAllSeries, getEpisodiosBySerieId } from './episodios.js';
import { getPreferences, getLikes, getHistory } from './memoria.js';

const STOP = new Set(['de','la','el','los','las','un','una','y','o','a','en','del','al','para','por','con','que','se','su','sus','lo']);

export function tokenize(text) {
  return (text || '').toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ').split(/\s+/)
    .filter(t => t && !STOP.has(t) && t.length > 1);
}

export function epTokens(ep) {
  return new Set([
    ...tokenize(ep.title), ...tokenize(ep.description),
    ...tokenize(ep.categoria), ...tokenize(ep.author)
  ]);
}

export function categoriasDeEpisodio(ep) {
  return (ep.categoria || '').split(',').map(c => c.trim()).filter(Boolean);
}

export function todasLasCategorias() {
  const map = new Map();
  for (const ep of getAllEpisodios()) {
    for (const c of categoriasDeEpisodio(ep)) {
      map.set(c, (map.get(c) || 0) + 1);
    }
  }
  return [...map.entries()].sort((a,b) => b[1]-a[1]).map(([n,c]) => ({ name:n, count:c }));
}

export function buscar(query) {
  const q = tokenize(query);
  if (!q.length) return [];
  return getAllEpisodios()
    .map(ep => {
      const tokens = epTokens(ep);
      let score = 0;
      for (const t of q) if (tokens.has(t)) score += 2;
      // partial match in title
      const ttl = (ep.title || '').toLowerCase();
      for (const t of q) if (ttl.includes(t)) score += 3;
      return { ep, score };
    })
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score)
    .map(x => x.ep);
}

export function episodiosPorCategoria(cat) {
  const c = (cat || '').toLowerCase();
  return getAllEpisodios().filter(ep =>
    categoriasDeEpisodio(ep).some(x => x.toLowerCase() === c)
  );
}

// Recomendados con respecto a un episodio + preferencias del usuario
export function recomendar(ep, limite = 8) {
  const prefs = getPreferences();
  const all = getAllEpisodios().filter(e => e.id !== ep.id);
  const baseTokens = epTokens(ep);
  const baseCats = new Set(categoriasDeEpisodio(ep).map(c => c.toLowerCase()));
  return all.map(e => {
    let s = 0;
    if (e.seriesid && e.seriesid === ep.seriesid) s += 5;
    if (e.author === ep.author) s += 2;
    for (const c of categoriasDeEpisodio(e)) if (baseCats.has(c.toLowerCase())) s += 3;
    const t = epTokens(e);
    for (const tk of t) if (baseTokens.has(tk)) s += 0.5;
    // boost preferencias de usuario
    for (const c of categoriasDeEpisodio(e)) s += (prefs.categories[c] || 0) * 0.3;
    s += (prefs.authors[e.author] || 0) * 0.2;
    return { e, s };
  }).sort((a,b) => b.s - a.s).slice(0, limite).map(x => x.e);
}

// Para feed: secciones dinámicas
export function feedSecciones() {
  const all = getAllEpisodios();
  const prefs = getPreferences();
  const likes = new Set(getLikes());
  const history = getHistory();

  const continuar = Object.entries(history)
    .filter(([id, h]) => h.progress > 5 && (!h.duration || h.progress < h.duration - 10))
    .sort((a,b) => b[1].ts - a[1].ts)
    .map(([id]) => all.find(e => e.id === id))
    .filter(Boolean);

  const recientes = [...all].sort((a,b) => new Date(b.date) - new Date(a.date));
  const populares = [...all].sort(() => Math.random() - 0.5);

  // top categorías
  const topCats = todasLasCategorias().slice(0, 4);
  const seccionesCat = topCats.map(c => ({
    titulo: c.name,
    episodios: episodiosPorCategoria(c.name).slice(0, 8)
  }));

  // Para ti (preferencias)
  const paraTi = all.map(e => {
    let s = 0;
    for (const c of categoriasDeEpisodio(e)) s += (prefs.categories[c] || 0);
    s += (prefs.authors[e.author] || 0) * 1.5;
    if (likes.has(e.id)) s -= 5; // ya lo viste
    return { e, s };
  }).filter(x => x.s > 0).sort((a,b) => b.s - a.s).slice(0, 8).map(x => x.e);

  const secciones = [];
  if (continuar.length) secciones.push({ titulo: 'Continuar viendo', episodios: continuar });
  if (paraTi.length) secciones.push({ titulo: 'Para ti', episodios: paraTi });
  secciones.push({ titulo: 'Novedades', episodios: recientes.slice(0, 8) });
  secciones.push({ titulo: 'Series', episodios: getAllSeries(), tipo: 'series' });
  secciones.push(...seccionesCat);
  secciones.push({ titulo: 'Descubre', episodios: populares.slice(0, 8) });
  return secciones;
}

export function ordenarPorFecha(eps, asc = true) {
  return [...eps].sort((a,b) => {
    const d = new Date(a.date) - new Date(b.date);
    return asc ? d : -d;
  });
}

export function formatTime(s) {
  if (!isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
  const mm = String(m).padStart(2,'0'), ss = String(sec).padStart(2,'0');
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
