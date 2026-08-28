/**
 * Cálculos del presupuesto. Funciones puras (sin acceso a localStorage ni al DOM)
 * para poder probarlas de forma aislada y reutilizarlas igual en el componente
 * de React que en, por ejemplo, un futuro reporte del backend.
 */

/** Redondea a 2 decimales evitando errores de coma flotante tipo 0.1 + 0.2. */
export function round2(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Total de una línea del presupuesto: cantidad x precio unitario. */
export function computeLineTotal(item) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  return round2(qty * price);
}

/** Suma de todas las líneas (antes de aplicar margen/utilidad). */
export function computeSubtotal(items) {
  return round2(items.reduce((acc, item) => acc + computeLineTotal(item), 0));
}

/** Monto de margen/utilidad sobre el subtotal, dado un porcentaje (ej. 20 -> 20%). */
export function computeMarginAmount(subtotal, marginPercent) {
  const pct = Number(marginPercent) || 0;
  return round2(subtotal * (pct / 100));
}

/** Total final: subtotal + margen. */
export function computeTotal(subtotal, marginAmount) {
  return round2(subtotal + marginAmount);
}

/** Arma el resumen completo a partir de las líneas y el % de margen — lo que consume la UI y el PDF. */
export function computeBudgetSummary(items, marginPercent) {
  const subtotal = computeSubtotal(items);
  const marginAmount = computeMarginAmount(subtotal, marginPercent);
  const total = computeTotal(subtotal, marginAmount);
  return { subtotal, marginPercent: Number(marginPercent) || 0, marginAmount, total };
}

/** Número correlativo simple para el presupuesto, ej. "PRE-20260828-0142". Sirve como referencia visible en el PDF. */
export function generateBudgetNumber(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `PRE-${yyyy}${mm}${dd}-${rand}`;
}
