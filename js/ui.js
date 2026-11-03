// Utilidades de interfaz compartidas por todas las pantallas.

import { ETAPAS } from './casos.js';

// Crea un elemento. Los textos siempre entran como texto (nunca como HTML),
// salvo la clave "html", que solo se usa para íconos SVG fijos.
export function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  let valor;
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'value') valor = v;
      else if (k === 'checked') el.checked = !!v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo == null || hijo === false || hijo === '') continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  if (valor !== undefined) el.value = valor;
  return el;
}

export function limpiar(el) {
  while (el.firstChild) el.firstChild.remove();
}

let contadorIds = 0;
export const nuevoId = (prefijo = 'campo') => `${prefijo}-${++contadorIds}`;

// Cambia por un momento el texto de un botón ("Copiado ✔").
export function confirmarEnBoton(boton, texto, ms = 2000) {
  const original = boton.dataset.original || boton.textContent;
  boton.dataset.original = original;
  boton.textContent = texto;
  clearTimeout(boton._temporizador);
  boton._temporizador = setTimeout(() => {
    boton.textContent = original;
  }, ms);
}

export const ICONOS = {
  play: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
  pausa: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
  micro: '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.9V21h2v-3.1a7 7 0 0 0 6-6.9z" fill="currentColor"/></svg>',
  documento: '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path d="M6 2h8l6 6v14H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 2v6h6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  camara: '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M9 4 7.2 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.2L15 4zm3 4.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z" fill="currentColor"/></svg>',
};

export function icono(nombre, clase = 'icono') {
  return h('span', { class: clase, html: ICONOS[nombre] });
}

// Imagen genérica para las fotos del técnico (igual en la ficha y en el chat).
const SVG_FOTO = `<svg viewBox="0 0 320 180" role="presentation" aria-hidden="true">
  <rect width="320" height="180" fill="#dde1e7"/>
  <path d="M0 130 H320" stroke="#c4cad3" stroke-width="2"/>
  <path d="M30 62 H170 a28 28 0 0 1 28 28 V180" fill="none" stroke="#8a93a1" stroke-width="18" stroke-linecap="round"/>
  <rect x="150" y="48" width="22" height="28" rx="3" fill="#6e7787"/>
</svg>`;

export function fotoEjemplo(descripcion) {
  return h('figure', { class: 'foto' },
    h('div', { class: 'foto-imagen', role: 'img', 'aria-label': `Foto: ${descripcion} (imagen de ejemplo)`, html: SVG_FOTO }),
    h('figcaption', null, `Foto: ${descripcion} (imagen de ejemplo)`));
}

// Barra de avance igual para la ficha y para el chat.
export function barraProgreso(parte, etapa) {
  return h('div', { class: 'progreso' },
    h('p', { class: 'progreso-texto' }, `Parte ${parte} de 2 · Etapa ${etapa} de 4: `, h('strong', null, ETAPAS[etapa - 1])),
    h('div', { class: 'progreso-pasos', 'aria-hidden': 'true' },
      ETAPAS.map((_, i) => h('span', { class: i < etapa ? 'hecho' : '' }))));
}

export function pantallaMensaje(raiz, titulo, ...texto) {
  limpiar(raiz);
  raiz.append(h('main', { class: 'pantalla' }, h('h1', null, titulo), texto.map((t) => (t instanceof Node ? t : h('p', null, t)))));
}
