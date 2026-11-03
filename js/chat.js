// Formato "mensajes guiados": conversación simulada que se revela por etapas.
// Genérica a propósito: sin logos ni colores de ninguna aplicación real.

import { h, icono, ICONOS, fotoEjemplo, nuevoId } from './ui.js';
import { plata } from './formato.js';
import { acuerdoDespuesDelCambio } from './casos.js';

const mmss = (seg) => `${Math.floor(seg / 60)}:${String(Math.round(seg % 60)).padStart(2, '0')}`;

function burbuja(lado, ...hijos) {
  return h('div', { class: `burbuja-fila burbuja-fila--${lado}` }, h('div', { class: `burbuja burbuja--${lado}` }, ...hijos));
}

// Nota de voz: si existe el archivo, se puede reproducir; si no, queda la
// transcripción sola, sin mostrar errores.
function notaDeVoz(m, alTocar) {
  const duracion = h('span', { class: 'audio-duracion' }, m.duracion);
  const marcaMicro = icono('micro', 'audio-micro');
  const boton = h('button', { class: 'audio-boton', type: 'button', 'aria-label': 'Reproducir nota de voz', hidden: true, html: ICONOS.play });
  const onda = h('span', { class: 'audio-onda', 'aria-hidden': 'true' },
    [6, 12, 9, 16, 11, 7, 14, 10, 17, 8, 13, 6, 11, 15, 9, 7].map((alto) => h('span', { style: `height:${alto}px` })));

  if (m.archivo) {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', () => {
      boton.hidden = false;
      marcaMicro.hidden = true;
      if (Number.isFinite(audio.duration)) duracion.textContent = mmss(audio.duration);
    });
    audio.addEventListener('error', () => { boton.hidden = true; marcaMicro.hidden = false; });
    audio.addEventListener('play', () => { boton.innerHTML = ICONOS.pausa; boton.setAttribute('aria-label', 'Pausar nota de voz'); });
    const alParar = () => { boton.innerHTML = ICONOS.play; boton.setAttribute('aria-label', 'Reproducir nota de voz'); };
    audio.addEventListener('pause', alParar);
    audio.addEventListener('ended', alParar);
    boton.addEventListener('click', () => {
      if (audio.paused) {
        alTocar('Reproducir nota de voz');
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    });
    audio.src = m.archivo;
  }

  return burbuja('tecnico',
    h('div', { class: 'audio' }, boton, marcaMicro, onda, duracion),
    h('p', { class: 'audio-etiqueta' }, 'Transcripción de la nota de voz'),
    h('p', { class: 'audio-transcripcion' }, m.transcripcion));
}

// Contenido del "PDF": lo acordado (versión final) y lo hecho.
function contenidoDocumento(datos) {
  const a = acuerdoDespuesDelCambio(datos);
  const fila = (k, v) => (v ? [h('dt', null, k), h('dd', null, v)] : null);
  const precio = [
    ...a.items.map((i) => `${i.concepto}: ${plata(i.monto)}`),
    `Total: ${plata(a.total)}`,
  ];
  const r = a.respaldo;
  return [
    h('p', { class: 'documento-titulo' }, 'Resumen del arreglo'),
    h('p', null, `Técnico: ${datos.tecnico}`),
    h('h3', null, 'Lo acordado'),
    h('dl', { class: 'pares' },
      fila('Trabajo', a.trabajo),
      fila('Precio', h('span', null, precio.map((p, i) => [i ? h('br') : null, p]))),
      fila('Forma de pago', a.formaPago),
      fila('No incluye', a.noIncluye),
      fila('Respaldo', [r.plazo, `Cubre: ${r.cubre}`, `No cubre: ${r.noCubre}`].join(' · '))),
    h('h3', null, 'Lo hecho'),
    h('dl', { class: 'pares' },
      fila('Qué se hizo', datos.cierre.hecho),
      fila('Cómo se probó', datos.cierre.prueba),
      fila('Qué quedó pendiente', datos.cierre.pendiente)),
  ];
}

function abrirDocumento(m, datos, alTocar) {
  alTocar(`Abrir documento (${m.nombre})`);
  const idTitulo = nuevoId('doc');
  const dialogo = h('dialog', { class: 'documento-dialogo', 'aria-labelledby': idTitulo },
    h('div', { class: 'documento-barra' },
      h('p', { id: idTitulo, class: 'documento-nombre' }, m.nombre),
      h('button', { class: 'boton boton--chico', type: 'button', onClick: () => dialogo.close() }, 'Cerrar')),
    h('div', { class: 'documento-hoja' }, contenidoDocumento(datos)));
  dialogo.addEventListener('close', () => {
    alTocar('Cerrar documento');
    dialogo.remove();
  });
  document.body.append(dialogo);
  dialogo.showModal();
}

function mensajeTecnico(m, datos, alTocar) {
  switch (m.tipo) {
    case 'texto': return burbuja('tecnico', h('p', { class: 'burbuja-texto' }, m.texto));
    case 'audio': return notaDeVoz(m, alTocar);
    case 'foto': return burbuja('tecnico', fotoEjemplo(m.descripcion));
    case 'documento':
      return burbuja('tecnico',
        h('button', { class: 'archivo', type: 'button', onClick: () => abrirDocumento(m, datos, alTocar) },
          icono('documento', 'archivo-icono'),
          h('span', { class: 'archivo-datos' }, h('span', { class: 'archivo-nombre' }, m.nombre), h('span', { class: 'archivo-ayuda' }, 'PDF · Tocá para abrir'))),
        m.texto ? h('p', { class: 'burbuja-texto' }, m.texto) : null);
    case 'separador': return h('div', { class: 'chat-separador' }, h('span', null, m.texto));
    case 'situacion': return h('div', { class: 'situacion' }, h('p', null, m.texto));
    default: return null;
  }
}

function mensajeHogar(texto) {
  return burbuja('hogar', h('p', { class: 'burbuja-texto' }, texto));
}

// mensajesHogar: [{ etapa, texto }]. alEnviar(texto, boton). alTocar(boton).
export function crearChat({ datos, etapa, mensajesHogar, alEnviar, alTocar }) {
  const lista = h('div', { class: 'chat-mensajes', role: 'log' });
  let primeraNueva = null;

  for (let k = 1; k <= etapa; k++) {
    if (k === etapa && etapa > 1) {
      primeraNueva = h('div', { class: 'chat-nuevos' }, h('span', null, 'Mensajes nuevos'));
      lista.append(primeraNueva);
    }
    datos.chat[k].forEach((m) => {
      const el = mensajeTecnico(m, datos, alTocar);
      if (el) lista.append(el);
    });
    mensajesHogar.filter((m) => m.etapa === k).forEach((m) => lista.append(mensajeHogar(m.texto)));
  }

  const idEntrada = nuevoId('mensaje');
  const entrada = h('textarea', { id: idEntrada, rows: 1, placeholder: 'Escribí un mensaje' });
  const etiqueta = h('label', { for: idEntrada, class: 'solo-lectores' }, 'Mensaje');

  function mandar(texto, boton) {
    const limpio = texto.trim();
    if (!limpio) { entrada.focus(); return; }
    const el = mensajeHogar(limpio);
    lista.append(el);
    entrada.value = '';
    entrada.style.height = '';
    alEnviar(limpio, boton);
    el.scrollIntoView({ block: 'nearest' });
  }

  entrada.addEventListener('input', () => {
    entrada.style.height = '';
    entrada.style.height = `${Math.min(entrada.scrollHeight, 160)}px`;
  });
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      mandar(entrada.value, 'Enviar (tecla Enter)');
    }
  });

  const composer = h('form', { class: 'chat-composer', onSubmit: (e) => { e.preventDefault(); mandar(entrada.value, 'Enviar'); } },
    h('div', { class: 'chat-rapidas' },
      ['Dale', 'No', 'Tengo una duda'].map((t) => h('button', { class: 'chip', type: 'button', onClick: () => mandar(t, `Respuesta rápida: ${t}`) }, t))),
    h('div', { class: 'chat-fila' }, etiqueta, entrada, h('button', { class: 'boton boton--primario chat-enviar', type: 'submit' }, 'Enviar')));

  const el = h('section', { class: 'chat' },
    h('header', { class: 'chat-encabezado' },
      h('span', { class: 'chat-avatar', 'aria-hidden': 'true' }, datos.tecnico.charAt(0)),
      h('div', null, h('p', { class: 'chat-nombre' }, datos.tecnico), h('p', { class: 'chat-sub' }, 'Conversación'))),
    lista,
    composer);

  return { el, primeraNueva };
}
