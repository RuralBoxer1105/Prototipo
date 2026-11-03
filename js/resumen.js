// Resumen legible de una sesión, con botones para copiar y descargar.
// Lo usan las pantallas de fin y la lista de resultados guardados.

import { h, confirmarEnBoton } from './ui.js';
import { fechaHora } from './formato.js';
import * as R from './registro.js';

function acciones(e) {
  const lineas = [];
  e.eventos.filter((x) => x.tipo === 'boton').forEach((x) => lineas.push(`${x.detalle} (${x.seg} s)`));
  e.eventos.filter((x) => x.tipo !== 'boton').forEach((x) => lineas.push(`Nota: ${x.detalle}`));
  e.textos.forEach((t) => lineas.push(`${t.campo}: “${t.texto}”`));
  if (e.camposVacios) lineas.push(`Campos vacíos (${e.camposVacios.length}): ${e.camposVacios.length ? e.camposVacios.join(', ') : 'ninguno'}`);
  return lineas.length ? h('ul', { class: 'lista-chica' }, lineas.map((l) => h('li', null, l))) : '—';
}

// En el hogar se agrega "Hasta responder (s)": la duración incluye las
// preguntas del facilitador, este tiempo no.
export function tablaResumen(s) {
  const hogar = s.rol === 'hogar';
  const hastaResponder = (e) => {
    if (!('tiempoHastaResponderSeg' in e)) return '—';
    return e.tiempoHastaResponderSeg ?? 'sin respuesta';
  };
  const columnas = [hogar ? 'Etapa' : 'Tarea', hogar ? 'Duración (s)' : 'Seg.', hogar ? 'Hasta responder (s)' : null, 'Qué hizo'];
  // data-label: en el celular cada fila se muestra como tarjeta con el nombre de la columna.
  const filas = s.etapas.map((e) => h('tr', null,
    h('td', { class: 'celda-titulo' }, e.titulo || e.clave),
    h('td', { class: 'num', 'data-label': columnas[1] }, e.duracionSeg ?? '—'),
    hogar ? h('td', { class: 'num', 'data-label': columnas[2] }, hastaResponder(e)) : null,
    h('td', { 'data-label': columnas[3] }, acciones(e))));
  return h('div', { class: 'tabla-contenedor' },
    h('table', { class: 'tabla tabla--resumen' },
      h('thead', null, h('tr', null, columnas.filter(Boolean).map((c) => h('th', null, c)))),
      h('tbody', null, filas)));
}

export function botonesExportar(s) {
  const copiar = h('button', { class: 'boton', type: 'button' }, 'Copiar resultados');
  copiar.addEventListener('click', async () => {
    const ok = await R.copiarTexto(R.textoPlano(s));
    confirmarEnBoton(copiar, ok ? 'Copiado ✔' : 'No se pudo copiar');
  });
  const descargar = h('button', {
    class: 'boton', type: 'button',
    onClick: () => R.descargarJSON(R.nombreArchivo(s), R.datosExportables(s)),
  }, 'Descargar resultados');
  return h('div', { class: 'botonera' }, copiar, descargar);
}

export function vistaResumen(s) {
  const datos = [
    ['Código', s.codigo],
    ['Rol', R.nombreRol(s.rol)],
    ['Inicio', fechaHora(s.inicio)],
    ['Fin', s.fin ? fechaHora(s.fin) : 'sin terminar'],
  ];
  if (s.orden) datos.push(['Orden', s.orden.map((o) => `${o.parte}) ${R.nombreFormato(o.formato)} · caso ${o.caso}`).join('  ')]);
  if (s.caso) datos.push(['Caso', String(s.caso)]);
  const tiempo = R.textoTiempoAcuerdoCambio(s);
  if (tiempo) {
    datos.push(['Tiempo hasta responder', h('span', null, tiempo, h('br'), h('span', { class: 'nota' }, R.ACLARACION_TIEMPO))]);
  }
  const decisiones = R.decisionesFicha(s);
  if (decisiones.length) datos.push(['Decisiones en la ficha', h('ul', { class: 'lista-chica' }, decisiones.map((d) => h('li', null, d)))]);
  if (s.rol === 'hogar') {
    datos.push(['Preferencia', s.preferencia ? (s.preferencia === 'ficha' ? 'Como la ficha' : 'Como los mensajes') : 'sin elegir']);
    datos.push(['¿Por qué?', s.porque || '—']);
  }
  if (s.resultado) datos.push(['Resultado', `${s.resultado.correctas} de ${s.resultado.total} comprobaciones correctas`]);
  return h('div', { class: 'resumen' },
    h('dl', { class: 'pares' }, datos.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])),
    s.etapas.length ? tablaResumen(s) : null,
    botonesExportar(s));
}
