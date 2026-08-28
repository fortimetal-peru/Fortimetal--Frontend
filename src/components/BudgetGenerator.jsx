import { useEffect, useMemo, useState } from "react";
import { Settings, Plus, Trash2, Share2, Download, X, FileText, Save } from "lucide-react";
import { computeBudgetSummary, generateBudgetNumber, computeLineTotal } from "./lib/budgetCalculations.js";
import { generateBudgetPDF, pdfToFile } from "./lib/pdfGenerator.js";

// ---------------------------------------------------------------------------
// Datos de la empresa. Cuando conectes esto a tu backend real, puedes cargar
// estos valores desde GET /companies/me en vez de tenerlos fijos acá.
// ---------------------------------------------------------------------------
const COMPANY = {
  name: "FORTIMETAL",
  tagline: "La fuerza del metal en tus proyectos",
  primaryColorRgb: [245, 166, 35],
  contactPhone: "906702473",
  contactWhatsapp: "+51 906702473",
  contactEmail: "fortimetal24@gmail.com",
};

const STORAGE_KEYS = {
  catalog: "fm_price_catalog",
  history: "fm_budget_history",
  takeoffHandoff: "fm_takeoff_to_budget", // escrito por MaterialTakeoffCalculator.jsx
};

// Catálogo semilla — el ejemplo que diste (tubo S/65, TR-4 S/38 el m²) más algunos
// insumos típicos, para que el panel no arranque vacío. El admin lo edita libremente
// desde el panel de configuración y queda guardado en el dispositivo.
const DEFAULT_CATALOG = [
  { id: "tubo", name: "Tubo estructural 2x2 pulg", unit: "m", price: 65 },
  { id: "tr4", name: "Cobertura TR-4", unit: "m2", price: 38 },
  { id: "plancha", name: "Plancha LAC 1/8\"", unit: "m2", price: 52 },
  { id: "perfil", name: "Perfil C 100x50", unit: "m", price: 48 },
  { id: "pintura", name: "Pintura anticorrosiva", unit: "gal", price: 85 },
  { id: "mano_obra", name: "Mano de obra instalación", unit: "m2", price: 25 },
];

function loadFromStorage(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Si el navegador bloquea localStorage (modo incógnito estricto, cuota llena, etc.),
    // seguimos funcionando en memoria durante la sesión en vez de romper la app.
  }
}

let uid = 0;
const nextId = () => `item_${Date.now()}_${uid++}`;

export default function BudgetGenerator() {
  const [catalog, setCatalog] = useState(DEFAULT_CATALOG);
  const [lineItems, setLineItems] = useState([]);
  const [marginPercent, setMarginPercent] = useState(20);
  const [client, setClient] = useState({ name: "", phone: "", location: "" });
  const [showConfig, setShowConfig] = useState(false);
  const [shareStatus, setShareStatus] = useState(null); // null | 'sharing' | 'shared' | 'error' | 'unsupported'

  // Cargar catálogo guardado al abrir la app (una sola vez)
  useEffect(() => {
    setCatalog(loadFromStorage(STORAGE_KEYS.catalog, DEFAULT_CATALOG));

    // Si venimos de "Enviar al cotizador de campo" desde la calculadora de metrados,
    // precargamos esas líneas (sin precio — el usuario lo completa acá) y limpiamos
    // el handoff para no volver a insertarlo si el usuario recarga la página después.
    const handoff = loadFromStorage(STORAGE_KEYS.takeoffHandoff, null);
    if (handoff?.items?.length) {
      setLineItems(
        handoff.items.map((item) => ({
          id: nextId(),
          description: item.description,
          unit: item.unit,
          unitPrice: 0,
          quantity: item.quantity,
        }))
      );
      try {
        window.localStorage.removeItem(STORAGE_KEYS.takeoffHandoff);
      } catch {
        // no crítico si no se puede limpiar
      }
    }
  }, []);

  const summary = useMemo(() => computeBudgetSummary(lineItems, marginPercent), [lineItems, marginPercent]);

  function persistCatalog(next) {
    setCatalog(next);
    saveToStorage(STORAGE_KEYS.catalog, next);
  }

  function addLineFromCatalog(catalogItem) {
    setLineItems((prev) => [
      ...prev,
      {
        id: nextId(),
        description: catalogItem.name,
        unit: catalogItem.unit,
        unitPrice: catalogItem.price,
        quantity: 1,
      },
    ]);
  }

  function addCustomLine() {
    setLineItems((prev) => [
      ...prev,
      { id: nextId(), description: "", unit: "und", unitPrice: 0, quantity: 1 },
    ]);
  }

  function updateLine(id, patch) {
    setLineItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function removeLine(id) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  function buildPdfDoc() {
    return generateBudgetPDF({
      company: COMPANY,
      client,
      items: lineItems,
      summary,
      budgetNumber: generateBudgetNumber(),
    });
  }

  function saveToHistory() {
    const history = loadFromStorage(STORAGE_KEYS.history, []);
    const entry = {
      id: nextId(),
      date: new Date().toISOString(),
      client,
      items: lineItems,
      summary,
    };
    saveToStorage(STORAGE_KEYS.history, [entry, ...history].slice(0, 100));
  }

  function handleDownload() {
    if (lineItems.length === 0) return;
    const doc = buildPdfDoc();
    doc.save(`presupuesto_${(client.name || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`);
    saveToHistory();
  }

  async function handleShare() {
    if (lineItems.length === 0) return;
    const doc = buildPdfDoc();
    const file = pdfToFile(doc, `presupuesto_${(client.name || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`);

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      setShareStatus("sharing");
      try {
        await navigator.share({
          files: [file],
          title: "Presupuesto FORTIMETAL",
          text: `Presupuesto para ${client.name || "cliente"} — Total S/ ${summary.total.toFixed(2)}`,
        });
        setShareStatus("shared");
        saveToHistory();
      } catch (err) {
        // El usuario canceló el share nativo — no es un error real, solo silenciamos.
        if (err?.name !== "AbortError") setShareStatus("error");
        else setShareStatus(null);
      }
    } else {
      // Sin Web Share API (típicamente en desktop): dejamos el PDF descargado
      // y explicamos que puede adjuntarlo manualmente en WhatsApp Web.
      doc.save(`presupuesto_${(client.name || "cliente").replace(/\s+/g, "_").toLowerCase()}.pdf`);
      setShareStatus("unsupported");
      saveToHistory();
    }
    setTimeout(() => setShareStatus(null), 4000);
  }

  return (
    <div style={{ background: "#EDEEEC", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
        .fm-mono { font-family: 'IBM Plex Mono', monospace; }
        .fm-input, .fm-btn { font-family: inherit; }
        .fm-input:focus-visible, .fm-btn:focus-visible { outline: 2px solid #F5A623; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <header style={{ background: "#1A1D21", padding: "24px 20px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <FileText size={20} color="#F5A623" strokeWidth={2.5} />
            <span className="fm-mono" style={{ color: "#8B9096", fontSize: 11, letterSpacing: "0.08em" }}>
              HERRAMIENTA DE CAMPO
            </span>
          </div>
          <h1 className="fm-display" style={{ color: "#F4F4F3", fontSize: 22, margin: 0 }}>
            PRESUPUESTO RÁPIDO
          </h1>
        </div>
        <button
          className="fm-btn"
          onClick={() => setShowConfig(true)}
          aria-label="Configurar precios"
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "#2A2E33", border: "1px solid #3A3F45",
            color: "#F4F4F3", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, cursor: "pointer",
          }}
        >
          <Settings size={15} /> Precios
        </button>
      </header>

      <main style={{ padding: "18px 16px 100px", maxWidth: 640, margin: "0 auto" }}>
        {/* Datos del cliente */}
        <section style={{ background: "#FFFFFF", border: "1px solid #DEE0DD", borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <h2 className="fm-display" style={{ fontSize: 13, color: "#1A1D21", margin: "0 0 10px", letterSpacing: "0.02em" }}>
            DATOS DEL CLIENTE
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <input
              className="fm-input" placeholder="Nombre del cliente" value={client.name}
              onChange={(e) => setClient((c) => ({ ...c, name: e.target.value }))}
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="fm-input" placeholder="Teléfono" value={client.phone}
                onChange={(e) => setClient((c) => ({ ...c, phone: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }}
              />
              <input
                className="fm-input" placeholder="Ubicación / obra" value={client.location}
                onChange={(e) => setClient((c) => ({ ...c, location: e.target.value }))}
                style={{ ...inputStyle, flex: 1.4 }}
              />
            </div>
          </div>
        </section>

        {/* Catálogo rápido — tocar un chip agrega la línea */}
        <section style={{ marginBottom: 14 }}>
          <h2 className="fm-display" style={{ fontSize: 13, color: "#1A1D21", margin: "0 0 8px", letterSpacing: "0.02em" }}>
            AGREGAR DEL CATÁLOGO
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {catalog.map((item) => (
              <button
                key={item.id}
                className="fm-btn"
                onClick={() => addLineFromCatalog(item)}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #D5D7D4", background: "#FFFFFF", cursor: "pointer", fontSize: 12.5,
                }}
              >
                <Plus size={13} color="#F5A623" />
                <span style={{ color: "#1A1D21", fontWeight: 500 }}>{item.name}</span>
                <span className="fm-mono" style={{ color: "#9CA1A7" }}>S/{item.price}/{item.unit}</span>
              </button>
            ))}
            <button
              className="fm-btn" onClick={addCustomLine}
              style={{
                display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8,
                border: "1px dashed #B8BBBE", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "#6B7076",
              }}
            >
              <Plus size={13} /> Ítem libre
            </button>
          </div>
        </section>

        {/* Líneas del presupuesto */}
        <section style={{ marginBottom: 14 }}>
          <h2 className="fm-display" style={{ fontSize: 13, color: "#1A1D21", margin: "0 0 8px", letterSpacing: "0.02em" }}>
            DETALLE DEL PRESUPUESTO
          </h2>
          {lineItems.length === 0 ? (
            <p style={{ color: "#9CA1A7", fontSize: 13, padding: "16px 0", textAlign: "center" }}>
              Toca un ítem del catálogo arriba para empezar a armar el presupuesto.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lineItems.map((item) => (
                <div key={item.id} style={{ background: "#FFFFFF", border: "1px solid #DEE0DD", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <input
                      className="fm-input" value={item.description}
                      onChange={(e) => updateLine(item.id, { description: e.target.value })}
                      placeholder="Descripción"
                      style={{ ...inputStyle, flex: 1, padding: "7px 10px", fontSize: 13.5 }}
                    />
                    <button
                      className="fm-btn" onClick={() => removeLine(item.id)} aria-label="Quitar ítem"
                      style={{ border: "none", background: "transparent", cursor: "pointer", padding: 4 }}
                    >
                      <Trash2 size={16} color="#C4453A" />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      className="fm-input" type="number" min="0" step="0.01" value={item.quantity}
                      onChange={(e) => updateLine(item.id, { quantity: e.target.value })}
                      style={{ ...inputStyle, width: 64, padding: "6px 8px", fontSize: 13 }}
                    />
                    <span style={{ fontSize: 12, color: "#9CA1A7" }}>{item.unit}</span>
                    <span style={{ fontSize: 12, color: "#9CA1A7" }}>×</span>
                    <span style={{ fontSize: 12, color: "#9CA1A7" }}>S/</span>
                    <input
                      className="fm-input" type="number" min="0" step="0.01" value={item.unitPrice}
                      onChange={(e) => updateLine(item.id, { unitPrice: e.target.value })}
                      style={{ ...inputStyle, width: 74, padding: "6px 8px", fontSize: 13 }}
                    />
                    <span className="fm-mono" style={{ marginLeft: "auto", fontSize: 13.5, color: "#1A1D21", fontWeight: 600 }}>
                      S/ {computeLineTotal(item).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Margen / utilidad */}
        {lineItems.length > 0 && (
          <section style={{ background: "#FFFFFF", border: "1px solid #DEE0DD", borderRadius: 10, padding: 14, marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 13, color: "#1A1D21", fontWeight: 600 }}>Margen / utilidad</span>
              <span className="fm-mono" style={{ fontSize: 13, color: "#4B5157" }}>{marginPercent}%</span>
            </div>
            <input
              type="range" min="0" max="60" step="1" value={marginPercent}
              onChange={(e) => setMarginPercent(Number(e.target.value))}
              style={{ width: "100%", accentColor: "#F5A623" }}
            />
          </section>
        )}

        {/* Totales */}
        {lineItems.length > 0 && (
          <section style={{ background: "#1A1D21", borderRadius: 10, padding: 16, marginBottom: 4 }}>
            <TotalRow label="Subtotal" value={summary.subtotal} muted />
            {summary.marginAmount > 0 && <TotalRow label={`Margen (${summary.marginPercent}%)`} value={summary.marginAmount} muted />}
            <div style={{ height: 1, background: "#3A3F45", margin: "8px 0" }} />
            <TotalRow label="TOTAL" value={summary.total} big />
          </section>
        )}

        {shareStatus === "shared" && <StatusBanner tone="ok">Presupuesto compartido correctamente.</StatusBanner>}
        {shareStatus === "error" && <StatusBanner tone="error">No se pudo compartir. Intenta descargarlo y enviarlo manualmente.</StatusBanner>}
        {shareStatus === "unsupported" && (
          <StatusBanner tone="info">
            Este dispositivo no soporta compartir directo — se descargó el PDF, adjúntalo manualmente en WhatsApp.
          </StatusBanner>
        )}
      </main>

      {/* Barra de acciones fija abajo */}
      {lineItems.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#FFFFFF", borderTop: "1px solid #DEE0DD", padding: "10px 16px", display: "flex", gap: 10, maxWidth: 640, margin: "0 auto" }}>
          <button
            className="fm-btn" onClick={handleDownload}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 8, border: "1px solid #1A1D21", background: "#FFFFFF", color: "#1A1D21", fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}
          >
            <Download size={16} /> Descargar PDF
          </button>
          <button
            className="fm-btn" onClick={handleShare} disabled={shareStatus === "sharing"}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 8, border: "none", background: "#25D366", color: "#0B3D24", fontSize: 13.5, fontWeight: 600, cursor: "pointer", opacity: shareStatus === "sharing" ? 0.7 : 1 }}
          >
            <Share2 size={16} /> {shareStatus === "sharing" ? "Compartiendo..." : "Compartir"}
          </button>
        </div>
      )}

      {showConfig && (
        <ConfigPanel catalog={catalog} onSave={persistCatalog} onClose={() => setShowConfig(false)} />
      )}
    </div>
  );
}

function TotalRow({ label, value, muted, big }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: big ? "2px 0" : "3px 0" }}>
      <span className={big ? "fm-display" : ""} style={{ color: muted ? "#9CA1A7" : "#F4F4F3", fontSize: big ? 17 : 13 }}>
        {label}
      </span>
      <span className={`fm-mono ${big ? "fm-display" : ""}`} style={{ color: big ? "#F5A623" : "#D5D7D4", fontSize: big ? 19 : 13, fontWeight: big ? 700 : 500 }}>
        S/ {value.toFixed(2)}
      </span>
    </div>
  );
}

function StatusBanner({ tone, children }) {
  const colors = {
    ok: { bg: "#E4F5EA", border: "#B7E3C6", text: "#1E6B3D" },
    error: { bg: "#FBEAE8", border: "#F0BDB6", text: "#A5372B" },
    info: { bg: "#FCEFD6", border: "#F0D9A8", text: "#8A5A0A" },
  }[tone];
  return (
    <div style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text, fontSize: 12.5, padding: "9px 12px", borderRadius: 8, marginTop: 10 }}>
      {children}
    </div>
  );
}

/** Panel de configuración: editar/agregar/quitar precios base, guardado en localStorage. */
function ConfigPanel({ catalog, onSave, onClose }) {
  const [draft, setDraft] = useState(catalog);

  function updateItem(id, patch) {
    setDraft((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }
  function removeItem(id) {
    setDraft((prev) => prev.filter((item) => item.id !== id));
  }
  function addItem() {
    setDraft((prev) => [...prev, { id: `custom_${Date.now()}`, name: "", unit: "und", price: 0 }]);
  }
  function handleSave() {
    onSave(draft.filter((item) => item.name.trim() !== ""));
    onClose();
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,29,33,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}>
      <div style={{ background: "#EDEEEC", width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", borderRadius: "16px 16px 0 0", padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h2 className="fm-display" style={{ fontSize: 16, color: "#1A1D21", margin: 0 }}>PRECIOS BASE</h2>
          <button className="fm-btn" onClick={onClose} aria-label="Cerrar" style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <X size={20} color="#4B5157" />
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: "#6B7076", marginTop: 0, marginBottom: 14 }}>
          Estos precios se guardan en este dispositivo y se usan como catálogo rápido al armar un presupuesto.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {draft.map((item) => (
            <div key={item.id} style={{ display: "flex", gap: 6, alignItems: "center", background: "#FFFFFF", border: "1px solid #DEE0DD", borderRadius: 8, padding: 8 }}>
              <input
                className="fm-input" placeholder="Nombre" value={item.name}
                onChange={(e) => updateItem(item.id, { name: e.target.value })}
                style={{ ...inputStyle, flex: 1, padding: "6px 8px", fontSize: 13 }}
              />
              <input
                className="fm-input" placeholder="und" value={item.unit}
                onChange={(e) => updateItem(item.id, { unit: e.target.value })}
                style={{ ...inputStyle, width: 52, padding: "6px 8px", fontSize: 13 }}
              />
              <span style={{ fontSize: 12, color: "#9CA1A7" }}>S/</span>
              <input
                className="fm-input" type="number" min="0" step="0.01" value={item.price}
                onChange={(e) => updateItem(item.id, { price: e.target.value })}
                style={{ ...inputStyle, width: 68, padding: "6px 8px", fontSize: 13 }}
              />
              <button className="fm-btn" onClick={() => removeItem(item.id)} aria-label="Quitar" style={{ border: "none", background: "transparent", cursor: "pointer", padding: 2 }}>
                <Trash2 size={15} color="#C4453A" />
              </button>
            </div>
          ))}
        </div>

        <button
          className="fm-btn" onClick={addItem}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: "1px dashed #B8BBBE", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "#6B7076", marginBottom: 18 }}
        >
          <Plus size={13} /> Agregar precio
        </button>

        <button
          className="fm-btn" onClick={handleSave}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 8, border: "none", background: "#F5A623", color: "#1A1D21", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
        >
          <Save size={16} /> Guardar precios
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  border: "1px solid #D5D7D4",
  borderRadius: 6,
  padding: "9px 10px",
  fontSize: 14,
  color: "#1A1D21",
  background: "#FFFFFF",
  boxSizing: "border-box",
};
