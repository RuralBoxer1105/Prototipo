// Componentes de la ficha compartida del arreglo.
// Los usan la sesión del hogar (formato ficha) y la vista previa del técnico.
// Regla: si un dato no está cargado, la sección no se muestra.

import { h, fotoEjemplo, nuevoId } from './ui.js';
import { plata } from './formato.js';
import { versionVigente, estaEsperandoRespuesta, respuestasDe, historial, buscarVersion } from './versiones.js';

const NOMBRE_ESTADO = {
  propuesta: 'Propuesta',
  pendiente: 'Pendiente',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  reemplazada: 'Reemplazada',
};

export function insignia(caso, version) {
  const vigente = versionVigente(caso);
  const esVigente = vigente && vigente.id === version.id;
  return h('span', { class: `insignia insignia--${version.estado}` },
    NOMBRE_ESTADO[version.estado] + (esVigente ? ' · vigente' : ''));
}

function seccion(titulo, ...contenido) {
  const hijos = contenido.flat(Infinity).filter(Boolean);
  if (!hijos.length) return null;
  return h('section', { class: 'ficha-seccion' }, h('h3', null, titulo), ...hijos);
}

const parrafo = (texto) => (texto ? h('p', null, texto) : null);

function cabeza(titulo, ...extra) {
  return h('div', { class: 'tarjeta-cabeza' }, h('h2', null, titulo), ...extra);
}

function filaPrecio(concepto, valor, destacada = false) {
  return h('div', { class: `precio-fila${destacada ? ' precio-fila--total' : ''}` },
    h('span', null, concepto), h('span', { class: 'precio-monto' }, valor));
}

function filaTotal(c, etiqueta = 'Total') {
  if (c.rango) return filaPrecio('Estimado', `entre ${plata(c.rango.min)} y ${plata(c.rango.max)}`, true);
  if (c.totalTexto) return filaPrecio(etiqueta, c.totalTexto, true);
  if (typeof c.total === 'number') return filaPrecio(etiqueta, plata(c.total), true);
  return null;
}

function resumenPrecio(c) {
  if (c.rango) return `entre ${plata(c.rango.min)} y ${plata(c.rango.max)}`;
  if (c.totalTexto) return c.totalTexto;
  if (typeof c.total === 'number') return plata(c.total);
  return '';
}

function bloquePrecio(c) {
  const filas = [...(c.items || []).map((i) => filaPrecio(i.concepto, plata(i.monto))), filaTotal(c)].filter(Boolean);
  return seccion('Precio',
    filas.length ? h('div', { class: 'precio' }, filas) : null,
    parrafo(c.formaPago),
    c.presupuesto ? h('p', { class: 'nota' }, c.presupuesto) : null);
}

export function bloqueRespaldo(r, titulo = 'Respaldo ofrecido') {
  if (!r) return null;
  if (r.ninguno) return seccion(titulo, parrafo('El técnico no ofrece respaldo para este trabajo.'));
  const pares = [['Plazo', r.plazo], ['Cubre', r.cubre], ['No cubre', r.noCubre]].filter(([, v]) => v);
  if (!pares.length) return null;
  return seccion(titulo, h('dl', { class: 'pares' }, pares.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])));
}

function seccionesContenido(c) {
  return [
    seccion('Qué se va a hacer', parrafo(c.trabajo)),
    bloquePrecio(c),
    seccion('Qué NO incluye', parrafo(c.noIncluye)),
    seccion('Qué depende de revisar', parrafo(c.dependeDe)),
    bloqueRespaldo(c.respaldo),
  ];
}

function textoDiferencia(d) {
  if (!d || typeof d.monto !== 'number') return null;
  const signo = d.monto > 0 ? '+' : '';
  return { etiqueta: d.sobre === 'maximo' ? 'Por encima del máximo estimado' : 'Diferencia', valor: `${signo}${plata(d.monto)}` };
}

function bloquePrecioCambio(v) {
  const filas = [];
  if (v.adicionales.length) {
    filas.push(h('p', { class: 'precio-subtitulo' }, 'Costo adicional'));
    v.adicionales.forEach((i) => filas.push(filaPrecio(i.concepto, plata(i.monto))));
  }
  const dif = textoDiferencia(v.diferencia);
  if (dif) filas.push(filaPrecio(dif.etiqueta, dif.valor));
  const total = filaTotal({ ...v.contenido, rango: null }, 'Nuevo total');
  if (total) filas.push(total);
  return seccion('Cuánto cambia el precio',
    filas.length ? h('div', { class: 'precio' }, filas) : null,
    parrafo(v.contenido.formaPago));
}

export function encabezadoFicha({ tecnico, problema }) {
  const pares = [['Técnico', tecnico], ['Problema', problema]].filter(([, v]) => v);
  return h('header', { class: 'ficha-encabezado' },
    h('p', { class: 'ficha-rotulo' }, 'Ficha del arreglo'),
    h('dl', { class: 'pares' }, pares.map(([k, v]) => [h('dt', null, k), h('dd', null, v)])));
}

export function tarjetaAcuerdo(caso, version, { titulo, estadoTexto } = {}) {
  return h('article', { class: 'tarjeta' },
    cabeza(titulo || `Acuerdo ${version.etiqueta}`, insignia(caso, version)),
    estadoTexto ? h('p', { class: 'estado-texto' }, estadoTexto) : null,
    seccionesContenido(version.contenido));
}

export function tarjetaCambio(caso, version) {
  const base = buscarVersion(caso, version.baseId);
  const vigente = versionVigente(caso);
  const abierta = estaEsperandoRespuesta(version);
  const c = version.contenido;
  const cambiaTrabajo = c.trabajo && (!base || c.trabajo !== base.contenido.trabajo);
  return h('article', { class: `tarjeta tarjeta--cambio${abierta ? ' es-pendiente' : ''}` },
    cabeza(`Cambio propuesto (${version.etiqueta})`, insignia(caso, version)),
    abierta ? h('div', { class: 'aviso-pendiente', role: 'status' },
      h('p', { class: 'aviso-pendiente-titulo' }, 'PENDIENTE: no se hace hasta que respondas'),
      vigente ? h('p', null, `Mientras no respondas, sigue vigente el acuerdo ${vigente.etiqueta}.`) : null) : null,
    seccion('Qué encontró el técnico', parrafo(version.motivo), version.foto ? fotoEjemplo(version.foto) : null),
    seccion('Qué cambia', cambiaTrabajo ? parrafo(c.trabajo) : null),
    bloquePrecioCambio(version));
}

export function tarjetaCierre(cierre) {
  if (!cierre) return null;
  return h('article', { class: 'tarjeta' },
    cabeza('Cierre del trabajo'),
    seccion('Qué se hizo', parrafo(cierre.hecho)),
    seccion('Cómo se probó', parrafo(cierre.prueba)),
    seccion('Qué quedó pendiente', parrafo(cierre.pendiente)),
    seccion('Qué tenés que observar', parrafo(cierre.observar)),
    bloqueRespaldo(cierre.respaldo));
}

function mensajeFinal(caso, version, respuesta) {
  const vigente = versionVigente(caso);
  if (!respuesta) return `Esta versión está "${NOMBRE_ESTADO[version.estado].toLowerCase()}".`;
  if (respuesta.autor === 'guion') return 'Para seguir con la prueba, esta versión se tomó como aceptada.';
  if (respuesta.respuesta === 'aceptar') {
    return vigente && vigente.id === version.id ? 'Aceptaste esta versión. Es el acuerdo vigente.' : 'Aceptaste esta versión.';
  }
  return vigente ? `No aceptaste esta versión. Sigue vigente el acuerdo ${vigente.etiqueta}.` : 'No aceptaste esta versión.';
}

// Botones de respuesta del hogar. alResponder(tipo, texto, boton); alTocar(boton).
export function bloqueRespuesta(caso, version, { alResponder, alTocar }) {
  const previas = respuestasDe(caso, version.id);
  const preguntas = previas.filter((r) => r.respuesta === 'preguntar');
  const cont = h('section', { class: 'respuesta' });

  if (preguntas.length) {
    cont.append(h('div', { class: 'respuesta-preguntas' },
      preguntas.map((p) => h('p', null, h('strong', null, 'Tu pregunta: '), p.texto)),
      estaEsperandoRespuesta(version) ? h('p', { class: 'nota' }, 'Quedó registrada en el caso. Esta versión sigue esperando tu respuesta.') : null));
  }

  if (!estaEsperandoRespuesta(version)) {
    const final = previas.filter((r) => r.respuesta !== 'preguntar').pop();
    cont.append(h('p', { class: 'respuesta-final' }, mensajeFinal(caso, version, final)));
    return cont;
  }

  const id = nuevoId('pregunta');
  const area = h('textarea', { id, rows: 3 });
  const zonaPregunta = h('div', { class: 'respuesta-pregunta', hidden: true },
    h('label', { for: id }, 'Tu pregunta'),
    area,
    h('button', {
      class: 'boton boton--primario', type: 'button',
      onClick: () => {
        const texto = area.value.trim();
        if (!texto) { area.focus(); return; }
        alResponder('preguntar', texto, 'Enviar pregunta');
      },
    }, 'Enviar pregunta'));

  cont.append(
    h('h3', null, '¿Qué respondés?'),
    h('div', { class: 'botonera' },
      h('button', { class: 'boton boton--primario', type: 'button', onClick: () => alResponder('aceptar', '', 'Acepto') }, 'Acepto'),
      h('button', { class: 'boton', type: 'button', onClick: () => alResponder('rechazar', '', 'No acepto') }, 'No acepto'),
      h('button', {
        class: 'boton', type: 'button', 'aria-controls': id,
        onClick: () => {
          zonaPregunta.hidden = !zonaPregunta.hidden;
          alTocar('Tengo una pregunta');
          if (!zonaPregunta.hidden) area.focus();
        },
      }, 'Tengo una pregunta')),
    zonaPregunta);
  return cont;
}

function describirEvento(caso, e) {
  const etq = (id) => (buscarVersion(caso, id) || { etiqueta: id }).etiqueta;
  switch (e.tipo) {
    case 'propuesta': return `El técnico propuso el acuerdo (${etq(e.versionId)}).`;
    case 'cambio': return `El técnico propuso un cambio (${etq(e.versionId)}).`;
    case 'respuesta':
      if (e.autor === 'guion') return `La ${etq(e.versionId)} se tomó como aceptada para seguir con la prueba.`;
      if (e.respuesta === 'aceptar') return `Aceptaste la ${etq(e.versionId)}.`;
      if (e.respuesta === 'rechazar') return `No aceptaste la ${etq(e.versionId)}.`;
      return `Preguntaste sobre la ${etq(e.versionId)}: “${e.texto}”`;
    case 'reemplazo': return `La ${etq(e.versionId)} quedó reemplazada por la ${etq(e.porId)}.`;
    case 'cierre': return 'El técnico cerró el trabajo.';
    case 'aviso': return `Avisaste al técnico que volvió la falla.${e.texto ? ` Escribiste: “${e.texto}”` : ''}`;
    default: return e.tipo;
  }
}

export function historialCaso(caso) {
  return h('section', { class: 'historial' },
    h('h2', null, 'Historial del caso'),
    h('p', { class: 'nota' }, 'Tocá una versión para ver todo lo que decía.'),
    h('div', { class: 'historial-versiones' }, caso.versiones.map((v) => {
      const dif = textoDiferencia(v.diferencia);
      return h('details', { class: 'version' },
        h('summary', null,
          h('span', { class: 'version-nombre' }, `${v.etiqueta} · ${v.tipo === 'acuerdo' ? 'Acuerdo inicial' : 'Cambio'}`),
          h('span', { class: 'version-total' }, resumenPrecio(v.contenido)),
          insignia(caso, v)),
        h('div', { class: 'version-detalle' },
          seccion('Motivo del cambio', parrafo(v.motivo)),
          dif ? seccion(dif.etiqueta, parrafo(dif.valor)) : null,
          seccionesContenido(v.contenido)));
    })),
    h('h3', null, 'Movimientos'),
    h('ol', { class: 'movimientos' }, historial(caso).map((e) => h('li', null, describirEvento(caso, e)))));
}

// Situación de la etapa 4 (mismo estilo que en el chat).
export function situacion(volvio) {
  return h('div', { class: 'situacion' },
    h('p', { class: 'situacion-cuando' }, volvio.cuando),
    h('p', null, volvio.situacion));
}

// Botón "Avisar al técnico que volvió la falla". alAvisar(texto); alTocar(boton).
export function bloqueAviso(caso, { alAvisar }) {
  const avisos = historial(caso).filter((e) => e.tipo === 'aviso');
  if (avisos.length) {
    return h('section', { class: 'respuesta' },
      h('p', { class: 'respuesta-final' }, 'Listo: tu aviso quedó registrado en el caso.'));
  }
  const id = nuevoId('aviso');
  const area = h('textarea', { id, rows: 3 });
  return h('section', { class: 'respuesta' },
    h('label', { for: id }, 'Mensaje para el técnico (opcional)'),
    area,
    h('button', { class: 'boton boton--primario', type: 'button', onClick: () => alAvisar(area.value.trim()) },
      'Avisar al técnico que volvió la falla'));
}
