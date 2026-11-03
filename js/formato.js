// Formato de montos, horas y fechas. Módulo puro (sin DOM).

export function plata(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '';
  const signo = n < 0 ? '-' : '';
  const miles = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${signo}$${miles}`;
}

// "2.850", "$ 2850", "2850,50" → 2850. Vacío o sin dígitos → null.
export function parsearMonto(texto) {
  if (texto == null) return null;
  const sinDecimales = String(texto).trim().replace(/,\d{1,2}$/, '');
  const digitos = sinDecimales.replace(/\D/g, '');
  return digitos ? Number(digitos) : null;
}

// Interpreta lo que el técnico escribe en "Total": un monto, un rango
// ("5000 a 7000") o un texto libre. Siempre devuelve las tres claves.
export function interpretarTotal(texto) {
  const t = String(texto ?? '').trim();
  const vacio = { total: null, rango: null, totalTexto: null };
  if (!t) return vacio;
  const numeros = (t.match(/\d[\d.]*/g) || []).map(parsearMonto).filter((n) => n != null);
  if (numeros.length >= 2) {
    const [a, b] = numeros;
    return { total: null, rango: { min: Math.min(a, b), max: Math.max(a, b) }, totalTexto: null };
  }
  if (numeros.length === 1) {
    const soloMonto = /^\$?\s*[\d.]+(,\d{1,2})?$/.test(t);
    return { total: numeros[0], rango: null, totalTexto: soloMonto ? null : t };
  }
  return { ...vacio, totalTexto: t };
}

const dos = (n) => String(n).padStart(2, '0');

export function hora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${dos(d.getHours())}:${dos(d.getMinutes())}:${dos(d.getSeconds())}`;
}

export function fecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${dos(d.getDate())}/${dos(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function fechaHora(iso) {
  return `${fecha(iso)} ${hora(iso)}`;
}

// 2026-11-03T15:30:12 → "2026-11-03-1530" (para nombres de archivo e ids).
export function sello(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}-${dos(d.getHours())}${dos(d.getMinutes())}`;
}
