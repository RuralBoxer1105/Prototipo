// Datos de los dos casos simulados y de la asignación de participantes.
// Todo lo que muestran la ficha, el chat y la sesión del técnico sale de este
// archivo: si hay que corregir un dato, se corrige acá y en ningún otro lado.
// Los montos de los mensajes del chat se arman con los mismos números de la
// ficha, así no pueden quedar distintos.

import { plata } from './formato.js';

export const ETAPAS = ['Acuerdo', 'Cambio', 'Cierre', 'Volvió la falla'];

// Asignación de los hogares (E2 y E3). PH es el piloto y repite H1.
export const ASIGNACION_HOGAR = {
  H1: { ficha: 1, mensajes: 2, primero: 'ficha' },
  H2: { ficha: 2, mensajes: 1, primero: 'ficha' },
  H3: { ficha: 1, mensajes: 2, primero: 'mensajes' },
  H4: { ficha: 2, mensajes: 1, primero: 'mensajes' },
  H5: { ficha: 1, mensajes: 2, primero: 'ficha' },
  PH: { ficha: 1, mensajes: 2, primero: 'ficha' },
};

// Técnicos (E1). PT es el piloto. Caso por defecto: 1 (se cambia con ?caso=2).
export const CODIGOS_TECNICO = ['T1', 'T2', 'T3', 'PT'];

const caso1 = {
  id: 1,
  titulo: 'Bajada de la pileta',
  tecnico: 'Martín (sanitario)',
  problema: 'Goteo leve en una unión de la bajada de la pileta de la cocina.',
  acuerdo: {
    trabajo: 'Cambiar toda la bajada de la pileta.',
    items: [
      { concepto: 'Mano de obra', monto: 2850 },
      { concepto: 'Materiales', monto: 3280 },
    ],
    total: 6130,
    rango: null,
    totalTexto: null,
    formaPago: 'En efectivo. 15 % de recargo si no se paga en efectivo.',
    presupuesto: 'Presupuestado a distancia, a partir de una foto.',
    noIncluye: 'Reparar el mueble bajo la mesada si la humedad lo dañó.',
    dependeDe: 'El estado de la conexión de la bajada con el caño de la pared, que no se ve en la foto.',
    respaldo: { plazo: '30 días', cubre: 'La mano de obra.', noCubre: 'Materiales que aporte el cliente.' },
  },
  cambio: {
    motivo: 'Al desarmar, la conexión con la pared está deteriorada y hay que cambiarla.',
    trabajo: 'Cambiar toda la bajada de la pileta y la conexión con la pared.',
    adicionales: [
      { concepto: 'Mano de obra', monto: 900 },
      { concepto: 'Materiales', monto: 900 },
    ],
    diferencia: { monto: 1800, sobre: 'total' },
    total: 7930,
    foto: 'Conexión de la bajada con la pared',
  },
  cierre: {
    hecho: 'Bajada y conexión cambiadas.',
    prueba: 'Pileta llena y vaciada sin pérdidas.',
    pendiente: 'Revisar si aparece humedad bajo la mesada en la primera semana.',
  },
  volvio: {
    cuando: '3 semanas después',
    situacion: 'Tres semanas después, vuelve a gotear la unión nueva.',
  },
  // Solo en el chat.
  limiteChat: 7000,
  // Notas sueltas para la sesión del técnico, por tarea.
  hojaTecnico: {
    t1: [
      'El cliente te mandó una foto: gotea un poco una unión de la bajada de la pileta de la cocina.',
      'Vas a cambiar toda la bajada.',
      'Mano de obra 2850, materiales 3280.',
      'Que pague en efectivo; si no, 15 % más.',
      'Lo presupuestás a distancia, por la foto.',
      'Si la humedad dañó el mueble de abajo de la mesada, eso no lo arreglás.',
      'En la foto no se ve cómo está la conexión de la bajada con el caño de la pared.',
      'Le das 30 días por la mano de obra. Si el cliente pone materiales, eso no lo cubrís.',
    ],
    t2: [
      'Desarmaste y la conexión con la pared está deteriorada: hay que cambiarla.',
      'Le sacaste una foto a la conexión.',
      'Son 900 más de mano de obra y 900 de materiales.',
    ],
    t3: [
      'Cambiaste la bajada y la conexión.',
      'Llenaste la pileta y la vaciaste: no pierde.',
      'El cliente tiene que fijarse la primera semana si aparece humedad abajo de la mesada.',
    ],
  },
};

const caso2 = {
  id: 2,
  titulo: 'Caño dentro de la pared',
  tecnico: 'Diego (sanitario)',
  problema: 'Una pérdida en un caño dentro de la pared del baño hace saltar la luz.',
  acuerdo: {
    trabajo: 'Romper la pared y cambiar el caño que pierde.',
    items: [],
    total: null,
    rango: { min: 8000, max: 12000 },
    totalTexto: null,
    formaPago: null,
    presupuesto: 'Estimado por teléfono, sin ver.',
    noIncluye: 'Revocar la pared.',
    dependeDe: 'El estado del resto del caño, que no se ve hasta abrir la pared.',
    respaldo: { plazo: '60 días', cubre: 'La mano de obra en el tramo cambiado.', noCubre: 'El revoque.' },
  },
  cambio: {
    motivo: 'El caño es de hierro y está picado. Si se cambia solo el pedazo, se pincharía en otro lado en unos seis meses.',
    trabajo: 'Romper la pared y cambiar todo el tramo de caño.',
    adicionales: [],
    diferencia: { monto: 2000, sobre: 'maximo' },
    total: 14000,
    foto: 'Caño de hierro picado dentro de la pared',
  },
  cierre: {
    hecho: 'Tramo de caño cambiado.',
    prueba: 'Se abrió el agua y no perdía.',
    pendiente: 'Revocar la pared (albañil) y habilitar el enchufe (electricista) cuando la pared se seque, en unas dos semanas.',
  },
  volvio: {
    cuando: '1 mes después',
    situacion: 'Un mes después, aparece humedad en la misma pared.',
  },
  limiteChat: 12000,
  hojaTecnico: {
    t1: [
      'El cliente te llamó: pierde un caño dentro de la pared del baño y le salta la luz.',
      'No fuiste a ver: se lo estimás por teléfono.',
      'Hay que romper la pared y cambiar el caño que pierde.',
      'Le decís que sale entre 8000 y 12000.',
      'Revocar la pared no lo hacés vos.',
      'Cómo está el resto del caño no lo sabés hasta abrir la pared.',
      'Le das 60 días por la mano de obra en el tramo que cambies. El revoque no lo cubrís.',
    ],
    t2: [
      'Abriste la pared: el caño es de hierro y está picado.',
      'Si cambiás solo el pedazo, en unos seis meses se pincha en otro lado.',
      'Le proponés cambiar todo el tramo: en total serían 14000.',
      'Le sacaste una foto al caño.',
    ],
    t3: [
      'Cambiaste el tramo de caño.',
      'Abriste el agua y no perdía.',
      'Falta revocar la pared (lo hace un albañil) y habilitar el enchufe (un electricista), cuando la pared se seque, en unas dos semanas.',
    ],
  },
};

// Acuerdo completo después del cambio (contenido de la v2).
// Lo que ya se revisó deja de "depender de revisar".
export function acuerdoDespuesDelCambio(caso) {
  const a = caso.acuerdo;
  const c = caso.cambio;
  return {
    ...a,
    trabajo: c.trabajo,
    items: [...a.items, ...c.adicionales.map((i) => ({ concepto: `${i.concepto} (adicional)`, monto: i.monto }))],
    total: c.total,
    rango: null,
    presupuesto: null,
    dependeDe: null,
  };
}

// Mensajes del chat, por etapa. Misma información que la ficha; la única
// diferencia es que acá se acuerda antes el límite de gasto.
function chatCaso1(c) {
  const a = c.acuerdo;
  const k = c.cambio;
  const [mo, mat] = a.items;
  const [moAd, matAd] = k.adicionales;
  return {
    1: [
      {
        tipo: 'audio', duracion: '0:16', archivo: 'audio/caso1-etapa1.mp3',
        transcripcion: 'Hola, soy Martín. Vi la foto que me mandaste: es un goteo leve en una unión de la bajada de la pileta de la cocina. Lo que te propongo es cambiar toda la bajada. Te paso el detalle por escrito.',
      },
      {
        tipo: 'texto',
        texto: `Te resumo:
• Cambio toda la bajada de la pileta.
• Mano de obra ${plata(mo.monto)} y materiales ${plata(mat.monto)}: total ${plata(a.total)} en efectivo. Si no pagás en efectivo, tiene 15 % de recargo.
• Te lo presupuesto a distancia, por la foto.
• No incluye reparar el mueble bajo la mesada si la humedad lo dañó.
• Depende de cómo esté la conexión de la bajada con el caño de la pared, que en la foto no se ve.
• Te doy ${a.respaldo.plazo} de respaldo por la mano de obra. No cubre materiales que aporte el cliente.`,
      },
      { tipo: 'texto', texto: `Si mientras trabajo el costo se pasa de ${plata(c.limiteChat)}, te consulto antes de seguir. ¿Te parece?` },
    ],
    2: [
      { tipo: 'foto', descripcion: k.foto },
      { tipo: 'texto', texto: 'Al desarmar me encontré con que la conexión con la pared está deteriorada. Hay que cambiarla.' },
      { tipo: 'texto', texto: `Son ${plata(k.diferencia.monto)} más: ${plata(moAd.monto)} de mano de obra y ${plata(matAd.monto)} de materiales. El total quedaría en ${plata(k.total)} en efectivo.` },
      { tipo: 'texto', texto: `Como se pasa de los ${plata(c.limiteChat)} que habíamos hablado, te consulto antes de seguir. ¿Le doy?` },
    ],
    3: [
      {
        tipo: 'audio', duracion: '0:09', archivo: 'audio/caso1-etapa3.mp3',
        transcripcion: 'Listo, ya terminé. Cambié la bajada y la conexión. Llené la pileta, la vacié y no pierde nada.',
      },
      {
        tipo: 'texto',
        texto: `Te dejo cómo quedó:
• Hecho: bajada y conexión cambiadas.
• Prueba: llené y vacié la pileta, sin pérdidas.
• Pendiente: fijate en la primera semana si aparece humedad bajo la mesada.`,
      },
      { tipo: 'documento', nombre: 'Resumen del arreglo.pdf', texto: 'Te mando el resumen de lo que acordamos y lo que hice.' },
    ],
    4: [
      { tipo: 'separador', texto: c.volvio.cuando },
      { tipo: 'situacion', texto: c.volvio.situacion },
    ],
  };
}

function chatCaso2(c) {
  const a = c.acuerdo;
  const k = c.cambio;
  return {
    1: [
      {
        tipo: 'audio', duracion: '0:17', archivo: 'audio/caso2-etapa1.mp3',
        transcripcion: 'Hola, soy Diego. Por lo que me contaste por teléfono, una pérdida en un caño dentro de la pared del baño te hace saltar la luz. Hay que romper la pared y cambiar el caño que pierde. Te dejo el detalle por escrito.',
      },
      {
        tipo: 'texto',
        texto: `Te resumo:
• Rompo la pared y cambio el caño que pierde.
• Te lo estimo por teléfono, sin ver: entre ${plata(a.rango.min)} y ${plata(a.rango.max)}.
• No incluye revocar la pared.
• Depende de cómo esté el resto del caño, que no se ve hasta abrir la pared.
• Te doy ${a.respaldo.plazo} de respaldo por la mano de obra en el tramo que cambie. No cubre el revoque.`,
      },
      { tipo: 'texto', texto: `Si mientras trabajo se pasa de ${plata(c.limiteChat)}, te consulto antes de seguir. ¿Te parece?` },
    ],
    2: [
      { tipo: 'foto', descripcion: k.foto },
      { tipo: 'texto', texto: 'Abrí la pared. El caño es de hierro y está picado: si cambio solo el pedazo, en unos seis meses se va a pinchar en otro lado.' },
      { tipo: 'texto', texto: `Te propongo cambiar todo el tramo. El total quedaría en ${plata(k.total)}, o sea ${plata(k.diferencia.monto)} por encima del máximo que te había estimado.` },
      { tipo: 'texto', texto: `Como se pasa de los ${plata(c.limiteChat)} que habíamos hablado, te consulto antes de seguir. ¿Le doy?` },
    ],
    3: [
      {
        tipo: 'audio', duracion: '0:07', archivo: 'audio/caso2-etapa3.mp3',
        transcripcion: 'Listo, terminé. Cambié el tramo de caño. Abrí el agua y no perdía.',
      },
      {
        tipo: 'texto',
        texto: `Te dejo cómo quedó:
• Hecho: tramo de caño cambiado.
• Prueba: abrí el agua y no perdía.
• Pendiente: cuando la pared se seque, en unas dos semanas, hay que revocarla (eso lo hace un albañil) y habilitar el enchufe (eso, un electricista).`,
      },
      { tipo: 'documento', nombre: 'Resumen del arreglo.pdf', texto: 'Te mando el resumen de lo que acordamos y lo que hice.' },
    ],
    4: [
      { tipo: 'separador', texto: c.volvio.cuando },
      { tipo: 'situacion', texto: c.volvio.situacion },
    ],
  };
}

caso1.chat = chatCaso1(caso1);
caso2.chat = chatCaso2(caso2);

export const CASOS = { 1: caso1, 2: caso2 };
