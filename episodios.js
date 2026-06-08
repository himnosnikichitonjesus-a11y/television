// =========================================================
// episodios.js — Catálogo para SITIO DE TELEVISIÓN
// =========================================================

import { seriesRaw, episodiosRaw, slugify } from 'https://podcast.nikichitonjesus.org/lib/....js';

const seriesMap = Object.fromEntries(seriesRaw.map(s => [s.seriesid, s]));

// Procesar episodios de la misma forma que el original
const episodios = episodiosRaw.map(ep => {
  const hasVideo = !!ep.mediaVideo;
  const hasAudio = !!ep.mediaUrl;
  const serie = ep.seriesid ? seriesMap[ep.seriesid] : null;
  return {
    id: ep.id,
    date: ep.date,
    title: ep.title,
    author: ep.author,
    categoria: ep.categoria || '',
    description: ep.description || '',
    allowDownload: ep.allowDownload ?? false,
    seriesid: ep.seriesid || null,
    detailUrl: ep.detailUrl ?? (serie ? `${serie.url_serie}/${slugify(ep.title)}` : `/episodio/${ep.id}`),
    mediaUrl: ep.mediaUrl ?? '',
    mediaVideo: ep.mediaVideo ?? '',
    mediaCalidadbaja: ep.mediaCalidadbaja ?? '',
    initialMode: ep.initialMode ?? (hasVideo ? 'video' : 'audio'),
    coverUrl: ep.coverUrl ?? '',
    coverInfo: ep.coverUrl ?? '',
    text: ep.description ?? '',
    subtitlesUrl: ep.subtitlesUrl ?? '',
    bgColor: ep.bgColor ?? serie?.bgColor ?? '#0a0a0a',
    premium: ep.premium ?? false,
    hasVideo, hasAudio
  };
});

export const series = seriesRaw;
export { slugify, episodios };

// Funciones de acceso (igual que el original)
export function getEpisodioById(id) { return episodios.find(ep => ep.id === id); }
export function getEpisodioByDetailUrl(url) {
  const clean = url.replace(/\/$/, '');
  return episodios.find(ep => ep.detailUrl === clean || ep.detailUrl === url);
}
export function getSerieByUrl(url) {
  const clean = url.replace(/\/$/, '');
  return series.find(s => s.url_serie === clean || s.url_serie === url);
}
export function getSerieById(seriesid) { return seriesMap[seriesid]; }
export function getEpisodiosBySerieId(seriesid) {
  return episodios.filter(ep => ep.seriesid === seriesid)
    .sort((a, b) => new Date(a.date) - new Date(b.date));
}
export function getEpisodiosBySerieUrl(url) {
  const s = getSerieByUrl(url);
  return s ? getEpisodiosBySerieId(s.seriesid) : [];
}
export function getAllEpisodios() { return episodios; }
export function getAllSeries() { return series; }
