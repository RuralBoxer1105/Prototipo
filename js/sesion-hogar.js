// Sesión del hogar (E2 y E3): dos partes (ficha y mensajes, con casos
// distintos) de 4 etapas cada una, la pregunta de preferencia y el fin.
// Pasos: 0 intro · 1–4 parte 1 · 5–8 parte 2 · 9 preferencia · 10 fin.

import { h, limpiar, barraProgreso, pantallaMensaje, nuevoId } from './ui.js';
import { CASOS, ETAPAS, ASIGNACION_HOGAR, acuerdoDespuesDelCambio } from './casos.js';
import * as V from './versiones.js';
import * as R from './registro.js';
import * as F from './ficha.js';
import { crearChat } from './chat.js';
import { vistaResumen } from './resumen.js';

const PASO_PREFERENCIA = 9;
const PASO_FIN = 10;

export const TEXTO_INTRO = 'Gracias por ayudarnos. Estamos probando un prototipo, no a vos. No hay respuestas buenas ni malas. Los casos son simulados.';

export function ordenHogar(codigo) {
  const a = ASIGNACION_HOGAR[codigo];
  const segundo = a.primero === 'ficha' ? 'mensajes' : 'ficha';
  return [
    { parte: 1, formato: a.primero, caso: a[a.primero] },
    { parte: 2, formato: segundo, caso: a[segundo] },
  ];
}

export function montarHogar(raiz, codigoCrudo) {
  const codigo = codigoCrudo.toUpperCase();
  if (!ASIGNACION_HOGAR[codigo]) {
    pantallaMensaje(raiz, 'Código no válido', `No existe una sesión de hogar con el código “${codigoCrudo}”.`);
    return () => {};
  }

  let s = R.sesionEnCurso('hogar', codigo);
  if (s && s.estado.ficha) s.estado.ficha = V.restaurar(s.estado.ficha);

  const guardar = () => R.guardarSesion(s);

  function pintar() {
    limpiar(raiz);
    window.scrollTo(0, 0);
    if (!s) return pintarInicio();
    const paso = s.estado.paso;
    if (paso >= 1 && paso <= 8) return pintarEtapa(paso);
    if (paso === PASO_PREFERENCIA) return pintarPreferencia();
    return pintarFin();
  }

  function empezar() {
    s = R.crearSesion({
      rol: 'hogar',
      codigo,
      orden: ordenHogar(codigo),
      estado: { paso: 1, ficha: null, chat: {}, notas: {} },
    });
    pintar();
  }

  // Si la sesión ya se terminó en este navegador (por ejemplo, se recargó la
  // pantalla final), se vuelve a mostrar el fin en vez de arrancar de cero.
  let verIntro = false;

  function pintarInicio() {
    const anterior = R.ultimaTerminada('hogar', codigo);
    if (anterior && !verIntro) {
      raiz.append(h('main', { class: 'pantalla' },
        h('h1', null, '¡Gracias!'),
        h('p', null, `La sesión ${codigo} ya se terminó en este navegador.`),
        h('h2', null, 'Resumen de resultados'),
        vistaResumen(anterior),
        h('div', { class: 'siguiente' },
          h('button', { class: 'boton', type: 'button', onClick: () => { verIntro = true; pintar(); } }, 'Empezar una sesión nueva'))));
      return;
    }
    raiz.append(h('main', { class: 'pantalla pantalla--intro' },
      h('h1', null, '¡Hola!'),
      h('p', { class: 'intro-texto' }, TEXTO_INTRO),
      h('button', { class: 'boton boton--primario boton--grande', type: 'button', onClick: empezar }, 'Empezar'),
      h('p', { class: 'pie-codigo' }, `Sesión ${codigo}`)));
  }

  function avanzar(clave) {
    R.registrarEvento(s, clave, 'boton', 'Siguiente');
    R.salirEtapa(s, clave);
    s.estado.paso += 1;
    guardar();
    pintar();
  }

  function pintarEtapa(paso) {
    const parte = paso <= 4 ? 1 : 2;
    const etapa = paso <= 4 ? paso : paso - 4;
    const o = s.orden[parte - 1];
    const datos = CASOS[o.caso];
    const clave = `p${parte}-e${etapa}`;
    R.entrarEtapa(s, clave, {
      titulo: `Parte ${parte} · ${R.nombreFormato(o.formato)} · Caso ${o.caso} · Etapa ${etapa}: ${ETAPAS[etapa - 1]}`,
      parte, formato: o.formato, caso: o.caso, etapa,
      tiempoHastaResponderSeg: null,
    });

    const contenido = o.formato === 'ficha' ? vistaFicha(etapa, datos, clave) : vistaChat(etapa, datos, clave);
    const main = h('main', { class: `pantalla pantalla--${o.formato}` },
      barraProgreso(parte, etapa),
      contenido.el,
      h('div', { class: 'siguiente' },
        h('button', { class: 'boton boton--primario boton--grande', type: 'button', onClick: () => avanzar(clave) }, 'Siguiente')),
      h('p', { class: 'pie-codigo' }, `Sesión ${codigo}`));
    raiz.append(main);
    if (contenido.alMostrar) contenido.alMostrar();
  }

  // ───── Formato ficha ─────

  // Si el hogar no aceptó la versión que estaba esperando respuesta, el guion
  // sigue igual: una versión sin respuesta se toma como aceptada (queda anotado
  // como respuesta del "guion", no del hogar) y una rechazada queda rechazada.
  function seguirGuion(caso, etapa, clave) {
    const abierta = V.versionAbierta(caso);
    const ultima = V.ultimaVersion(caso);
    if (abierta) {
      V.responder(caso, abierta.id, 'aceptar', { autor: 'guion' });
      s.estado.notas[etapa] = abierta.tipo === 'acuerdo'
        ? 'Nota de la prueba: no respondiste a la propuesta. Para seguir, la tomamos como aceptada.'
        : 'Nota de la prueba: no respondiste al cambio. Para seguir, lo tomamos como aceptado.';
      R.registrarEvento(s, clave, 'guion', `La ${abierta.etiqueta} no tenía respuesta: se tomó como aceptada para seguir`);
    } else if (ultima && ultima.estado === V.ESTADOS.RECHAZADA) {
      // Misma frase que dice el facilitador en los dos formatos (ver PROTOCOLO.md).
      s.estado.notas[etapa] = 'Nota de la prueba: supongamos que lo hablaron y el trabajo se hizo igual; seguimos.';
      R.registrarEvento(s, clave, 'guion', `La ${ultima.etiqueta} fue rechazada: el caso sigue igual para la prueba`);
    }
  }

  // Prepara el caso para la etapa. Es idempotente: al recargar no repite nada.
  function prepararFicha(etapa, datos, clave) {
    if (!s.estado.ficha) {
      const caso = V.crearCaso(`${codigo}-caso${datos.id}`, { caso: datos.id });
      V.proponerAcuerdo(caso, datos.acuerdo);
      s.estado.ficha = caso;
    }
    const caso = s.estado.ficha;
    if (etapa >= 2 && caso.versiones.length < 2) {
      seguirGuion(caso, 2, clave);
      V.proponerCambio(caso, acuerdoDespuesDelCambio(datos), {
        motivo: datos.cambio.motivo,
        diferencia: datos.cambio.diferencia,
        adicionales: datos.cambio.adicionales,
        foto: datos.cambio.foto,
      });
    }
    if (etapa >= 3 && !caso.cierre) {
      seguirGuion(caso, 3, clave);
      const base = V.versionVigente(caso) || V.ultimaVersion(caso);
      V.registrarCierre(caso, { ...datos.cierre, respaldo: base.contenido.respaldo });
    }
    guardar();
    return caso;
  }

  function vistaFicha(etapa, datos, clave) {
    const caso = prepararFicha(etapa, datos, clave);
    const cont = h('div', { class: 'ficha' });

    const responderVersion = (version) => (tipo, texto, boton) => {
      R.registrarEvento(s, clave, 'boton', boton);
      R.marcarPrimeraRespuesta(s, clave);
      if (texto) R.registrarTexto(s, clave, 'Pregunta', texto);
      V.responder(caso, version.id, tipo, { texto });
      guardar();
      refrescar();
    };
    // "Tengo una pregunta" cuenta como respuesta; abrir el historial, no.
    const alTocar = (boton) => {
      R.registrarEvento(s, clave, 'boton', boton);
      if (boton === 'Tengo una pregunta') R.marcarPrimeraRespuesta(s, clave);
    };

    function construir() {
      const partes = [F.encabezadoFicha(datos)];
      const nota = s.estado.notas[etapa];
      if (nota) partes.push(h('p', { class: 'nota-guion' }, nota));

      if (etapa === 1) {
        const v1 = caso.versiones[0];
        // Una vez respondida, el resultado lo dice el bloque de respuesta.
        const estadoTexto = V.estaEsperandoRespuesta(v1) ? 'Propuesta, esperando tu respuesta' : null;
        partes.push(
          F.tarjetaAcuerdo(caso, v1, { titulo: 'Propuesta del técnico', estadoTexto }),
          F.bloqueRespuesta(caso, v1, { alResponder: responderVersion(v1), alTocar }));
      }

      if (etapa === 2) {
        const [v1, v2] = caso.versiones;
        partes.push(h('div', { class: 'comparacion' },
          h('div', { class: 'comparacion-cambio' },
            F.tarjetaCambio(caso, v2),
            F.bloqueRespuesta(caso, v2, { alResponder: responderVersion(v2), alTocar })),
          h('div', { class: 'comparacion-anterior' },
            h('p', { class: 'rotulo' }, 'Acuerdo anterior'),
            F.tarjetaAcuerdo(caso, v1))));
      }

      if (etapa === 3) {
        partes.push(F.tarjetaCierre(caso.cierre), F.historialCaso(caso));
      }

      if (etapa === 4) {
        partes.push(
          F.situacion(datos.volvio),
          F.tarjetaCierre(caso.cierre),
          F.historialCaso(caso),
          F.bloqueAviso(caso, {
            alAvisar: (texto) => {
              R.registrarEvento(s, clave, 'boton', 'Avisar al técnico que volvió la falla');
              R.marcarPrimeraRespuesta(s, clave);
              if (texto) R.registrarTexto(s, clave, 'Mensaje del aviso', texto);
              V.registrarAviso(caso, texto);
              guardar();
              refrescar();
            },
          }));
      }
      return partes;
    }

    function refrescar() {
      const abiertos = [...cont.querySelectorAll('details[open]')].map((d) => d.querySelector('summary').textContent);
      limpiar(cont);
      cont.append(...construir().filter(Boolean));
      cont.querySelectorAll('details').forEach((d) => {
        if (abiertos.includes(d.querySelector('summary').textContent)) d.open = true;
      });
      enlazarDetalles();
    }

    // Registrar cuándo abre las versiones del historial. Se escucha el clic (y no
    // "toggle") para no registrar las que se reabren solas al redibujar.
    function enlazarDetalles() {
      cont.querySelectorAll('details.version').forEach((d) => {
        d.querySelector('summary').addEventListener('click', () => {
          setTimeout(() => { if (d.open) alTocar(`Abrir en el historial: ${d.querySelector('.version-nombre').textContent}`); });
        });
      });
    }

    cont.append(...construir().filter(Boolean));
    enlazarDetalles();
    return { el: cont };
  }

  // ───── Formato mensajes ─────

  function vistaChat(etapa, datos, clave) {
    const mensajes = s.estado.chat[datos.id] || (s.estado.chat[datos.id] = []);
    const chat = crearChat({
      datos,
      etapa,
      mensajesHogar: mensajes,
      alTocar: (boton) => R.registrarEvento(s, clave, 'boton', boton),
      alEnviar: (texto, boton) => {
        mensajes.push({ etapa, texto });
        R.registrarEvento(s, clave, 'boton', boton);
        R.marcarPrimeraRespuesta(s, clave);
        R.registrarTexto(s, clave, 'Mensaje', texto);
      },
    });
    return {
      el: chat.el,
      alMostrar: () => {
        if (chat.primeraNueva) requestAnimationFrame(() => chat.primeraNueva.scrollIntoView({ block: 'start' }));
      },
    };
  }

  // ───── Preferencia y fin ─────

  function pintarPreferencia() {
    const clave = 'preferencia';
    R.entrarEtapa(s, clave, { titulo: 'Preferencia' });
    const nombre = nuevoId('pref');
    const idPorque = nuevoId('porque');
    const opcion = (valor, texto) => h('label', { class: 'opcion' },
      h('input', { type: 'radio', name: nombre, value: valor, onChange: () => R.registrarEvento(s, clave, 'boton', texto) }),
      h('span', null, texto));
    const porque = h('textarea', { id: idPorque, rows: 4 });
    const aviso = h('p', { class: 'nota', role: 'status' });
    let avisado = false;

    const terminar = () => {
      const elegida = raiz.querySelector(`input[name="${nombre}"]:checked`);
      if (!elegida && !avisado) {
        avisado = true;
        aviso.textContent = 'No elegiste ninguna opción. Si querés terminar igual, tocá “Terminar” otra vez.';
        return;
      }
      R.registrarEvento(s, clave, 'boton', 'Terminar');
      if (porque.value.trim()) R.registrarTexto(s, clave, '¿Por qué?', porque.value.trim());
      R.salirEtapa(s, clave);
      s.estado.paso = PASO_FIN;
      R.terminarSesion(s, { preferencia: elegida ? elegida.value : null, porque: porque.value.trim() });
      pintar();
    };

    raiz.append(h('main', { class: 'pantalla' },
      h('h1', null, 'Una última pregunta'),
      h('fieldset', { class: 'opciones' },
        h('legend', null, 'Si tuvieras un próximo arreglo, ¿cómo preferirías recibir esta información?'),
        opcion('ficha', 'Como la ficha'),
        opcion('mensajes', 'Como los mensajes')),
      h('label', { for: idPorque, class: 'etiqueta' }, '¿Por qué?'),
      porque,
      aviso,
      h('div', { class: 'siguiente' }, h('button', { class: 'boton boton--primario boton--grande', type: 'button', onClick: terminar }, 'Terminar')),
      h('p', { class: 'pie-codigo' }, `Sesión ${codigo}`)));
  }

  function pintarFin() {
    raiz.append(h('main', { class: 'pantalla' },
      h('h1', null, '¡Gracias!'),
      h('p', null, 'Terminaste. Tus respuestas quedaron guardadas en este navegador.'),
      h('p', { class: 'nota-guion' }, 'Para el equipo: tocá “Descargar resultados” y subí el archivo a la carpeta compartida antes de empezar otra sesión.'),
      h('h2', null, 'Resumen de resultados'),
      vistaResumen(s)));
  }

  pintar();
  return () => {};
}
