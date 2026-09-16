import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Galería de imágenes: junta todas las fotos de "Trabajos realizados" (mismo
// endpoint que Portfolio.jsx) en una sola cuadrícula, sin agrupar por
// proyecto. Tocar una foto la abre a pantalla completa con flechas para
// pasar a la siguiente.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function ImageGallery() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openIndex, setOpenIndex] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("No se pudo cargar la galería");
      const items = await res.json();
      const flat = items.flatMap((item) =>
        (item.photo_urls || []).map((url) => ({ url, title: item.title }))
      );
      setPhotos(flat);
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
      <button
        onClick={() => navigate(-1)}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#9CA1A7", fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 10 }}
      >
        <ChevronLeft size={16} /> Volver
      </button>

      <h1 className="fm-display" style={{ fontSize: 22, color: "#F4F4F3", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Images size={22} /> Galería de imágenes
      </h1>
      <p style={{ color: "#9CA1A7", fontSize: 13.5, marginBottom: 16 }}>
        Fotos de proyectos entregados.
      </p>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Cargando...</p>
      ) : photos.length === 0 ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Todavía no hay fotos publicadas.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          {photos.map((photo, i) => (
            <button
              key={i}
              onClick={() => setOpenIndex(i)}
              style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", border: "1px solid #2A2E33", padding: 0, cursor: "pointer", background: "#14171A" }}
            >
              <img src={`${MEDIA_BASE}${photo.url}`} alt={photo.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}

      {openIndex !== null && (
        <ImageLightbox
          photos={photos}
          index={openIndex}
          onIndexChange={setOpenIndex}
          onClose={() => setOpenIndex(null)}
        />
      )}
    </div>
  );
}

function ImageLightbox({ photos, index, onIndexChange, onClose }) {
  const photo = photos[index];

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", zIndex: 50, display: "flex", flexDirection: "column" }}
    >
      <button
        onClick={onClose}
        style={{ position: "absolute", top: 14, right: 14, zIndex: 2, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}
      >
        <X size={18} />
      </button>

      <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", padding: 16 }}>
        <img src={`${MEDIA_BASE}${photo.url}`} alt={photo.title} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />

        {photos.length > 1 && (
          <>
            <NavButton side="left" onClick={() => onIndexChange((index - 1 + photos.length) % photos.length)} />
            <NavButton side="right" onClick={() => onIndexChange((index + 1) % photos.length)} />
          </>
        )}
      </div>

      <div style={{ textAlign: "center", color: "#fff", fontSize: 12.5, paddingBottom: 18 }}>
        {photo.title} · {index + 1} / {photos.length}
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
        position: "absolute", top: "50%", [side]: 4, transform: "translateY(-50%)",
        background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 36, height: 36,
        display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer",
      }}
    >
      <Icon size={20} />
    </button>
  );
}
