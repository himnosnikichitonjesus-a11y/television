// =========================================================
// episodios.js — Catálogo de series y episodios
// =========================================================

function slugify(text) {
  if (!text) return '';
  return text.toString().toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
}

export const series = [
  {
    seriesid: 'ddpp-3-clases',
    portada_serie: 'https://balta-media.odoo.com/web/image/925-6ed84678/DERECHO%20PENAL%20III.png',
    titulo_serie: 'Derecho penal 3',
    descripcion_serie: 'Derecho Público — clases magistrales sobre la teoría del delito.',
    url_serie: '/ddpp-3/clases',
    bgColor: '#46210a'
  },
  {
    seriesid: 'dp-indigenas',
    portada_serie: 'https://balta-media.odoo.com/web/image/1031-a693e9ca/Pueblos%20ind%C3%ADgenas.webp',
    titulo_serie: 'Derecho de los pueblos indígenas',
    descripcion_serie: 'Los derechos de tercera generación: pueblos indígenas y derechos de solidaridad.',
    url_serie: '/dp-indigenas',
    bgColor: '#cc04ab'
  }
];

const seriesMap = Object.fromEntries(series.map(s => [s.seriesid, s]));

const episodiosBase = [
  {
    id: 'corrientes-teoria-delito',
    date: '2026-02-10',
    mediaUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-1-13/418061888-44100-2-bd0c488cd9ace.m4a',
    coverUrl: 'https://balta-media.odoo.com/web/image/925-6ed84678/DERECHO%20PENAL%20III.png',
    title: 'Corrientes de la teoría del delito',
    author: 'Lemus',
    categoria: 'Penal, Cultura, Ciencia',
    description: 'Continuación de las corrientes de la teoría del delito. Causalismo, finalismo y funcionalismo.',
    allowDownload: false,
    seriesid: 'ddpp-3-clases',
    bgColor: '#46210a'
  },
  {
    id: 'teoria-causalista',
    date: '2026-02-03',
    mediaVideo: 'https://lb.s3.odysee.tv/vods2.odysee.live/odysee-replays/dd57d90536480f9a751ba4429447fd5f613efce3/1770150346.mp4',
    mediaCalidadbaja: 'https://lb.s3.odysee.tv/vods2.odysee.live/odysee-replays/dd57d90536480f9a751ba4429447fd5f613efce3/1770150346.mp4',
    coverUrl: 'https://balta-media.odoo.com/web/image/925-6ed84678/DERECHO%20PENAL%20III.png',
    title: 'La teoría causalista',
    author: 'Lemus',
    categoria: 'Penal, Cultura, Verdad',
    description: 'Desarrollo de la teoría causalista en el derecho penal.',
    allowDownload: false,
    seriesid: 'ddpp-3-clases',
    bgColor: '#46210a'
  },
  {
    id: 'conceptos-basicos-ddhh',
    date: '2026-02-04',
    mediaVideo: 'https://lb.s3.odysee.tv/vods2.odysee.live/odysee-replays/dd57d90536480f9a751ba4429447fd5f613efce3/1770236623.mp4',
    mediaUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-4-5/423554281-44100-2-4252a47b87ec8.m4a',
    coverUrl: 'https://balta-media.odoo.com/web/image/927-edc793ab/Pueblos%20ind%C3%ADgenas.png',
    title: 'Conceptos básicos de los Derechos Humanos',
    author: 'Raymundo',
    categoria: 'DDHH, Cultura, Paz',
    description: 'Conceptos básicos de los Derechos Humanos.',
    allowDownload: false,
    seriesid: 'dp-indigenas',
    bgColor: '#d92c5e'
  },
  {
    id: 'logica-debate-3',
    date: '2026-05-05',
    mediaUrl: 'https://d3ctxlq1ktw2nl.cloudfront.net/staging/2026-4-5/423554281-44100-2-4252a47b87ec8.m4a',
    coverUrl: 'https://balta-media.odoo.com/web/image/1144-3ab4031d/44500417-1759018829686-8b0dde55850ed%5B1%5D.webp',
    title: 'Debate: Caso Estafa propia',
    author: 'BM',
    categoria: 'Lógica, Tecnología, Espiritualidad',
    description: 'El caso de estafa propia más insólito de la historia del país.',
    allowDownload: false,
    seriesid: null,
    bgColor: '#2596be'
  }
];

const episodios = episodiosBase.map(ep => {
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

export { episodios, slugify };

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
