// Prueba técnica (E5): comprobaciones automáticas sobre versiones.js y un
// recorrido manual para ver el estado de cada versión.

import { h, limpiar, confirmarEnBoton } from './ui.js';
import { CASOS, acuerdoDespuesDelCambio } from './casos.js';
import { plata, parsearMonto, fechaHora } from './formato.js';
import * as V from './versiones.js';
import * as R from './registro.js';

const CLAVE_PRUEBA = 'fca:prueba-tecnica:caso';

function localStorageReal() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function comprobar(condicion, mensaje) {
  if (!condicion) throw new Error(mensaje);
}

function esperarError(fn, codigo) {
  try {
    fn();
  } catch (e) {
    comprobar(e instanceof V.ErrorVersiones, `Dio un error no controlado: ${e.message}`);
    comprobar(e.codigo === codigo, `Dio el error ${e.codigo} y se esperaba ${codigo}.`);
    return e;
  }
  throw new Error('No dio error y debería haberlo dado.');
}

// Corre las 9 comprobaciones. Cada paso sigue aunque falle el anterior.
export function ejecutarPrueba() {
  const datos = CASOS[1];
  const pasos = [];
  const x = {};
  const paso = (n, titulo, fn) => {
    try {
      pasos.push({ n, titulo, ok: true, detalle: fn() });
    } catch (e) {
      pasos.push({ n, titulo, ok: false, detalle: e.message });
    }
  };

  paso(1, 'Crear acuerdo v1 → hogar acepta → vigente = v1', () => {
    x.caso = V.crearCaso('prueba-tecnica', { caso: datos.id });
    x.v1 = V.proponerAcuerdo(x.caso, datos.acuerdo);
    x.copiaV1 = JSON.stringify(x.v1.contenido);
    comprobar(x.v1.estado === 'propuesta', `La v1 debería nacer "propuesta" y nació "${x.v1.estado}".`);
    comprobar(V.versionVigente(x.caso) === null, 'Antes de que el hogar responda no debería haber vigente.');
    V.responder(x.caso, x.v1.id, 'aceptar');
    const vigente = V.versionVigente(x.caso);
    comprobar(vigente && vigente.id === x.v1.id, 'Después de aceptar, la vigente no es la v1.');
    comprobar(x.v1.estado === 'aceptada', `La v1 quedó "${x.v1.estado}".`);
    return `La v1 nace "propuesta" y sin vigente. Al aceptarla queda "aceptada" y es la vigente (total ${plata(x.v1.contenido.total)}).`;
  });

  paso(2, 'Proponer cambio v2 → pendiente; la vigente sigue siendo v1', () => {
    x.v2 = V.proponerCambio(x.caso, acuerdoDespuesDelCambio(datos), { motivo: datos.cambio.motivo, diferencia: datos.cambio.diferencia });
    comprobar(x.v2.estado === 'pendiente', `La v2 quedó "${x.v2.estado}".`);
    comprobar(V.versionVigente(x.caso).id === x.v1.id, 'Con la v2 pendiente, la vigente debería seguir siendo la v1.');
    const aceptadas = x.caso.versiones.filter((v) => v.estado === 'aceptada').map((v) => v.etiqueta);
    comprobar(!aceptadas.includes('v2'), 'La v2 figura como aceptada.');
    comprobar(V.versionAbierta(x.caso).id === x.v2.id, 'La versión esperando respuesta no es la v2.');
    return `La v2 está "pendiente". Vigente: v1. Aceptadas: ${aceptadas.join(', ')}. La v2 no figura como aceptada.`;
  });

  paso(3, 'Hogar acepta v2 → vigente = v2; v1 "reemplazada" e intacta', () => {
    V.responder(x.caso, x.v2.id, 'aceptar');
    comprobar(V.versionVigente(x.caso).id === x.v2.id, 'La vigente no es la v2.');
    comprobar(x.v1.estado === 'reemplazada', `La v1 quedó "${x.v1.estado}".`);
    comprobar(x.v1.contenido.total === datos.acuerdo.total, `El total de la v1 cambió a ${x.v1.contenido.total}.`);
    comprobar(JSON.stringify(x.v1.contenido) === x.copiaV1, 'El contenido de la v1 cambió.');
    let modificable = true;
    try {
      x.v1.contenido.total = 0;
    } catch {
      modificable = false;
    }
    comprobar(!modificable && x.v1.contenido.total === datos.acuerdo.total, 'Se pudo modificar el contenido de la v1.');
    return `Vigente: v2 (${plata(x.v2.contenido.total)}). La v1 está "reemplazada" con su total original ${plata(x.v1.contenido.total)}, y su contenido no se puede modificar.`;
  });

  paso(4, 'Proponer v3 → hogar rechaza → la vigente sigue siendo v2', () => {
    x.v3 = V.proponerCambio(x.caso, { ...x.v2.contenido, total: x.v2.contenido.total + 1000 }, { motivo: 'Cambio de prueba (no es parte de los casos)' });
    V.responder(x.caso, x.v3.id, 'preguntar', { texto: 'Pregunta de prueba' });
    comprobar(x.v3.estado === 'pendiente', 'Preguntar no debería cambiar el estado.');
    V.responder(x.caso, x.v3.id, 'rechazar');
    comprobar(x.v3.estado === 'rechazada', `La v3 quedó "${x.v3.estado}".`);
    comprobar(V.versionVigente(x.caso).id === x.v2.id, 'Después de rechazar la v3, la vigente no es la v2.');
    comprobar(x.v2.estado === 'aceptada', `La v2 quedó "${x.v2.estado}".`);
    return 'La v3 (dato de prueba) recibió una pregunta, siguió pendiente, y al rechazarla quedó "rechazada". Vigente: v2.';
  });

  paso(5, 'Cada respuesta guarda el id de la versión correcta', () => {
    const esperado = [[x.v1.id, 'aceptar'], [x.v2.id, 'aceptar'], [x.v3.id, 'preguntar'], [x.v3.id, 'rechazar']];
    const real = V.historial(x.caso).filter((e) => e.tipo === 'respuesta').map((e) => [e.versionId, e.respuesta]);
    comprobar(JSON.stringify(real) === JSON.stringify(esperado),
      `Se esperaba ${JSON.stringify(esperado)} y se encontró ${JSON.stringify(real)}.`);
    return real.map(([id, r]) => `${r} → ${id}`).join(' · ');
  });

  paso(6, 'Aceptar una versión que no está pendiente → error controlado', () => {
    const eventos = x.caso.eventos.length;
    const e1 = esperarError(() => V.responder(x.caso, x.v1.id, 'aceptar'), 'NO_PENDIENTE');
    esperarError(() => V.responder(x.caso, x.v3.id, 'aceptar'), 'NO_PENDIENTE');
    comprobar(x.caso.eventos.length === eventos, 'El intento fallido agregó eventos al historial.');
    comprobar(x.v1.estado === 'reemplazada' && V.versionVigente(x.caso).id === x.v2.id, 'El intento fallido cambió estados.');
    return `Aceptar la v1 (reemplazada) y la v3 (rechazada) da error ${e1.codigo}: “${e1.message}” Nada cambió.`;
  });

  paso(7, 'Crear un segundo cambio pendiente mientras hay uno → error controlado', () => {
    x.v4 = V.proponerCambio(x.caso, { ...x.v2.contenido }, { motivo: 'Cambio de prueba que queda pendiente' });
    const cantidad = x.caso.versiones.length;
    const e = esperarError(() => V.proponerCambio(x.caso, { ...x.v2.contenido }, { motivo: 'Segundo pendiente' }), 'YA_HAY_PENDIENTE');
    comprobar(x.caso.versiones.length === cantidad, 'Se creó una versión de más.');
    comprobar(x.caso.versiones.filter(V.estaEsperandoRespuesta).length === 1, 'Hay más de una versión esperando respuesta.');
    return `Con la v4 pendiente, proponer otro cambio da error ${e.codigo}: “${e.message}”`;
  });

  paso(8, 'Guardar en localStorage, recargar y comparar', () => {
    const ls = localStorageReal();
    comprobar(ls, 'Este navegador no permite usar localStorage.');
    comprobar(V.guardar(x.caso, ls, CLAVE_PRUEBA), 'No se pudo guardar en localStorage.');
    x.recuperado = V.cargar(ls, CLAVE_PRUEBA);
    ls.removeItem(CLAVE_PRUEBA);
    comprobar(x.recuperado, 'No se pudo leer el caso guardado.');
    comprobar(V.serializar(x.recuperado) === V.serializar(x.caso), 'El caso recuperado no es idéntico al original.');
    comprobar(V.versionVigente(x.recuperado).id === x.v2.id, 'En el caso recuperado la vigente no es la v2.');
    comprobar(V.versionAbierta(x.recuperado).id === x.v4.id, 'En el caso recuperado la v4 no sigue pendiente.');
    comprobar(Object.isFrozen(x.recuperado.versiones[0].contenido), 'En el caso recuperado el contenido de la v1 se puede modificar.');
    return `Se guardaron y recuperaron ${x.recuperado.versiones.length} versiones y ${x.recuperado.eventos.length} eventos. Idéntico al original; vigente v2, v4 sigue pendiente.`;
  });

  paso(9, 'El historial se recupera completo y en orden', () => {
    const caso = x.recuperado || x.caso;
    const hist = V.historial(caso);
    const esperado = [
      ['propuesta', x.v1.id], ['respuesta', x.v1.id], ['cambio', x.v2.id], ['respuesta', x.v2.id], ['reemplazo', x.v1.id],
      ['cambio', x.v3.id], ['respuesta', x.v3.id], ['respuesta', x.v3.id], ['cambio', x.v4.id],
    ];
    const real = hist.map((e) => [e.tipo, e.versionId]);
    comprobar(JSON.stringify(real) === JSON.stringify(esperado), `El historial no coincide: ${JSON.stringify(real)}.`);
    comprobar(hist.every((e, i) => e.n === i + 1), 'La numeración del historial no es 1, 2, 3…');
    comprobar(hist.every((e, i) => i === 0 || e.fecha >= hist[i - 1].fecha), 'Las fechas del historial no están en orden.');
    const problemas = V.verificarInvariantes(caso);
    comprobar(!problemas.length, problemas.join(' '));
    return `${hist.length} eventos en orden: ${hist.map((e) => e.tipo).join(', ')}.`;
  });

  const correctas = pasos.filter((p) => p.ok).length;
  return { pasos, correctas, total: pasos.length, fecha: new Date().toISOString() };
}

export function textoResultado(r) {
  return [
    'Prueba técnica – Ficha compartida del arreglo',
    `Fecha y hora: ${fechaHora(r.fecha)}`,
    `Resultado: ${r.correctas} de ${r.total} comprobaciones correctas`,
    '',
    ...r.pasos.map((p) => `${p.ok ? '✔' : '✘'} ${p.n}. ${p.titulo}\n   ${p.detalle}`),
  ].join('\n');
}

function seccionAutomatica() {
  const salida = h('div', { class: 'prueba-salida', 'aria-live': 'polite' });
  const ejecutar = h('button', { class: 'boton boton--primario boton--grande', type: 'button' }, 'Ejecutar prueba');
  ejecutar.addEventListener('click', () => {
    const r = ejecutarPrueba();
    const s = R.crearSesion({ rol: 'prueba-tecnica', codigo: 'PRUEBA' });
    R.terminarSesion(s, { resultado: r });
    limpiar(salida);
    const copiar = h('button', { class: 'boton', type: 'button' }, 'Copiar resultado');
    copiar.addEventListener('click', async () => {
      const ok = await R.copiarTexto(textoResultado(r));
      confirmarEnBoton(copiar, ok ? 'Copiado ✔' : 'No se pudo copiar');
    });
    salida.append(
      h('ol', { class: 'pasos' }, r.pasos.map((p) => h('li', { class: p.ok ? 'paso paso--ok' : 'paso paso--mal' },
        h('span', { class: 'paso-marca', 'aria-label': p.ok ? 'correcto' : 'incorrecto' }, p.ok ? '✔' : '✘'),
        h('div', null, h('p', { class: 'paso-titulo' }, `${p.n}. ${p.titulo}`), h('p', { class: 'paso-detalle' }, p.detalle))))),
      h('div', { class: `prueba-resumen ${r.correctas === r.total ? 'prueba-resumen--ok' : 'prueba-resumen--mal'}` },
        h('p', { class: 'prueba-resumen-titulo' }, `${r.correctas} de ${r.total} comprobaciones correctas`),
        h('p', null, fechaHora(r.fecha))),
      h('div', { class: 'botonera' }, copiar));
  });
  return h('section', { class: 'bloque' },
    h('h2', null, 'Prueba automática'),
    h('p', null, 'Corre una secuencia fija sobre la lógica de versiones y muestra cada comprobación.'),
    ejecutar,
    salida);
}

function seccionManual() {
  let caso = V.crearCaso('manual');
  const datos = CASOS[1];
  const mensaje = h('p', { class: 'manual-mensaje', role: 'status' }, 'Empezá por “Proponer acuerdo (v1)”.');
  const tabla = h('div', { class: 'tabla-contenedor' });
  const eventos = h('ol', { class: 'movimientos movimientos--tecnico' });
  const selector = h('select', { id: 'manual-version' });
  const motivo = h('input', { id: 'manual-motivo', type: 'text', value: datos.cambio.motivo });
  const nuevoTotal = h('input', { id: 'manual-total', type: 'text', inputmode: 'numeric', value: String(datos.cambio.total) });

  const accion = (fn) => () => {
    try {
      mensaje.textContent = fn();
      mensaje.className = 'manual-mensaje manual-mensaje--ok';
    } catch (e) {
      mensaje.textContent = e instanceof V.ErrorVersiones ? `Error controlado (${e.codigo}): ${e.message}` : `Error: ${e.message}`;
      mensaje.className = 'manual-mensaje manual-mensaje--mal';
    }
    actualizar();
  };
  const responder = (tipo) => accion(() => {
    if (!selector.value) throw new Error('No hay versiones para responder.');
    V.responder(caso, selector.value, tipo, tipo === 'preguntar' ? { texto: 'Pregunta de prueba' } : {});
    return `Respuesta "${tipo}" guardada para ${selector.value}.`;
  });

  function actualizar() {
    const vigente = V.versionVigente(caso);
    const abierta = V.versionAbierta(caso);
    const elegido = selector.value;
    limpiar(selector);
    caso.versiones.forEach((v) => selector.append(h('option', { value: v.id }, `${v.etiqueta} (${v.estado})`)));
    // Por defecto, la que espera respuesta; se puede elegir otra para probar los errores.
    const existe = caso.versiones.some((v) => v.id === elegido);
    selector.value = abierta ? abierta.id : existe ? elegido : (caso.versiones[0] || { id: '' }).id;

    limpiar(tabla);
    tabla.append(h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, ['Versión', 'Estado', 'Total', 'Motivo', 'Vigente'].map((t) => h('th', null, t)))),
      h('tbody', null, caso.versiones.length
        ? caso.versiones.map((v) => h('tr', null,
          h('td', null, v.etiqueta),
          h('td', null, h('span', { class: `insignia insignia--${v.estado}` }, v.estado)),
          h('td', { class: 'num' }, v.contenido.rango ? `${plata(v.contenido.rango.min)}–${plata(v.contenido.rango.max)}` : plata(v.contenido.total)),
          h('td', null, v.motivo || '—'),
          h('td', null, vigente && vigente.id === v.id ? 'Sí' : '')))
        : h('tr', null, h('td', { colspan: 5 }, 'Todavía no hay versiones.')))));

    limpiar(eventos);
    V.historial(caso).forEach((e) => eventos.append(h('li', null,
      `${e.tipo}${e.respuesta ? ` (${e.respuesta})` : ''} · ${e.versionId}${e.porId ? ` → ${e.porId}` : ''} · ${e.autor}`)));
    const problemas = V.verificarInvariantes(caso);
    eventos.append(h('li', { class: problemas.length ? 'mal' : 'ok' },
      problemas.length ? `Reglas: ✘ ${problemas.join(' ')}` : 'Reglas: ✔ una sola versión esperando respuesta, una sola aceptada, historial numerado en orden.'));
  }

  const bloque = h('section', { class: 'bloque' },
    h('h2', null, 'Recorrido manual'),
    h('p', null, 'Hacé el recorrido a mano y mirá el estado de cada versión. Usa los datos del caso 1; el motivo y el total del cambio se pueden editar.'),
    h('div', { class: 'botonera' },
      h('button', { class: 'boton', type: 'button', onClick: accion(() => { V.proponerAcuerdo(caso, datos.acuerdo); return 'Se propuso el acuerdo v1.'; }) }, 'Proponer acuerdo (v1)')),
    h('div', { class: 'campo' }, h('label', { for: 'manual-motivo', class: 'etiqueta' }, 'Motivo del cambio'), motivo),
    h('div', { class: 'campo' }, h('label', { for: 'manual-total', class: 'etiqueta' }, 'Nuevo total'), nuevoTotal),
    h('div', { class: 'botonera' },
      h('button', {
        class: 'boton', type: 'button',
        onClick: accion(() => {
          const base = V.versionVigente(caso) || V.ultimaVersion(caso);
          const contenido = { ...(base ? base.contenido : datos.acuerdo), total: parsearMonto(nuevoTotal.value), rango: null };
          const v = V.proponerCambio(caso, contenido, { motivo: motivo.value.trim() });
          return `Se propuso el cambio ${v.etiqueta} (pendiente).`;
        }),
      }, 'Proponer cambio')),
    h('div', { class: 'campo' }, h('label', { for: 'manual-version', class: 'etiqueta' }, 'Responder a la versión'), selector),
    h('div', { class: 'botonera' },
      h('button', { class: 'boton', type: 'button', onClick: responder('aceptar') }, 'Aceptar'),
      h('button', { class: 'boton', type: 'button', onClick: responder('rechazar') }, 'Rechazar'),
      h('button', { class: 'boton', type: 'button', onClick: responder('preguntar') }, 'Preguntar')),
    h('div', { class: 'botonera' },
      h('button', { class: 'boton boton--chico', type: 'button', onClick: accion(() => { caso = V.crearCaso('manual'); return 'Se reinició el caso.'; }) }, 'Reiniciar')),
    mensaje,
    h('h3', null, 'Versiones'),
    tabla,
    h('h3', null, 'Historial'),
    eventos);
  actualizar();
  return bloque;
}

export function montarPruebaTecnica(raiz) {
  limpiar(raiz);
  raiz.append(h('main', { class: 'pantalla' },
    h('p', { class: 'volver' }, h('a', { href: '#/' }, '← Inicio')),
    h('h1', null, 'Prueba técnica'),
    h('p', null, 'Comprueba que las versiones del acuerdo se guardan bien y que un cambio pendiente nunca aparece como aceptado.'),
    seccionAutomatica(),
    seccionManual()));
  return () => {};
}
