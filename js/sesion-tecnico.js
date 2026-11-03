// Sesión del técnico (E1): tres formularios (propuesta, cambio y cierre).
// Ningún campo es obligatorio: se registra qué queda vacío.
// Pasos: 0 intro · 1 T1 · 2 T2 · 3 T3 · 4 fin.

import { h, limpiar, pantallaMensaje, nuevoId, fotoEjemplo } from './ui.js';
import { CASOS, CODIGOS_TECNICO } from './casos.js';
import { plata, parsearMonto, interpretarTotal } from './formato.js';
import * as V from './versiones.js';
import * as R from './registro.js';
import * as F from './ficha.js';
import { vistaResumen } from './resumen.js';
import { TEXTO_INTRO } from './sesion-hogar.js';

const TAREAS = {
  t1: {
    titulo: 'Tarea 1 de 3: Propuesta',
    instruccion: 'Cargá la propuesta para el cliente con los datos de la hoja.',
    boton: 'Enviar al hogar',
    campos: [
      { id: 'trabajo', etiqueta: 'Qué se va a hacer', tipo: 'area' },
      { id: 'manoObra', etiqueta: 'Mano de obra', tipo: 'monto' },
      { id: 'materiales', etiqueta: 'Materiales', tipo: 'monto' },
      { id: 'visita', etiqueta: 'Visita (opcional)', tipo: 'monto' },
      { id: 'total', etiqueta: 'Total', tipo: 'texto', ayuda: 'Se calcula solo con los montos. También podés escribir un rango (por ejemplo, 5000 a 7000).' },
      { id: 'formaPago', etiqueta: 'Forma de pago y recargos', tipo: 'texto' },
      { id: 'noIncluye', etiqueta: 'Qué NO incluye', tipo: 'area' },
      { id: 'dependeDe', etiqueta: 'Qué depende de revisar', tipo: 'area' },
      { respaldo: true },
    ],
  },
  t2: {
    titulo: 'Tarea 2 de 3: Cambio',
    instruccion: 'Durante el trabajo encontraste algo que cambia el acuerdo. Cargá el cambio para el cliente.',
    boton: 'Enviar y esperar respuesta del hogar',
    campos: [
      { id: 'motivo', etiqueta: 'Qué encontraste', tipo: 'area' },
      { foto: true, id: 'foto', etiqueta: 'Foto' },
      { id: 'adicionalManoObra', etiqueta: 'Costo adicional: mano de obra', tipo: 'monto' },
      { id: 'adicionalMateriales', etiqueta: 'Costo adicional: materiales', tipo: 'monto' },
      { id: 'nuevoTotal', etiqueta: 'Nuevo total', tipo: 'texto', ayuda: 'Se calcula solo si el total de la propuesta era un monto. Si no, escribilo.' },
    ],
  },
  t3: {
    titulo: 'Tarea 3 de 3: Cierre',
    instruccion: 'Terminaste el trabajo. Cargá el cierre para el cliente.',
    boton: 'Cerrar el trabajo',
    campos: [
      { id: 'hecho', etiqueta: 'Qué se hizo', tipo: 'area' },
      { id: 'prueba', etiqueta: 'Cómo lo probaste', tipo: 'area' },
      { id: 'pendiente', etiqueta: 'Qué quedó pendiente', tipo: 'area' },
      { id: 'observar', etiqueta: 'Qué tiene que observar el hogar', tipo: 'area' },
      { respaldo: true, ayuda: 'Viene cargado con lo que pusiste en la propuesta. Podés cambiarlo.' },
    ],
  },
};

// Misma frase que dice el facilitador al empezar (ver PROTOCOLO.md).
const INSTRUCCION_HOJA = 'Usá los montos y el cambio de esta hoja. El respaldo poné el que ofrecerías de verdad en un trabajo así.';

// "etiqueta" es la que va a los resultados; "corta", la que se ve en el formulario.
const CAMPOS_RESPALDO = [
  { id: 'respaldoPlazo', etiqueta: 'Respaldo: plazo', corta: 'Plazo' },
  { id: 'respaldoCubre', etiqueta: 'Respaldo: qué cubre', corta: 'Qué cubre' },
  { id: 'respaldoNoCubre', etiqueta: 'Respaldo: qué no cubre', corta: 'Qué no cubre' },
];

const texto = (v) => (v && String(v).trim()) || null;

function respaldoDe(f) {
  if (f.sinRespaldo) return { ninguno: true };
  const r = { plazo: texto(f.respaldoPlazo), cubre: texto(f.respaldoCubre), noCubre: texto(f.respaldoNoCubre) };
  return r.plazo || r.cubre || r.noCubre ? r : null;
}

function montos(pares) {
  return pares.map(([concepto, valor]) => ({ concepto, monto: parsearMonto(valor) })).filter((i) => i.monto != null);
}

function contenidoPropuesta(f) {
  return {
    trabajo: texto(f.trabajo),
    items: montos([['Mano de obra', f.manoObra], ['Materiales', f.materiales], ['Visita', f.visita]]),
    ...interpretarTotal(f.total),
    formaPago: texto(f.formaPago),
    presupuesto: null,
    noIncluye: texto(f.noIncluye),
    dependeDe: texto(f.dependeDe),
    respaldo: respaldoDe(f),
  };
}

function adicionalesDe(f) {
  return montos([['Mano de obra', f.adicionalManoObra], ['Materiales', f.adicionalMateriales]]);
}

// Arma con versiones.js la ficha que vería el hogar. Las respuestas del hogar son simuladas.
function construirVistaPrevia(formularios) {
  const { t1, t2, t3 } = formularios;
  const caso = V.crearCaso('vista-previa');
  const c1 = contenidoPropuesta(t1);
  const v1 = V.proponerAcuerdo(caso, c1);
  V.responder(caso, v1.id, 'aceptar', { autor: 'simulado' });
  const adicionales = adicionalesDe(t2);
  const c2 = {
    ...c1,
    items: [...c1.items, ...adicionales.map((i) => ({ concepto: `${i.concepto} (adicional)`, monto: i.monto }))],
    ...interpretarTotal(t2.nuevoTotal),
  };
  const v2 = V.proponerCambio(caso, c2, { motivo: texto(t2.motivo), adicionales, foto: t2.foto ? 'adjunta por el técnico' : null });
  V.responder(caso, v2.id, 'aceptar', { autor: 'simulado' });
  V.registrarCierre(caso, {
    hecho: texto(t3.hecho), prueba: texto(t3.prueba), pendiente: texto(t3.pendiente), observar: texto(t3.observar), respaldo: respaldoDe(t3),
  });
  return caso;
}

export function montarTecnico(raiz, codigoCrudo, params) {
  const codigo = codigoCrudo.toUpperCase();
  if (!CODIGOS_TECNICO.includes(codigo)) {
    pantallaMensaje(raiz, 'Código no válido', `No existe una sesión de técnico con el código “${codigoCrudo}”.`);
    return () => {};
  }
  const numeroCaso = params.get('caso') === '2' ? 2 : 1;
  const datos = CASOS[numeroCaso];
  let s = R.sesionEnCurso('tecnico', codigo, numeroCaso);
  let verIntro = false;
  const temporizadores = [];
  const guardar = () => R.guardarSesion(s);

  function pintar() {
    limpiar(raiz);
    window.scrollTo(0, 0);
    if (!s) return pintarInicio();
    const paso = s.estado.paso;
    if (paso >= 1 && paso <= 3) return pintarTarea(`t${paso}`);
    return pintarFin();
  }

  function pintarInicio() {
    const anterior = R.ultimaTerminada('tecnico', codigo, numeroCaso);
    if (anterior && !verIntro) {
      raiz.append(h('main', { class: 'pantalla' },
        h('h1', null, '¡Gracias!'),
        h('p', null, `La sesión ${codigo} (caso ${numeroCaso}) ya se terminó en este navegador.`),
        h('h2', null, 'Resumen de resultados'),
        vistaResumen(anterior),
        h('div', { class: 'siguiente' },
          h('button', { class: 'boton', type: 'button', onClick: () => { verIntro = true; pintar(); } }, 'Empezar una sesión nueva'))));
      return;
    }
    raiz.append(h('main', { class: 'pantalla pantalla--intro' },
      h('h1', null, '¡Hola!'),
      h('p', { class: 'intro-texto' }, TEXTO_INTRO),
      h('p', null, 'Vas a completar tres formularios sobre un mismo trabajo: la propuesta, un cambio y el cierre. Los datos del trabajo están en la hoja de datos.'),
      h('button', {
        class: 'boton boton--primario boton--grande', type: 'button',
        onClick: () => {
          s = R.crearSesion({ rol: 'tecnico', codigo, caso: numeroCaso, estado: { paso: 1, formularios: { t1: {}, t2: {}, t3: null } } });
          pintar();
        },
      }, 'Empezar'),
      h('p', { class: 'pie-codigo' }, `Sesión ${codigo} · caso ${numeroCaso}`)));
  }

  function hojaDatos(tarea) {
    const hoja = h('details', { class: 'hoja', open: true },
      h('summary', null, 'Hoja de datos del trabajo'),
      h('p', { class: 'nota' }, 'Notas de lo que hablaste con el cliente y de lo que pasó.'),
      h('ul', null, datos.hojaTecnico[tarea].map((n) => h('li', null, n))));
    // Se escucha el clic (y no "toggle") para no registrar la apertura inicial.
    hoja.querySelector('summary').addEventListener('click', () => {
      setTimeout(() => R.registrarEvento(s, tarea, 'boton', hoja.open ? 'Abrir hoja de datos' : 'Cerrar hoja de datos'));
    });
    return hoja;
  }

  function campoTexto(f, def, alCambiar) {
    const id = nuevoId(def.id);
    const comun = { id, name: def.id, value: f[def.id] || '' };
    const input = def.tipo === 'area'
      ? h('textarea', { ...comun, rows: 3 })
      : h('input', { ...comun, type: 'text', inputmode: def.tipo === 'monto' ? 'numeric' : null, autocomplete: 'off' });
    input.addEventListener('input', () => {
      f[def.id] = input.value;
      if (alCambiar) alCambiar(def.id, input);
      guardar();
    });
    const control = def.tipo === 'monto' ? h('div', { class: 'con-prefijo' }, h('span', { 'aria-hidden': 'true' }, '$'), input) : input;
    return {
      input,
      el: h('div', { class: 'campo' },
        h('label', { for: id, class: 'etiqueta' }, def.etiqueta),
        control,
        def.ayuda ? h('p', { class: 'ayuda' }, def.ayuda) : null),
    };
  }

  function bloqueRespaldo(f, tarea, ayuda) {
    const inputs = [];
    const filas = CAMPOS_RESPALDO.map((def) => {
      const c = campoTexto(f, { id: def.id, tipo: 'texto', etiqueta: def.corta });
      inputs.push(c.input);
      return c.el;
    });
    const aplicar = () => inputs.forEach((i) => { i.disabled = !!f.sinRespaldo; });
    const casilla = h('input', {
      type: 'checkbox', id: nuevoId('sin-respaldo'), checked: !!f.sinRespaldo,
      onChange: (e) => {
        f.sinRespaldo = e.target.checked;
        R.registrarEvento(s, tarea, 'boton', `${e.target.checked ? 'Marcar' : 'Desmarcar'}: No ofrezco respaldo para este trabajo`);
        aplicar();
        guardar();
      },
    });
    aplicar();
    return h('fieldset', { class: 'grupo' },
      h('legend', null, 'Respaldo'),
      ayuda ? h('p', { class: 'ayuda' }, ayuda) : null,
      filas,
      h('label', { class: 'casilla', for: casilla.id }, casilla, h('span', null, 'No ofrezco respaldo para este trabajo')));
  }

  function camposVacios(f, tarea) {
    const vacios = [];
    TAREAS[tarea].campos.forEach((def) => {
      if (def.respaldo) {
        if (!f.sinRespaldo) CAMPOS_RESPALDO.forEach((r) => { if (!texto(f[r.id])) vacios.push(r.etiqueta); });
      } else if (def.foto) {
        if (!f.foto) vacios.push('Foto');
      } else if (!texto(f[def.id])) {
        vacios.push(def.etiqueta);
      }
    });
    return vacios;
  }

  function valoresDe(f, tarea) {
    const valores = {};
    TAREAS[tarea].campos.forEach((def) => {
      if (def.respaldo) {
        CAMPOS_RESPALDO.forEach((r) => { valores[r.etiqueta] = (f[r.id] || '').trim(); });
        valores['No ofrezco respaldo'] = f.sinRespaldo ? 'sí' : 'no';
      } else if (def.foto) {
        valores['Foto adjunta'] = f.foto ? 'sí' : 'no';
      } else {
        valores[def.etiqueta] = (f[def.id] || '').trim();
      }
    });
    return valores;
  }

  function pintarTarea(tarea) {
    const def = TAREAS[tarea];
    const formularios = s.estado.formularios;
    if (tarea === 't3' && !formularios.t3) {
      const t1 = formularios.t1;
      formularios.t3 = {
        respaldoPlazo: t1.respaldoPlazo || '', respaldoCubre: t1.respaldoCubre || '', respaldoNoCubre: t1.respaldoNoCubre || '', sinRespaldo: !!t1.sinRespaldo,
      };
    }
    const f = formularios[tarea];
    R.entrarEtapa(s, tarea, { titulo: def.titulo, caso: numeroCaso });

    const controles = {};
    const automatico = (idTotal, calcular) => {
      if (f[`_${idTotal}Manual`]) return;
      const valor = calcular();
      f[idTotal] = valor;
      if (controles[idTotal]) controles[idTotal].value = valor;
    };
    const calcularTotalT1 = () => {
      const m = montos([['', f.manoObra], ['', f.materiales], ['', f.visita]]);
      return m.length ? plata(m.reduce((a, i) => a + i.monto, 0)) : '';
    };
    const calcularTotalT2 = () => {
      const base = interpretarTotal(formularios.t1.total);
      const ad = adicionalesDe(f);
      if (!ad.length || base.rango || typeof base.total !== 'number') return '';
      return plata(base.total + ad.reduce((a, i) => a + i.monto, 0));
    };

    const alCambiar = (id, input) => {
      if (id === 'total' || id === 'nuevoTotal') {
        f[`_${id}Manual`] = input.value.trim() !== '';
        if (!f[`_${id}Manual`]) automatico(id, id === 'total' ? calcularTotalT1 : calcularTotalT2);
        return;
      }
      if (tarea === 't1') automatico('total', calcularTotalT1);
      if (tarea === 't2') automatico('nuevoTotal', calcularTotalT2);
    };

    const campos = def.campos.map((c) => {
      if (c.respaldo) return bloqueRespaldo(f, tarea, c.ayuda);
      if (c.foto) {
        const estado = h('span', { class: 'foto-estado' });
        const vista = h('div', { class: 'foto-vista' });
        const boton = h('button', { class: 'boton', type: 'button' });
        const actualizar = () => {
          boton.textContent = f.foto ? 'Quitar la foto' : 'Adjuntar foto';
          estado.textContent = f.foto ? 'Foto adjunta ✔ (simulada: no se sube nada)' : 'Sin foto';
          limpiar(vista);
          if (f.foto) vista.append(fotoEjemplo('adjunta por el técnico'));
        };
        boton.addEventListener('click', () => {
          f.foto = !f.foto;
          R.registrarEvento(s, tarea, 'boton', f.foto ? 'Adjuntar foto' : 'Quitar la foto');
          actualizar();
          guardar();
        });
        actualizar();
        return h('div', { class: 'campo' }, h('p', { class: 'etiqueta' }, 'Foto'), h('div', { class: 'foto-fila' }, boton, estado), vista);
      }
      const campo = campoTexto(f, c, alCambiar);
      controles[c.id] = campo.input;
      return campo.el;
    });

    if (tarea === 't2' && !f.nuevoTotal) automatico('nuevoTotal', calcularTotalT2);

    const zonaEnvio = h('div', { class: 'siguiente' });
    const form = h('form', { class: 'formulario', novalidate: true, onSubmit: (e) => { e.preventDefault(); enviar(); } },
      campos,
      zonaEnvio);

    function enviar() {
      const vacios = camposVacios(f, tarea);
      const extra = { camposVacios: vacios, valores: valoresDe(f, tarea) };
      if (tarea === 't1') extra.totalCalculadoSolo = !f._totalManual && !!texto(f.total);
      if (tarea === 't2') extra.nuevoTotalCalculadoSolo = !f._nuevoTotalManual && !!texto(f.nuevoTotal);
      if (tarea === 't3') {
        const t1 = formularios.t1;
        extra.respaldoModificado = CAMPOS_RESPALDO.some((r) => (f[r.id] || '') !== (t1[r.id] || '')) || !!f.sinRespaldo !== !!t1.sinRespaldo;
      }
      R.registrarEvento(s, tarea, 'boton', def.boton);
      R.salirEtapa(s, tarea, extra);
      if (tarea === 't2') {
        s.estado.t2Enviado = true;
        guardar();
        mostrarEspera(true);
        return;
      }
      s.estado.paso += 1;
      if (tarea === 't3') R.terminarSesion(s);
      guardar();
      pintar();
    }

    // T2: después de enviar, el hogar "responde" (simulado).
    function mostrarEspera(conDemora) {
      form.querySelectorAll('input, textarea, button').forEach((el) => { el.disabled = true; });
      limpiar(zonaEnvio);
      const estado = h('div', { class: 'estado-envio', role: 'status' }, h('p', null, 'Enviado. Esperando la respuesta del hogar…'));
      zonaEnvio.append(estado);
      const mostrarRespuesta = () => {
        limpiar(estado);
        estado.classList.add('estado-envio--ok');
        estado.append(
          h('p', { class: 'estado-envio-titulo' }, 'El hogar aceptó el cambio'),
          h('p', { class: 'nota' }, 'Respuesta simulada para esta prueba.'),
          h('button', {
            class: 'boton boton--primario boton--grande', type: 'button',
            onClick: () => { s.estado.paso = 3; guardar(); pintar(); },
          }, 'Seguir con el cierre'));
      };
      if (conDemora) temporizadores.push(setTimeout(mostrarRespuesta, 1500));
      else mostrarRespuesta();
      estado.scrollIntoView({ block: 'nearest' });
    }

    raiz.append(h('main', { class: 'pantalla pantalla--ancha' },
      h('h1', null, def.titulo),
      h('p', null, def.instruccion),
      h('div', { class: 'tarea' },
        h('aside', { class: 'tarea-hoja' },
          h('p', { class: 'instruccion-hoja' }, INSTRUCCION_HOJA),
          hojaDatos(tarea)),
        h('div', { class: 'tarea-formulario' }, form)),
      h('p', { class: 'pie-codigo' }, `Sesión ${codigo} · caso ${numeroCaso}`)));

    if (tarea === 't2' && s.estado.t2Enviado) mostrarEspera(false);
    else zonaEnvio.append(h('button', { class: 'boton boton--primario boton--grande', type: 'submit' }, def.boton));
  }

  function pintarFin() {
    const caso = construirVistaPrevia(s.estado.formularios);
    const [v1, v2] = caso.versiones;
    raiz.append(h('main', { class: 'pantalla' },
      h('h1', null, '¡Gracias!'),
      h('p', null, 'Terminaste las tres tareas.'),
      h('p', { class: 'nota-guion' }, 'Para el equipo: tocá “Descargar resultados” (abajo de todo) y subí el archivo a la carpeta compartida antes de empezar otra sesión.'),
      h('h2', null, 'Así vería el hogar la ficha que cargaste'),
      h('p', { class: 'nota' }, 'Las respuestas del hogar son simuladas. Lo que dejaste vacío no aparece.'),
      h('div', { class: 'ficha vista-previa' },
        F.encabezadoFicha({ tecnico: datos.tecnico }),
        F.tarjetaAcuerdo(caso, v1, { titulo: 'Propuesta' }),
        F.tarjetaCambio(caso, v2),
        F.tarjetaCierre(caso.cierre),
        F.historialCaso(caso)),
      h('h2', null, 'Resumen de resultados'),
      vistaResumen(s)));
  }

  pintar();
  return () => temporizadores.forEach(clearTimeout);
}
