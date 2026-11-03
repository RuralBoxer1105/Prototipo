// Router por hash (#/...) y pantallas del equipo (inicio y resultados).
// Las sesiones de participantes están en sesion-hogar.js y sesion-tecnico.js.

import { h, limpiar, pantallaMensaje, confirmarEnBoton } from './ui.js';
import { ASIGNACION_HOGAR, CODIGOS_TECNICO } from './casos.js';
import * as R from './registro.js';
import { fechaHora } from './formato.js';
import { vistaResumen } from './resumen.js';
import { montarHogar, ordenHogar } from './sesion-hogar.js';
import { montarTecnico } from './sesion-tecnico.js';
import { montarPruebaTecnica } from './prueba-tecnica.js';

const raiz = document.getElementById('app');
let desmontar = () => {};

function leerRuta() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const [ruta, consulta] = hash.split('?');
  const params = new URLSearchParams(consulta || location.search);
  return { partes: ruta.split('/').filter(Boolean), params };
}

const linkA = (ruta) => `${location.href.split('#')[0]}#${ruta}`;

function botonCopiarLink(ruta) {
  const b = h('button', { class: 'boton boton--chico', type: 'button' }, 'Copiar link');
  b.addEventListener('click', async () => {
    const ok = await R.copiarTexto(linkA(ruta));
    confirmarEnBoton(b, ok ? 'Copiado ✔' : 'No se pudo');
  });
  return b;
}

function filaSesion(ruta, titulo, detalle) {
  return h('li', { class: 'acceso' },
    h('a', { class: 'acceso-link', href: `#${ruta}` }, h('span', { class: 'acceso-titulo' }, titulo), detalle ? h('span', { class: 'acceso-detalle' }, detalle) : null),
    botonCopiarLink(ruta));
}

function montarInicio() {
  const formato = (f) => (f === 'ficha' ? 'Ficha' : 'Mensajes');
  const hogares = Object.keys(ASIGNACION_HOGAR).map((codigo) => {
    const [p1, p2] = ordenHogar(codigo);
    const titulo = codigo === 'PH' ? 'Piloto hogar (PH)' : `Hogar ${codigo}`;
    return filaSesion(`/hogar/${codigo}`, titulo, `1) ${formato(p1.formato)} · caso ${p1.caso}  →  2) ${formato(p2.formato)} · caso ${p2.caso}`);
  });
  const tecnicos = CODIGOS_TECNICO.flatMap((codigo) => {
    const titulo = codigo === 'PT' ? 'Piloto técnico (PT)' : `Técnico ${codigo}`;
    return [
      filaSesion(`/tecnico/${codigo}`, titulo, 'Caso 1 (por defecto)'),
      filaSesion(`/tecnico/${codigo}?caso=2`, `${titulo} · caso 2`, 'Caso 2'),
    ];
  });
  raiz.append(h('main', { class: 'pantalla' },
    h('p', { class: 'rotulo' }, 'Solo para el equipo'),
    h('h1', null, 'Ficha compartida del arreglo · prototipo'),
    h('p', null, 'A cada participante mandale el link directo a su sesión: no ve esta pantalla.'),
    h('section', { class: 'bloque' }, h('h2', null, 'Hogares (E2 y E3)'), h('ul', { class: 'accesos' }, hogares)),
    h('section', { class: 'bloque' }, h('h2', null, 'Técnicos (E1)'), h('ul', { class: 'accesos' }, tecnicos)),
    h('section', { class: 'bloque' }, h('h2', null, 'Equipo'),
      h('ul', { class: 'accesos' },
        filaSesion('/prueba-tecnica', 'Prueba técnica (E5)', 'Comprobaciones de versiones y estados'),
        filaSesion('/resultados', 'Resultados guardados', 'Sesiones guardadas en este navegador')))));
}

function montarResultados() {
  const sesiones = R.listarSesiones();
  const lista = sesiones.map((s) => {
    const detalles = h('details', { class: 'sesion' },
      h('summary', null,
        h('span', { class: 'sesion-codigo' }, s.codigo),
        h('span', null, `${R.nombreRol(s.rol)}${s.caso ? ` · caso ${s.caso}` : ''} · ${fechaHora(s.inicio)}`),
        h('span', { class: `insignia ${s.terminada ? 'insignia--aceptada' : 'insignia--pendiente'}` }, s.terminada ? 'Terminada' : 'En curso')),
      vistaResumen(s));
    return detalles;
  });

  const copiarTodo = h('button', { class: 'boton', type: 'button' }, 'Copiar todas');
  copiarTodo.addEventListener('click', async () => {
    const ok = await R.copiarTexto(sesiones.map(R.textoPlano).join('\n\n────────────\n\n'));
    confirmarEnBoton(copiarTodo, ok ? 'Copiado ✔' : 'No se pudo copiar');
  });

  raiz.append(h('main', { class: 'pantalla' },
    h('p', { class: 'volver' }, h('a', { href: '#/' }, '← Inicio')),
    h('h1', null, 'Resultados guardados'),
    h('p', null, `Sesiones guardadas en este navegador: ${sesiones.length}. Tocá una para ver el resumen.`),
    sesiones.length ? h('div', { class: 'botonera' },
      copiarTodo,
      h('button', {
        class: 'boton', type: 'button',
        onClick: () => R.descargarJSON(`resultados-todos-${new Date().toISOString().slice(0, 10)}.json`, sesiones.map(R.datosExportables)),
      }, 'Descargar todas'),
      h('button', {
        class: 'boton boton--peligro', type: 'button',
        onClick: () => {
          if (window.confirm(`¿Seguro que querés borrar las ${sesiones.length} sesiones guardadas en este navegador? No se puede deshacer.`)) {
            R.borrarSesiones();
            renderizar();
          }
        },
      }, 'Borrar todas')) : null,
    h('div', { class: 'sesiones' }, lista)));
}

// Va fuera de #app para que no lo borren las pantallas al redibujarse.
function avisoAlmacenamiento() {
  if (R.almacenamientoDisponible()) return;
  document.body.prepend(h('div', { class: 'aviso-almacen', role: 'alert' },
    'Este navegador no deja guardar datos. La sesión funciona, pero si se recarga la página se pierde: descargá los resultados antes de cerrar.'));
}

function renderizar() {
  desmontar();
  desmontar = () => {};
  limpiar(raiz);
  document.querySelectorAll('dialog').forEach((d) => d.remove());
  const { partes, params } = leerRuta();
  const [seccion, codigo] = partes;

  let titulo = 'Ficha del arreglo · prototipo';
  if (!seccion) montarInicio();
  else if (seccion === 'hogar' && codigo) { desmontar = montarHogar(raiz, codigo); titulo = 'Prueba con hogares'; }
  else if (seccion === 'tecnico' && codigo) { desmontar = montarTecnico(raiz, codigo, params); titulo = 'Prueba con técnicos'; }
  else if (seccion === 'prueba-tecnica') { desmontar = montarPruebaTecnica(raiz); titulo = 'Prueba técnica'; }
  else if (seccion === 'resultados') { montarResultados(); titulo = 'Resultados guardados'; }
  else pantallaMensaje(raiz, 'No encontramos esta página', 'Revisá que el link esté completo.');

  document.title = titulo;
}

avisoAlmacenamiento();
window.addEventListener('hashchange', renderizar);
renderizar();
