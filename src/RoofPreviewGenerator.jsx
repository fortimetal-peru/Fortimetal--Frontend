import { useCallback, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw, Send, WifiOff, ImageOff, Sparkles } from "lucide-react";

// ---------------------------------------------------------------------------
// CONEXIÓN CON EL BACKEND
// El endpoint /api/render-preview es la función serverless (Vercel) que arma el
// prompt oculto y llama a Gemini 2.5 Flash Image. Cambia esta constante si lo
// despliegas en otra ruta.
// ---------------------------------------------------------------------------
const RENDER_ENDPOINT = "/api/render-preview";

// Backend FastAPI: donde vive el cotizador público (POST /public/{slug}/quotes...).
// En desarrollo, Vite hace proxy de /api/v1 a localhost:8000 (ver vite.config.js).
// En producción, define VITE_API_BASE_URL con la URL real del backend desplegado.
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

// Mismas claves que maneja MaterialTakeoffCalculator.jsx — ajusta si difieren.
const ROOF_TYPES = [
  { id: "galpon", label: "Galpón / techo a dos aguas" },
  { id: "cerco", label: "Cerco perimétrico" },
  { id: "escalera", label: "Escalera metálica" },
];

const COVERAGES = [
  { id: "calamina_galvanizada", label: "Calamina galvanizada" },
  { id: "calamina_trapezoidal_tr4", label: "Calamina trapezoidal TR4" },
  { id: "policarbonato", label: "Policarbonato" },
  { id: "teja_andina", label: "Teja andina" },
];

const COLORS = [
  { id: "rojo", label: "Rojo", hex: "#B33B2E" },
  { id: "verde", label: "Verde", hex: "#3B6B4A" },
  { id: "azul", label: "Azul", hex: "#33556E" },
  { id: "gris galvanizado", label: "Gris galvanizado", hex: "#9AA0A6" },
  { id: "natural", label: "Natural / traslúcido", hex: "#D8CFC0" },
];

// Comprime la foto en el navegador antes de subirla nada — clave en obra, donde
// una foto de 8-12MB con señal débil se traba o falla directamente.
async function compressImage(file, maxDimension = 1600, quality = 0.75) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  return {
    base64: dataUrl.split(",")[1],
    mimeType: "image/jpeg",
    previewUrl: dataUrl,
    sizeKB: Math.round(blob.size / 1024),
  };
}

// Estados posibles del flujo, para que la UI sea explícita en vez de adivinar
// a partir de banderas sueltas.
const STATUS = {
  IDLE: "idle",
  COMPRESSING: "compressing",
  GENERATING: "generating",
  DONE: "done",
  OFFLINE_ERROR: "offline_error",
  SERVER_ERROR: "server_error",
};

// `companySlug` y `quoteId` los recibes del cotizador público justo después de que
// el visitante envía su formulario (POST /public/{slug}/quotes ya devuelve el `id`
// del lead). Si no los pasas, el componente sigue funcionando pero solo muestra la
// pre-visualización sin guardarla en el backend para el panel del admin.
export default function RoofPreviewGenerator({ companySlug = null, quoteId = null }) {
  const fileInputRef = useRef(null);

  const [photo, setPhoto] = useState(null); // { base64, mimeType, previewUrl, sizeKB }
  const [roofType, setRoofType] = useState(ROOF_TYPES[0].id);
  const [coverage, setCoverage] = useState(COVERAGES[0].id);
  const [color, setColor] = useState(COLORS[0].id);
  const [status, setStatus] = useState(STATUS.IDLE);
  const [resultUrl, setResultUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleFileSelected = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus(STATUS.COMPRESSING);
    setResultUrl(null);
    setErrorMessage(null);

    try {
      const compressed = await compressImage(file);
      setPhoto(compressed);
      setStatus(STATUS.IDLE);
    } catch (err) {
      console.error("Error comprimiendo la foto:", err);
      setStatus(STATUS.IDLE);
      setErrorMessage("No se pudo procesar la foto. Intenta con otra imagen.");
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!photo) return;

    // Corte temprano si el dispositivo ya sabe que no hay red — evita esperar
    // el timeout del fetch cuando es evidente que no va a conectar.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setStatus(STATUS.OFFLINE_ERROR);
      return;
    }

    setStatus(STATUS.GENERATING);
    setErrorMessage(null);

    try {
      const response = await fetch(RENDER_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photo.base64,
          mimeType: photo.mimeType,
          roofType: ROOF_TYPES.find((r) => r.id === roofType)?.label || roofType,
          coverage,
          color: COLORS.find((c) => c.id === color)?.label || color,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || "El servidor no pudo generar la pre-visualización");
      }

      const data = await response.json();
      setResultUrl(`data:${data.mimeType};base64,${data.imageBase64}`);
      setStatus(STATUS.DONE);

      // Guarda la imagen en el backend, junto al lead, para que el admin la vea
      // desde el panel. Si esto falla (ej. se cayó la señal justo después de
      // generar la imagen), no es crítico: el visitante igual ve su preview.
      if (companySlug && quoteId) {
        try {
          await fetch(`${API_BASE}/public/${companySlug}/quotes/${quoteId}/preview-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_base64: data.imageBase64, mime_type: data.mimeType }),
          });
        } catch (persistErr) {
          console.error("La imagen se generó pero no se pudo guardar en el backend:", persistErr);
        }
      }
    } catch (err) {
      console.error("Error generando la pre-visualización:", err);
      // Sin conexión real (no solo navigator.onLine) el fetch también falla con
      // TypeError "Failed to fetch" — lo tratamos igual como error de red.
      const isNetworkError = err instanceof TypeError || err.message?.includes("fetch");
      setStatus(isNetworkError ? STATUS.OFFLINE_ERROR : STATUS.SERVER_ERROR);
      if (!isNetworkError) setErrorMessage(err.message);
    }
  }, [photo, roofType, coverage, color]);

  const handleReset = useCallback(() => {
    setPhoto(null);
    setResultUrl(null);
    setStatus(STATUS.IDLE);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const isBusy = status === STATUS.COMPRESSING || status === STATUS.GENERATING;

  return (
    <div style={{ background: "#14171A", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
        .fm-mono { font-family: 'IBM Plex Mono', monospace; }
        .fm-card { clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%); }
        .fm-chip:focus-visible, .fm-btn:focus-visible, .fm-input:focus-visible {
          outline: 2px solid #F5A623; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* Header tipo placa de acero, igual al de SupplierDirectory */}
      <header style={{ background: "#1A1D21", padding: "28px 20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <Sparkles size={22} color="#F5A623" strokeWidth={2.5} />
          <span className="fm-mono" style={{ color: "#8B9096", fontSize: 12, letterSpacing: "0.08em" }}>
            PRE-VISUALIZACIÓN CON IA
          </span>
        </div>
        <h1 className="fm-display" style={{ color: "#F4F4F3", fontSize: 24, margin: 0, letterSpacing: "-0.01em" }}>
          Así se vería tu proyecto
        </h1>
        <p style={{ color: "#8B9096", fontSize: 13, marginTop: 6, marginBottom: 0 }}>
          Sube una foto del lugar y elige las opciones. Es una referencia orientativa, no un
          render final.
        </p>
      </header>

      <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 18, maxWidth: 520, margin: "0 auto" }}>
        {/* Paso 1: foto */}
        <section className="fm-card" style={{ background: "#1C2126", padding: 18, border: "1px solid #2A2E33" }}>
          <h2 className="fm-display" style={{ fontSize: 15, color: "#1A1D21", margin: "0 0 10px" }}>
            1. Foto del lugar
          </h2>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelected}
            style={{ display: "none" }}
            id="roof-photo-input"
          />

          {!photo ? (
            <label
              htmlFor="roof-photo-input"
              className="fm-btn"
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                border: "1px dashed #8B9096", borderRadius: 4, padding: "22px 12px",
                cursor: "pointer", color: "#9CA1A7", fontSize: 13.5,
              }}
            >
              <Camera size={18} />
              {status === STATUS.COMPRESSING ? "Procesando foto..." : "Tomar o elegir una foto"}
            </label>
          ) : (
            <div style={{ position: "relative" }}>
              <img
                src={photo.previewUrl}
                alt="Foto del lugar"
                style={{ width: "100%", borderRadius: 4, display: "block" }}
              />
              <p className="fm-mono" style={{ fontSize: 11, color: "#8B9096", marginTop: 6, marginBottom: 0 }}>
                {photo.sizeKB} KB — comprimida para envío
              </p>
              <button
                className="fm-btn"
                onClick={handleReset}
                style={{
                  position: "absolute", top: 8, right: 8, background: "#1A1A1A", color: "#F4F4F3",
                  border: "none", borderRadius: 4, padding: "6px 10px", fontSize: 12, cursor: "pointer",
                }}
              >
                Cambiar foto
              </button>
            </div>
          )}
        </section>

        {/* Paso 2: opciones */}
        <section className="fm-card" style={{ background: "#1C2126", padding: 18, border: "1px solid #2A2E33" }}>
          <h2 className="fm-display" style={{ fontSize: 15, color: "#1A1D21", margin: "0 0 12px" }}>
            2. Elige las opciones
          </h2>

          <OptionGroup label="Tipo de estructura" options={ROOF_TYPES} value={roofType} onChange={setRoofType} />
          <OptionGroup label="Cobertura" options={COVERAGES} value={coverage} onChange={setCoverage} />

          <p className="fm-mono" style={{ fontSize: 11.5, color: "#8B9096", margin: "12px 0 8px", letterSpacing: "0.04em" }}>
            COLOR
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <button
                key={c.id}
                className="fm-chip"
                onClick={() => setColor(c.id)}
                title={c.label}
                style={{
                  width: 34, height: 34, borderRadius: "50%", background: c.hex, cursor: "pointer",
                  border: color === c.id ? "3px solid #F5A623" : "1px solid #2A2E33",
                }}
              />
            ))}
          </div>
        </section>

        {/* Paso 3: generar */}
        <button
          className="fm-btn"
          onClick={handleGenerate}
          disabled={!photo || isBusy}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: !photo || isBusy ? "#2A2E33" : "#F5A623",
            color: !photo || isBusy ? "#8B9096" : "#1A1A1A",
            border: "none", borderRadius: 4, padding: "14px 16px",
            fontSize: 14.5, fontWeight: 600, cursor: !photo || isBusy ? "not-allowed" : "pointer",
          }}
        >
          {status === STATUS.GENERATING ? (
            <>
              <Loader2 size={18} className="fm-spin" style={{ animation: "spin 1s linear infinite" }} />
              Generando pre-visualización... (~15s)
            </>
          ) : (
            <>
              <Send size={18} />
              Generar pre-visualización
            </>
          )}
        </button>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        {/* Estados de error */}
        {status === STATUS.OFFLINE_ERROR && (
          <ErrorBanner
            icon={<WifiOff size={18} color="#1A1A1A" />}
            title="Sin señal"
            message="Esta función necesita internet. El resto de la cotización sigue funcionando sin problema — intenta generar la imagen cuando tengas cobertura."
            onRetry={handleGenerate}
          />
        )}
        {status === STATUS.SERVER_ERROR && (
          <ErrorBanner
            icon={<ImageOff size={18} color="#1A1A1A" />}
            title="No se pudo generar"
            message={errorMessage || "Ocurrió un problema generando la imagen. Intenta de nuevo."}
            onRetry={handleGenerate}
          />
        )}

        {/* Resultado */}
        {status === STATUS.DONE && resultUrl && (
          <section className="fm-card" style={{ background: "#1C2126", padding: 18, border: "1px solid #2A2E33" }}>
            <h2 className="fm-display" style={{ fontSize: 15, color: "#1A1D21", margin: "0 0 10px" }}>
              Pre-visualización
            </h2>
            <img src={resultUrl} alt="Pre-visualización generada" style={{ width: "100%", borderRadius: 4, display: "block" }} />
            <p style={{ fontSize: 12, color: "#8B9096", marginTop: 8, fontStyle: "italic" }}>
              Referencia orientativa — el acabado final puede variar respecto a esta imagen.
            </p>
            <button
              className="fm-btn"
              onClick={handleGenerate}
              style={{
                marginTop: 10, display: "flex", alignItems: "center", gap: 6,
                background: "transparent", border: "1px solid #8B9096", borderRadius: 4,
                padding: "8px 12px", fontSize: 13, color: "#9CA1A7", cursor: "pointer",
              }}
            >
              <RefreshCw size={14} /> Generar otra variante
            </button>
          </section>
        )}
      </div>
    </div>
  );
}

function OptionGroup({ label, options, value, onChange }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p className="fm-mono" style={{ fontSize: 11.5, color: "#8B9096", margin: "0 0 8px", letterSpacing: "0.04em" }}>
        {label.toUpperCase()}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            className="fm-chip"
            onClick={() => onChange(opt.id)}
            style={{
              padding: "8px 12px", borderRadius: 4, fontSize: 12.5, cursor: "pointer",
              border: value === opt.id ? "1px solid #F5A623" : "1px solid #2A2E33",
              background: value === opt.id ? "#F5A623" : "#FFFFFF",
              color: value === opt.id ? "#1A1A1A" : "#4B5157",
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ErrorBanner({ icon, title, message, onRetry }) {
  return (
    <div
      style={{
        display: "flex", gap: 10, alignItems: "flex-start", background: "#FDECEA",
        border: "1px solid #E8A79E", borderRadius: 4, padding: 14,
      }}
    >
      <div style={{ marginTop: 2 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <p className="fm-display" style={{ fontSize: 13.5, color: "#F4F4F3", margin: 0 }}>{title}</p>
        <p style={{ fontSize: 12.5, color: "#9CA1A7", margin: "4px 0 8px" }}>{message}</p>
        <button
          onClick={onRetry}
          style={{
            background: "none", border: "none", color: "#B33B2E", fontSize: 12.5,
            fontWeight: 600, cursor: "pointer", padding: 0,
          }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
