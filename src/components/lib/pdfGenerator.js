import { jsPDF } from "jspdf";

/**
 * Genera el PDF del presupuesto en el propio navegador (sin backend).
 * Devuelve la instancia de jsPDF — quien llama decide si la descarga
 * (doc.save) o la comparte (doc.output('blob') + navigator.share).
 *
 * @param {object} params
 * @param {object} params.company   { name, tagline, primaryColorRgb: [r,g,b], contactPhone, contactWhatsapp, contactEmail, logoDataUrl? }
 * @param {object} params.client    { name, phone, location }
 * @param {Array}  params.items     [{ description, unit, quantity, unitPrice }]
 * @param {object} params.summary   { subtotal, marginPercent, marginAmount, total }
 * @param {string} params.budgetNumber
 * @param {Date}   params.date
 * @param {number} params.validDays  días de validez del presupuesto (por defecto 15)
 */
export function generateBudgetPDF({
  company,
  client,
  items,
  summary,
  budgetNumber,
  date = new Date(),
  validDays = 15,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;
  const [r, g, b] = company.primaryColorRgb || [245, 166, 35]; // ámbar FORTIMETAL por defecto

  let y = 20;

  // --- Encabezado con logo (si hay) y datos de la empresa ---
  if (company.logoDataUrl) {
    try {
      doc.addImage(company.logoDataUrl, "PNG", margin, y - 8, 18, 18);
    } catch {
      // Si el logo no es un dataURL válido, seguimos sin logo en vez de romper el PDF.
    }
  }
  const textX = company.logoDataUrl ? margin + 24 : margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(26, 29, 33);
  doc.text(company.name || "Empresa", textX, y);

  if (company.tagline) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 115, 120);
    doc.text(company.tagline, textX, y + 5);
  }

  // Franja de color de marca bajo el encabezado
  y += 12;
  doc.setFillColor(r, g, b);
  doc.rect(margin, y, pageWidth - margin * 2, 1.2, "F");
  y += 10;

  // --- Título del documento + número/fecha ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(26, 29, 33);
  doc.text("PRESUPUESTO REFERENCIAL", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(110, 115, 120);
  doc.text(`N° ${budgetNumber}`, pageWidth - margin, y - 4, { align: "right" });
  doc.text(date.toLocaleDateString("es-PE"), pageWidth - margin, y + 1, { align: "right" });
  y += 10;

  // --- Datos del cliente ---
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 29, 33);
  doc.text("Cliente", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(60, 64, 68);
  if (client?.name) doc.text(client.name, margin, y);
  if (client?.phone) doc.text(client.phone, margin, y + 4.5);
  if (client?.location) doc.text(client.location, margin, y + 9);
  y += client?.location ? 16 : client?.phone ? 11 : 6;

  // --- Tabla de items (dibujada a mano, sin plugin autoTable, para no sumar otra dependencia) ---
  const col = {
    desc: margin,
    unit: margin + 88,
    qty: margin + 110,
    price: margin + 132,
    total: pageWidth - margin,
  };

  doc.setFillColor(26, 29, 33);
  doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(244, 244, 243);
  doc.text("DESCRIPCIÓN", col.desc + 2, y + 4.8);
  doc.text("UND.", col.unit, y + 4.8);
  doc.text("CANT.", col.qty, y + 4.8);
  doc.text("P. UNIT.", col.price, y + 4.8);
  doc.text("SUBTOTAL", col.total, y + 4.8, { align: "right" });
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(40, 43, 46);

  items.forEach((item, index) => {
    const rowTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    if (index % 2 === 1) {
      doc.setFillColor(245, 245, 244);
      doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    }
    doc.text(String(item.description || ""), col.desc + 2, y + 4.8, { maxWidth: 84 });
    doc.text(String(item.unit || ""), col.unit, y + 4.8);
    doc.text(String(item.quantity ?? ""), col.qty, y + 4.8);
    doc.text(`S/ ${Number(item.unitPrice || 0).toFixed(2)}`, col.price, y + 4.8);
    doc.text(`S/ ${rowTotal.toFixed(2)}`, col.total, y + 4.8, { align: "right" });
    y += 7;

    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  y += 4;
  doc.setDrawColor(220, 220, 218);
  doc.line(margin, y, pageWidth - margin, y);
  y += 7;

  // --- Totales ---
  const totalsX = pageWidth - margin;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(70, 74, 78);
  doc.text("Subtotal", totalsX - 40, y, { align: "left" });
  doc.text(`S/ ${summary.subtotal.toFixed(2)}`, totalsX, y, { align: "right" });
  y += 6;

  if (summary.marginAmount > 0) {
    doc.text(`Margen (${summary.marginPercent}%)`, totalsX - 40, y, { align: "left" });
    doc.text(`S/ ${summary.marginAmount.toFixed(2)}`, totalsX, y, { align: "right" });
    y += 6;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(26, 29, 33);
  doc.text("TOTAL", totalsX - 40, y + 2, { align: "left" });
  doc.text(`S/ ${summary.total.toFixed(2)}`, totalsX, y + 2, { align: "right" });
  y += 16;

  // --- Disclaimer + contacto ---
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(130, 134, 138);
  const disclaimer = `Presupuesto referencial válido por ${validDays} días calendario. Precios sujetos a verificación en obra y disponibilidad de materiales. No incluye IGV salvo que se indique lo contrario.`;
  doc.text(disclaimer, margin, y, { maxWidth: pageWidth - margin * 2 });
  y += 12;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 64, 68);
  const contactParts = [];
  if (company.contactPhone) contactParts.push(`Tel: ${company.contactPhone}`);
  if (company.contactWhatsapp) contactParts.push(`WhatsApp: ${company.contactWhatsapp}`);
  if (company.contactEmail) contactParts.push(company.contactEmail);
  if (contactParts.length) doc.text(contactParts.join("  ·  "), margin, y);

  return doc;
}

/**
 * Convierte el PDF ya generado en un File listo para navigator.share o para descarga manual.
 */
export function pdfToFile(doc, filename) {
  const blob = doc.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
}
