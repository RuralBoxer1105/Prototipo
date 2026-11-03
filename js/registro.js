// Registro de resultados: tiempos, botones, textos y campos vacíos de cada sesión.
// Se guarda en localStorage a medida que avanza la sesión, para que nada se
// pierda si se recarga la página. Si el navegador no deja guardar, todo sigue
// funcionando en memoria mientras la página esté abierta.

import { fechaHora, hora, sello } from './formato.js';

const memoria = new Map();
const disponible = probarLocalStorage();

function probarLocalStorage() {
  try {
    const k = 'fca:prueba-escritura';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function almacenamientoDisponible() {
  return disponible;
}

// Misma interfaz que localStorage. Lo escrito en esta carga de la página se lee
// primero de memoria, así un fallo de escritura no deja datos viejos a la vista.
export const almacen = {
  getItem(clave) {
    if (memoria.has(clave)) return memoria.get(clave);
    if (!disponible) return null;
    try {
      return window.localStorage.getItem(clave);
    } catch {
      return null;
    }
  },
  setItem(clave, valor) {
    memoria.set(clave, String(valor));
    if (!disponible) return;
    try {
      window.localStorage.setItem(clave, String(valor));
    } catch {
      // Cuota llena o almacenamiento bloqueado: queda en memoria.
    }
  },
  removeItem(clave) {
    memoria.delete(clave);
    if (!disponible) return;
    try {
      window.localStorage.removeItem(clave);
    } catch {
      // Nada que hacer.
    }
  },
};

const INDICE = 'fca:sesiones';
const claveSesion = (id) => `fca:sesion:${id}`;

const NOMBRE_ROL = { hogar: 'Hogar', tecnico: 'Técnico', 'prueba-tecnica': 'Prueba técnica' };
const NOMBRE_FORMATO = { ficha: 'Ficha', mensajes: 'Mensajes' };

export const nombreRol = (rol) => NOMBRE_ROL[rol] || rol;
export const nombreFormato = (f) => NOMBRE_FORMATO[f] || f;

function leerIndice() {
  try {
    const lista = JSON.parse(almacen.getItem(INDICE) || '[]');
    return Array.isArray(lista) ? lista : [];
  } catch {
    return [];
  }
}

function escribirIndice(ids) {
  almacen.setItem(INDICE, JSON.stringify(ids));
}

export function crearSesion({ rol, codigo, caso = null, orden = null, estado = {} }) {
  const inicio = new Date().toISOString();
  const s = {
    id: `${codigo}-${sello(inicio)}-${Math.random().toString(36).slice(2, 6)}`,
    codigo,
    rol,
    caso,
    orden,
    inicio,
    fin: null,
    terminada: false,
    anchoPantalla: typeof window !== 'undefined' ? window.innerWidth : null,
    etapas: [],
    preferencia: null,
    estado,
  };
  escribirIndice([...leerIndice(), s.id]);
  guardarSesion(s);
  return s;
}

export function guardarSesion(s) {
  s.actualizada = new Date().toISOString();
  almacen.setItem(claveSesion(s.id), JSON.stringify(s));
}

export function leerSesion(id) {
  try {
    const texto = almacen.getItem(claveSesion(id));
    return texto ? JSON.parse(texto) : null;
  } catch {
    return null;
  }
}

export function listarSesiones() {
  return leerIndice()
    .map(leerSesion)
    .filter(Boolean)
    .sort((a, b) => b.inicio.localeCompare(a.inicio));
}

const coincide = (s, rol, codigo, caso) => s.rol === rol && s.codigo === codigo && (caso == null || s.caso === caso);

export function sesionEnCurso(rol, codigo, caso = null) {
  return listarSesiones().find((s) => coincide(s, rol, codigo, caso) && !s.terminada) || null;
}

export function ultimaTerminada(rol, codigo, caso = null) {
  return listarSesiones().find((s) => coincide(s, rol, codigo, caso) && s.terminada) || null;
}

export function borrarSesiones() {
  leerIndice().forEach((id) => almacen.removeItem(claveSesion(id)));
  almacen.removeItem(INDICE);
}

function segundosDesde(inicioIso, finIso) {
  return Math.round((new Date(finIso) - new Date(inicioIso)) / 1000);
}

function buscarEtapa(s, clave) {
  return s.etapas.find((e) => e.clave === clave) || null;
}

// Se llama cada vez que se muestra la pantalla de una etapa o tarea. La primera
// vez guarda la hora de entrada; si se vuelve a abrir (recarga) lo anota.
export function entrarEtapa(s, clave, info = {}) {
  let e = buscarEtapa(s, clave);
  const ahora = new Date().toISOString();
  if (!e) {
    e = { clave, ...info, entrada: ahora, salida: null, duracionSeg: null, eventos: [], textos: [] };
    s.etapas.push(e);
  } else if (!e.salida) {
    e.eventos.push({ hora: ahora, seg: segundosDesde(e.entrada, ahora), tipo: 'recarga', detalle: 'Se volvió a abrir la pantalla' });
  }
  guardarSesion(s);
  return e;
}

export function salirEtapa(s, clave, extra = {}) {
  const e = buscarEtapa(s, clave);
  if (!e || e.salida) return e;
  e.salida = new Date().toISOString();
  e.duracionSeg = segundosDesde(e.entrada, e.salida);
  Object.assign(e, extra);
  guardarSesion(s);
  return e;
}

// Sesión hogar: segundos desde la entrada a la etapa hasta la primera respuesta
// del hogar. La duración de la etapa no sirve para esto porque incluye las
// preguntas del facilitador. Solo se guarda la primera.
export function marcarPrimeraRespuesta(s, clave) {
  const e = buscarEtapa(s, clave);
  if (!e || e.salida || e.tiempoHastaResponderSeg != null) return;
  e.tiempoHastaResponderSeg = segundosDesde(e.entrada, new Date().toISOString());
  guardarSesion(s);
}

// Suma de las etapas 1 y 2 (acuerdo + cambio) de cada formato.
// null si en alguna de las dos el hogar no respondió.
export function tiempoAcuerdoCambio(s) {
  if (s.rol !== 'hogar' || !s.orden) return null;
  const tiempos = {};
  s.orden.forEach((o) => {
    const valores = s.etapas
      .filter((e) => e.formato === o.formato && (e.etapa === 1 || e.etapa === 2))
      .map((e) => e.tiempoHastaResponderSeg);
    tiempos[o.formato] = valores.length === 2 && valores.every((v) => typeof v === 'number') ? valores[0] + valores[1] : null;
  });
  return tiempos;
}

export const ACLARACION_TIEMPO = 'En la etapa 1 este tiempo incluye la pregunta 6 del protocolo.';

export function textoTiempoAcuerdoCambio(s) {
  const t = tiempoAcuerdoCambio(s);
  if (!t) return null;
  const valor = (v) => (v == null ? 'sin dato' : `${v} s`);
  return `Acuerdo + cambio, tiempo hasta responder: Ficha ${valor(t.ficha)} · Mensajes ${valor(t.mensajes)}`;
}

// tipo: "boton" para botones tocados; otros tipos para hechos del guion.
export function registrarEvento(s, clave, tipo, detalle) {
  const e = buscarEtapa(s, clave);
  if (!e) return;
  const ahora = new Date().toISOString();
  e.eventos.push({ hora: ahora, seg: segundosDesde(e.entrada, ahora), tipo, detalle });
  guardarSesion(s);
}

export function registrarTexto(s, clave, campo, texto) {
  const e = buscarEtapa(s, clave);
  if (!e) return;
  const ahora = new Date().toISOString();
  e.textos.push({ hora: ahora, seg: segundosDesde(e.entrada, ahora), campo, texto });
  guardarSesion(s);
}

export function terminarSesion(s, extra = {}) {
  Object.assign(s, extra);
  s.fin = new Date().toISOString();
  s.terminada = true;
  guardarSesion(s);
}

export function nombreArchivo(s) {
  return `resultados-${s.codigo}-${sello(s.inicio)}.json`;
}

// Sin el estado interno de la pantalla, que no hace falta para analizar.
export function datosExportables(s) {
  const { estado, ...resto } = s;
  const salida = { ...resto };
  if (estado && estado.ficha) salida.casoFicha = estado.ficha;
  if (estado && estado.chat) salida.mensajesChat = estado.chat;
  if (estado && estado.formularios) salida.formularios = estado.formularios;
  return salida;
}

function describirOrden(s) {
  if (!s.orden) return null;
  return s.orden.map((o) => `Parte ${o.parte}: ${nombreFormato(o.formato)} con el caso ${o.caso}`).join(' · ');
}

// Cómo terminó cada versión de la ficha y quién la resolvió, para analizar
// aparte los rechazos y las aceptaciones que puso el guion.
export function decisionesFicha(s) {
  const caso = s.estado && s.estado.ficha;
  if (!caso) return [];
  return caso.versiones.map((v) => {
    const respuestas = caso.eventos.filter((e) => e.tipo === 'respuesta' && e.versionId === v.id);
    const preguntas = respuestas.filter((e) => e.respuesta === 'preguntar').length;
    const final = respuestas.filter((e) => e.respuesta !== 'preguntar').pop();
    let quien = 'todavía sin respuesta';
    if (final) quien = final.autor === 'guion' ? 'resolvió el guion (el hogar no respondió)' : `resolvió el hogar: ${final.respuesta === 'aceptar' ? 'Acepto' : 'No acepto'}`;
    return `${v.etiqueta} (${v.tipo === 'acuerdo' ? 'acuerdo' : 'cambio'}): ${quien}${preguntas ? ` · ${preguntas} pregunta(s)` : ''}`;
  });
}

export function textoPlano(s) {
  const l = [];
  l.push('Ficha compartida del arreglo – resultados de la sesión');
  l.push(`Código: ${s.codigo}`);
  l.push(`Rol: ${nombreRol(s.rol)}`);
  l.push(`Inicio: ${fechaHora(s.inicio)}`);
  l.push(`Fin: ${s.fin ? fechaHora(s.fin) : 'sin terminar'}`);
  const orden = describirOrden(s);
  if (orden) l.push(`Orden: ${orden}`);
  if (s.caso) l.push(`Caso: ${s.caso}`);
  if (s.anchoPantalla) l.push(`Ancho de pantalla: ${s.anchoPantalla} px`);

  for (const e of s.etapas) {
    l.push('');
    l.push(`■ ${e.titulo || e.clave}`);
    const hastaResponder = 'tiempoHastaResponderSeg' in e
      ? ` · Hasta responder ${e.tiempoHastaResponderSeg == null ? 'sin respuesta' : `${e.tiempoHastaResponderSeg} s`}`
      : '';
    l.push(`  Entrada ${hora(e.entrada)} · Salida ${e.salida ? hora(e.salida) : '—'} · Duración ${e.duracionSeg ?? '—'} s${hastaResponder}`);
    const botones = e.eventos.filter((x) => x.tipo === 'boton');
    l.push(`  Botones tocados: ${botones.length ? botones.map((x) => `${x.detalle} (${x.seg} s)`).join('; ') : 'ninguno'}`);
    e.eventos.filter((x) => x.tipo !== 'boton').forEach((x) => l.push(`  Nota: ${x.detalle} (${x.seg} s)`));
    if (e.textos.length) {
      l.push('  Textos escritos:');
      e.textos.forEach((t) => l.push(`   - ${t.campo}: "${t.texto}" (${t.seg} s)`));
    }
    if (e.valores) {
      l.push('  Lo que cargó:');
      Object.entries(e.valores).forEach(([campo, valor]) => l.push(`   - ${campo}: ${valor === '' ? '(vacío)' : `"${valor}"`}`));
    }
    if (e.camposVacios) {
      l.push(`  Campos vacíos (${e.camposVacios.length}): ${e.camposVacios.length ? e.camposVacios.join(', ') : 'ninguno'}`);
    }
  }

  const tiempo = textoTiempoAcuerdoCambio(s);
  if (tiempo) {
    l.push('');
    l.push(tiempo);
    l.push(`(${ACLARACION_TIEMPO})`);
  }

  const decisiones = decisionesFicha(s);
  if (decisiones.length) {
    l.push('');
    l.push('Decisiones en la ficha:');
    decisiones.forEach((d) => l.push(`  - ${d}`));
  }

  if (s.rol === 'hogar') {
    l.push('');
    l.push(`Preferencia: ${s.preferencia ? `Como ${s.preferencia === 'ficha' ? 'la ficha' : 'los mensajes'}` : 'sin elegir'}`);
    l.push(`¿Por qué?: ${s.porque ? `"${s.porque}"` : '(vacío)'}`);
  }

  if (s.resultado) {
    l.push('');
    l.push(`Resultado: ${s.resultado.correctas} de ${s.resultado.total} comprobaciones correctas`);
    s.resultado.pasos.forEach((p) => l.push(`  ${p.ok ? '✔' : '✘'} ${p.n}. ${p.titulo}: ${p.detalle}`));
  }
  return l.join('\n');
}

export async function copiarTexto(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    // Sin permiso de portapapeles (por ejemplo, fuera de https): plan B.
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    area.remove();
    return ok;
  }
}

export function descargarJSON(nombre, datos) {
  const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
