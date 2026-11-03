// Versiones del acuerdo y sus estados.
// Módulo puro: no toca el DOM. Guardar y cargar reciben el almacenamiento
// (localStorage u otro con getItem/setItem) como parámetro.
// Lo usan la ficha del hogar, la vista previa del técnico y la prueba técnica.
//
// Reglas:
//  1. Solo puede haber UNA versión esperando respuesta a la vez.
//  2. La vigente es la última aceptada. Una pendiente nunca es vigente.
//  3. Al aceptar una versión nueva, la aceptada anterior pasa a "reemplazada";
//     su contenido no se borra ni se modifica (está congelado).
//  4. Si se rechaza un cambio, la vigente sigue siendo la anterior.
//  5. Cada respuesta del hogar guarda el id de la versión a la que responde.
//  6. Responder a una versión que no espera respuesta tira un error.
//  7. El historial se recupera completo y en orden.
//  8. Se puede guardar y cargar sin perder nada.
//
// "propuesta" es el estado del acuerdo inicial mientras espera respuesta;
// "pendiente" es el de un cambio mientras espera respuesta. Las dos cuentan
// como "esperando respuesta" para las reglas 1 y 6.

export const ESTADOS = Object.freeze({
  PROPUESTA: 'propuesta',
  PENDIENTE: 'pendiente',
  ACEPTADA: 'aceptada',
  RECHAZADA: 'rechazada',
  REEMPLAZADA: 'reemplazada',
});

export const RESPUESTAS = Object.freeze(['aceptar', 'rechazar', 'preguntar']);

const ESPERANDO_RESPUESTA = [ESTADOS.PROPUESTA, ESTADOS.PENDIENTE];
const FORMATO = 'fca-caso';
const VERSION_FORMATO = 1;

export class ErrorVersiones extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.name = 'ErrorVersiones';
    this.codigo = codigo;
  }
}

function clonar(valor) {
  return valor === undefined ? undefined : JSON.parse(JSON.stringify(valor));
}

function congelar(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) {
    Object.values(valor).forEach(congelar);
    Object.freeze(valor);
  }
  return valor;
}

function fechaDe(opciones) {
  return (opciones && opciones.fecha) || new Date().toISOString();
}

function agregarEvento(caso, evento) {
  const e = congelar({ n: caso.eventos.length + 1, ...clonar(evento) });
  caso.eventos.push(e);
  return e;
}

export function crearCaso(id, datos = {}) {
  return { id: String(id), datos: clonar(datos) || {}, versiones: [], eventos: [], cierre: null };
}

export function estaEsperandoRespuesta(version) {
  return !!version && ESPERANDO_RESPUESTA.includes(version.estado);
}

export function buscarVersion(caso, id) {
  return caso.versiones.find((v) => v.id === id) || null;
}

export function versionAbierta(caso) {
  return caso.versiones.find(estaEsperandoRespuesta) || null;
}

export function versionVigente(caso) {
  const aceptadas = caso.versiones.filter((v) => v.estado === ESTADOS.ACEPTADA);
  return aceptadas.length ? aceptadas[aceptadas.length - 1] : null;
}

export function ultimaVersion(caso) {
  return caso.versiones.length ? caso.versiones[caso.versiones.length - 1] : null;
}

// Diferencia de precio entre dos contenidos. Si el anterior era un rango,
// se compara contra el máximo estimado.
export function calcularDiferencia(anterior, nuevo) {
  if (!anterior || !nuevo || typeof nuevo.total !== 'number') return null;
  if (typeof anterior.total === 'number') return { monto: nuevo.total - anterior.total, sobre: 'total' };
  if (anterior.rango) return { monto: nuevo.total - anterior.rango.max, sobre: 'maximo' };
  return null;
}

function crearVersion(caso, contenido, datos, opciones) {
  const numero = caso.versiones.length + 1;
  const fecha = fechaDe(opciones);
  const version = {
    id: `${caso.id}-v${numero}`,
    numero,
    etiqueta: `v${numero}`,
    tipo: datos.tipo,
    contenido: congelar(clonar(contenido) || {}),
    motivo: datos.motivo || null,
    diferencia: congelar(clonar(datos.diferencia) || null),
    adicionales: congelar(clonar(datos.adicionales) || []),
    foto: datos.foto || null,
    baseId: datos.baseId || null,
    estado: datos.estado,
    fecha,
  };
  caso.versiones.push(version);
  agregarEvento(caso, {
    tipo: datos.tipo === 'acuerdo' ? 'propuesta' : 'cambio',
    versionId: version.id,
    autor: (opciones && opciones.autor) || 'tecnico',
    fecha,
  });
  return version;
}

export function proponerAcuerdo(caso, contenido, opciones = {}) {
  if (caso.versiones.length) {
    throw new ErrorVersiones('ACUERDO_EXISTENTE', 'El caso ya tiene un acuerdo. Para modificarlo hay que proponer un cambio.');
  }
  return crearVersion(caso, contenido, { tipo: 'acuerdo', estado: ESTADOS.PROPUESTA }, opciones);
}

export function proponerCambio(caso, contenido, detalle = {}, opciones = {}) {
  if (!caso.versiones.length) {
    throw new ErrorVersiones('SIN_ACUERDO', 'No se puede proponer un cambio antes de proponer el acuerdo.');
  }
  const abierta = versionAbierta(caso);
  if (abierta) {
    throw new ErrorVersiones(
      'YA_HAY_PENDIENTE',
      `Ya hay una versión esperando respuesta (${abierta.etiqueta}). Hasta que el hogar responda no se puede proponer otro cambio.`,
    );
  }
  const base = versionVigente(caso) || ultimaVersion(caso);
  const diferencia = detalle.diferencia !== undefined ? detalle.diferencia : calcularDiferencia(base.contenido, contenido);
  return crearVersion(caso, contenido, {
    tipo: 'cambio',
    estado: ESTADOS.PENDIENTE,
    motivo: detalle.motivo,
    diferencia,
    adicionales: detalle.adicionales,
    foto: detalle.foto,
    baseId: base.id,
  }, opciones);
}

// tipo: "aceptar" | "rechazar" | "preguntar". Preguntar no cambia el estado.
export function responder(caso, versionId, tipo, { texto = '', autor = 'hogar', fecha } = {}) {
  if (!RESPUESTAS.includes(tipo)) {
    throw new ErrorVersiones('RESPUESTA_INVALIDA', `"${tipo}" no es una respuesta válida.`);
  }
  const version = buscarVersion(caso, versionId);
  if (!version) {
    throw new ErrorVersiones('VERSION_INEXISTENTE', `No existe la versión ${versionId}.`);
  }
  if (!estaEsperandoRespuesta(version)) {
    throw new ErrorVersiones(
      'NO_PENDIENTE',
      `La versión ${version.etiqueta} no está esperando respuesta (está "${version.estado}").`,
    );
  }
  const f = fecha || new Date().toISOString();
  const anterior = tipo === 'aceptar' ? versionVigente(caso) : null;
  if (tipo === 'aceptar') version.estado = ESTADOS.ACEPTADA;
  if (tipo === 'rechazar') version.estado = ESTADOS.RECHAZADA;
  const evento = agregarEvento(caso, { tipo: 'respuesta', respuesta: tipo, versionId: version.id, texto, autor, fecha: f });
  if (anterior) {
    anterior.estado = ESTADOS.REEMPLAZADA;
    agregarEvento(caso, { tipo: 'reemplazo', versionId: anterior.id, porId: version.id, autor: 'sistema', fecha: f });
  }
  return evento;
}

export function respuestasDe(caso, versionId) {
  return caso.eventos.filter((e) => e.tipo === 'respuesta' && e.versionId === versionId);
}

export function registrarCierre(caso, cierre, opciones = {}) {
  const abierta = versionAbierta(caso);
  if (abierta) {
    throw new ErrorVersiones('HAY_PENDIENTE', `No se puede cerrar: la ${abierta.etiqueta} sigue esperando respuesta.`);
  }
  if (caso.cierre) throw new ErrorVersiones('YA_CERRADO', 'El trabajo ya está cerrado.');
  const vigente = versionVigente(caso);
  const fecha = fechaDe(opciones);
  caso.cierre = congelar({ ...clonar(cierre), versionId: vigente ? vigente.id : null, fecha });
  agregarEvento(caso, { tipo: 'cierre', versionId: caso.cierre.versionId, autor: opciones.autor || 'tecnico', fecha });
  return caso.cierre;
}

// El hogar avisa que volvió la falla.
export function registrarAviso(caso, texto = '', opciones = {}) {
  const vigente = versionVigente(caso);
  return agregarEvento(caso, {
    tipo: 'aviso', versionId: vigente ? vigente.id : null, texto, autor: opciones.autor || 'hogar', fecha: fechaDe(opciones),
  });
}

export function historial(caso) {
  return clonar(caso.eventos).sort((a, b) => a.n - b.n);
}

// Comprueba las reglas sobre un caso. Devuelve la lista de problemas (vacía si está bien).
export function verificarInvariantes(caso) {
  const problemas = [];
  const abiertas = caso.versiones.filter(estaEsperandoRespuesta);
  if (abiertas.length > 1) problemas.push(`Hay ${abiertas.length} versiones esperando respuesta.`);
  const aceptadas = caso.versiones.filter((v) => v.estado === ESTADOS.ACEPTADA);
  if (aceptadas.length > 1) problemas.push(`Hay ${aceptadas.length} versiones aceptadas al mismo tiempo.`);
  caso.eventos.forEach((e, i) => {
    if (e.n !== i + 1) problemas.push(`El evento ${i + 1} tiene número ${e.n}.`);
    if (e.tipo === 'respuesta' && !buscarVersion(caso, e.versionId)) problemas.push(`La respuesta ${e.n} apunta a una versión que no existe.`);
  });
  caso.versiones.forEach((v) => {
    if (!Object.isFrozen(v.contenido)) problemas.push(`El contenido de la ${v.etiqueta} se puede modificar.`);
  });
  return problemas;
}

export function serializar(caso) {
  return JSON.stringify({ formato: FORMATO, version: VERSION_FORMATO, caso });
}

// Rearma un caso a partir de un objeto plano (por ejemplo, leído de JSON).
export function restaurar(objeto) {
  if (!objeto || !Array.isArray(objeto.versiones) || !Array.isArray(objeto.eventos)) {
    throw new ErrorVersiones('FORMATO_INVALIDO', 'Los datos no tienen la forma de un caso.');
  }
  const caso = clonar(objeto);
  caso.versiones.forEach((v) => {
    congelar(v.contenido);
    congelar(v.diferencia);
    congelar(v.adicionales);
  });
  caso.eventos = caso.eventos.map(congelar);
  caso.cierre = congelar(caso.cierre || null);
  return caso;
}

export function deserializar(texto) {
  const datos = JSON.parse(texto);
  if (!datos || datos.formato !== FORMATO) {
    throw new ErrorVersiones('FORMATO_INVALIDO', 'El texto no es un caso guardado por este prototipo.');
  }
  return restaurar(datos.caso);
}

export function guardar(caso, almacenamiento, clave) {
  try {
    almacenamiento.setItem(clave, serializar(caso));
    return true;
  } catch {
    return false;
  }
}

export function cargar(almacenamiento, clave) {
  try {
    const texto = almacenamiento.getItem(clave);
    return texto ? deserializar(texto) : null;
  } catch {
    return null;
  }
}
