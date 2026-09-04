import { useCallback, useEffect, useState } from "react";
import { Briefcase, X, ChevronLeft, ChevronRight, PlayCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Galería de trabajos realizados, visible para cualquier usuario logueado de
// la empresa (client o admin). Toca una tarjeta para abrir el detalle con
// carrusel de fotos y el video de YouTube embebido, si tiene.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function Portfolio() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openItem, setOpenItem] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("No se pudo cargar el portafolio");
      setItems(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) load();
  }, [accessToken, load]);

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
      `}</style>
      <h1 className="fm-display" style={{ fontSize: 22, color: "#F4F4F3", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Briefcase size={22} /> Trabajos realizados
      </h1>
      <p style={{ color: "#9CA1A7", fontSize: 13.5, marginBottom: 16 }}>
        Algunos de los proyectos que hemos entregado.
      </p>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Cargando...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Todavía no hay trabajos publicados.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setOpenItem(item)}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 12, overflow: "hidden", border: "1px solid #2A2E33", padding: 0, cursor: "pointer", background: "#14171A" }}
            >
              {item.photo_urls?.[0] && (
                <img src={`${MEDIA_BASE}${item.photo_urls[0]}`} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              )}
              {item.youtube_url && (
                <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.55)", borderRadius: "50%", width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <PlayCircle size={16} color="#fff" />
                </div>
              )}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "18px 10px 8px", textAlign: "left" }}>
                <div style={{ color: "#fff", fontSize: 12.5, fontWeight: 600, lineHeight: 1.25 }}>{item.title}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {openItem && <PortfolioDetailModal item={openItem} onClose={() => setOpenItem(null)} />}
    </div>
  );
}

function PortfolioDetailModal({ item, onClose }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const photos = item.photo_urls || [];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C2126", borderRadius: 16, maxWidth: 480, width: "100%", maxHeight: "90vh", overflowY: "auto" }}>
        {photos.length > 0 && (
          <div style={{ position: "relative", aspectRatio: "4/3", background: "#1A1A1A" }}>
            <img src={`${MEDIA_BASE}${photos[photoIndex]}`} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            {photos.length > 1 && (
              <>
                <NavButton side="left" onClick={() => setPhotoIndex((i) => (i - 1 + photos.length) % photos.length)} />
                <NavButton side="right" onClick={() => setPhotoIndex((i) => (i + 1) % photos.length)} />
                <div style={{ position: "absolute", bottom: 8, left: 0, right: 0, textAlign: "center", color: "#fff", fontSize: 11.5 }}>
                  {photoIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <h2 className="fm-display" style={{ fontSize: 18, color: "#F4F4F3", margin: 0 }}>{item.title}</h2>
            <button onClick={onClose} style={{ background: "none", border: "none", color: "#9CA1A7", cursor: "pointer", padding: 4, flexShrink: 0 }}>
              <X size={20} />
            </button>
          </div>
          {item.description && (
            <p style={{ color: "#9CA1A7", fontSize: 13.5, marginTop: 8, lineHeight: 1.5 }}>{item.description}</p>
          )}

          {item.youtube_embed_url && (
            <div style={{ marginTop: 14, borderRadius: 10, overflow: "hidden", aspectRatio: "16/9" }}>
              <iframe
                src={item.youtube_embed_url}
                title={item.title}
                style={{ width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NavButton({ side, onClick }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      onClick={onClick}
      style={{
        position: "absolute", top: "50%", [side]: 8, transform: "translateY(-50%)",
        background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 32, height: 32,
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer",
      }}
    >
      <Icon size={18} />
    </button>
  );
}
