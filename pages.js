// =========================================================
// pages.js — Registro de páginas especiales
// =========================================================
import * as novedades from './pages/novedades.js';
import * as biblioteca from './pages/biblioteca.js';
import * as usuario from './pages/usuario.js';

const pages = {
  '/novedades': novedades,
  '/biblioteca': biblioteca,
  '/usuario': usuario
};

export function getPage(pathname) {
  return pages[pathname] || null;
}

export function listPages() {
  return Object.keys(pages);
}

