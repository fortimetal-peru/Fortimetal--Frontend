import { useMemo, useState } from "react";
import { Ruler, ArrowRight, AlertCircle, ClipboardList } from "lucide-react";
import { computeRoofTakeoff, computeFenceTakeoff, computeStairTakeoff } from "./lib/materialTakeoff.js";

const STORAGE_KEY_HANDOFF = "fm_takeoff_to_budget"; // leído por BudgetGenerator.jsx al abrir, si existe

const STRUCTURE_TYPES = [
  { id: "galpon", label: "Galpón / Techo" },
  { id: "cerco", label: "Cerco metálico" },
  { id: "escalera", label: "Escalera" },
];

export default function MaterialTakeoffCalculator() {
  const [structureType, setStructureType] = useState("galpon");

  // Galpón / techo
  const [lengthM, setLengthM] = useState("12");
  const [widthM, setWidthM] = useState("6");
  const [roofType, setRoofType] = useState("dos_aguas");
  const [trussSpacingM, setTrussSpacingM] = useState("3");
  const [purlinSpacingM, setPurlinSpacingM] = useState("1.0");
  const [sheetLengthM, setSheetLengthM] = useState("3.66");

  // Cerco
  const [fenceLengthM, setFenceLengthM] = useState("50");
  const [fenceHeightM, setFenceHeightM] = useState("2");
  const [postSpacingM, setPostSpacingM] = useState("2.5");

  // Escalera
  const [riseM, setRiseM] = useState("3.0");
  const [stairWidthM, setStairWidthM] = useState("1.0");

  const [handoffSent, setHandoffSent] = useState(false);

  const result = useMemo(() => {
    try {
      if (structureType === "galpon") {
        return {
          ok: true,
          ...computeRoofTakeoff({
            lengthM: Number(lengthM),
            widthM: Number(widthM),
            roofType,
            trussSpacingM: Number(trussSpacingM),
            purlinSpacingM: Number(purlinSpacingM),
            sheetLengthM: Number(sheetLengthM),
          }),
        };
      }
      if (structureType === "cerco") {
        return {
          ok: true,
          ...computeFenceTakeoff({
            lengthM: Number(fenceLengthM),
            heightM: Number(fenceHeightM),
            postSpacingM: Number(postSpacingM),
          }),
        };
      }
      return {
        ok: true,
        ...computeStairTakeoff({ riseM: Number(riseM), widthM: Number(stairWidthM) }),
      };
    } catch (err) {
      return { ok: false, error: err.message };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureType, lengthM, widthM, roofType, trussSpacingM, purlinSpacingM, sheetLengthM, fenceLengthM, fenceHeightM, postSpacingM, riseM, stairWidthM]);

  function handleSendToBudget() {
    if (!result.ok) return;
    try {
      window.localStorage.setItem(STORAGE_KEY_HANDOFF, JSON.stringify({ items: result.items, createdAt: Date.now() }));
      setHandoffSent(true);
      setTimeout(() => setHandoffSent(false), 3500);
    } catch {
      // localStorage bloqueado: no rompe la app, solo no queda el handoff guardado.
    }
  }

  return (
    <div style={{ background: "#EDEEEC", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
        .fm-mono { font-family: 'IBM Plex Mono', monospace; }
        .fm-input:focus-visible, .fm-btn:focus-visible, .fm-seg:focus-visible { outline: 2px solid #F5A623; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      <header style={{ background: "#1A1D21", padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Ruler size={20} color="#F5A623" strokeWidth={2.5} />
          <span className="fm-mono" style={{ color: "#8B9096", fontSize: 11, letterSpacing: "0.08em" }}>
            DESPIECE AUTOMÁTICO
          </span>
        </div>
        <h1 className="fm-display" style={{ color: "#F4F4F3", fontSize: 22, margin: 0 }}>
          METRADOS
        </h1>
      </header>

      <main style={{ padding: "18px 16px 100px", maxWidth: 640, margin: "0 auto" }}>
        {/* Selector de tipo de estructura */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {STRUCTURE_TYPES.map((t) => (
            <button
              key={t.id}
              className="fm-seg"
              onClick={() => setStructureType(t.id)}
              style={{
                flex: 1,
                padding: "10px 6px",
                borderRadius: 8,
                border: structureType === t.id ? "1px solid #F5A623" : "1px solid #D5D7D4",
                background: structureType === t.id ? "#F5A623" : "#FFFFFF",
                color: structureType === t.id ? "#1A1D21" : "#4B5157",
                fontSize: 12.5,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Formulario según tipo */}
        <section style={{ background: "#FFFFFF", border: "1px solid #DEE0DD", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          {structureType === "galpon" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Field label="Largo (m)" value={lengthM} onChange={setLengthM} />
                <Field label="Ancho / luz (m)" value={widthM} onChange={setWidthM} />
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>Tipo de techo</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {[{ id: "dos_aguas", label: "Dos aguas" }, { id: "una_agua", label: "Una agua" }].map((opt) => (
                    <button
                      key={opt.id}
                      className="fm-seg"
                      onClick={() => setRoofType(opt.id)}
                      style={{
                        flex: 1, padding: "8px 0", borderRadius: 6, fontSize: 12.5, cursor: "pointer",
                        border: roofType === opt.id ? "1px solid #1A1D21" : "1px solid #D5D7D4",
                        background: roofType === opt.id ? "#1A1D21" : "#FFFFFF",
                        color: roofType === opt.id ? "#F4F4F3" : "#4B5157",
                      }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Field label="Separación tijerales (m)" value={trussSpacingM} onChange={setTrussSpacingM} />
                <Field label="Separación correas (m)" value={purlinSpacingM} onChange={setPurlinSpacingM} />
              </div>
              <Field label="Largo de plancha TR-4 (m)" value={sheetLengthM} onChange={setSheetLengthM} full />
            </>
          )}

          {structureType === "cerco" && (
            <>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                <Field label="Largo (m)" value={fenceLengthM} onChange={setFenceLengthM} />
                <Field label="Altura (m)" value={fenceHeightM} onChange={setFenceHeightM} />
              </div>
              <Field label="Separación entre postes (m)" value={postSpacingM} onChange={setPostSpacingM} full />
            </>
          )}

          {structureType === "escalera" && (
            <div style={{ display: "flex", gap: 10 }}>
              <Field label="Desnivel a salvar (m)" value={riseM} onChange={setRiseM} />
              <Field label="Ancho de escalera (m)" value={stairWidthM} onChange={setStairWidthM} />
            </div>
          )}
        </section>

        {/* Resultado */}
        {!result.ok ? (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: "#FBEAE8", border: "1px solid #F0BDB6", borderRadius: 8, padding: 12 }}>
            <AlertCircle size={16} color="#A5372B" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: "#A5372B" }}>{result.error}</span>
          </div>
        ) : (
          <>
            <h2 className="fm-display" style={{ fontSize: 13, color: "#1A1D21", margin: "0 0 8px", letterSpacing: "0.02em" }}>
              LISTA DE MATERIALES
            </h2>
            <div style={{ background: "#1A1D21", borderRadius: 10, overflow: "hidden", marginBottom: 12 }}>
              {result.items.map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "12px 16px", borderBottom: i < result.items.length - 1 ? "1px solid #2A2E33" : "none",
                  }}
                >
                  <span style={{ color: "#D5D7D4", fontSize: 13.5 }}>{item.description}</span>
                  <span className="fm-mono" style={{ color: "#F5A623", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap", marginLeft: 12 }}>
                    {item.quantity} {item.unit}
                  </span>
                </div>
              ))}
            </div>

            <button
              className="fm-btn"
              onClick={handleSendToBudget}
              style={{
                width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "13px 0", borderRadius: 8, border: "none", background: "#F5A623", color: "#1A1D21",
                fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              <ClipboardList size={16} /> Enviar al cotizador de campo <ArrowRight size={16} />
            </button>
            {handoffSent && (
              <p style={{ textAlign: "center", fontSize: 12.5, color: "#1E6B3D", marginTop: 8 }}>
                Lista enviada — ábrela en el Cotizador de Campo para ponerle precio y generar el PDF.
              </p>
            )}

            <p style={{ fontSize: 11.5, color: "#9CA1A7", marginTop: 14, lineHeight: 1.5 }}>
              Estimación referencial de campo basada en supuestos constructivos típicos (traslapes,
              rendimientos de pintura y soldadura, merma de corte). No reemplaza un metrado detallado
              ni el cálculo estructural de un ingeniero colegiado.
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function Field({ label, value, onChange, full }) {
  return (
    <div style={{ flex: full ? "1 1 100%" : 1 }}>
      <label style={labelStyle}>{label}</label>
      <input
        className="fm-input"
        type="number"
        min="0"
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%", border: "1px solid #D5D7D4", borderRadius: 6, padding: "9px 10px",
          fontSize: 14, color: "#1A1D21", background: "#FFFFFF", boxSizing: "border-box",
        }}
      />
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: 11.5,
  color: "#6B7076",
  fontWeight: 600,
  marginBottom: 4,
  textTransform: "uppercase",
  letterSpacing: "0.02em",
};
