import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, PlayCircle, Video } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Galería de videos: junta los proyectos de "Trabajos realizados" que tienen
// un video de YouTube cargado (mismo endpoint que Portfolio.jsx). A
// diferencia de un link normal, tocar "reproducir" NO abre YouTube: el video
// se embebe con un <iframe> dentro de la misma tarjeta, así el usuario nunca
// sale de la app.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

// Saca el ID del video de una URL de YouTube (watch?v=, youtu.be/, /embed/)
// para poder mostrar la miniatura oficial antes de reproducirlo.
function extractYoutubeId(url) {
  if (!url) return null;
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

export default function VideoGallery() {
  const { accessToken } = useAuth();
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playingId, setPlayingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/portfolio`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("No se pudo cargar la galería");
      const items = await res.json();
      setVideos(items.filter((item) => item.youtube_embed_url));
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
        <Video size={22} /> Galería de videos
      </h1>
      <p style={{ color: "#9CA1A7", fontSize: 13.5, marginBottom: 16 }}>
        Se reproducen aquí mismo, sin salir de la app.
      </p>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Cargando...</p>
      ) : videos.length === 0 ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Todavía no hay videos publicados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {videos.map((item) => {
            const youtubeId = extractYoutubeId(item.youtube_url);
            const isPlaying = playingId === item.id;

            return (
              <div key={item.id} style={{ background: "#1C2126", border: "1px solid #2A2E33", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ position: "relative", aspectRatio: "16/9", background: "#0D0F11" }}>
                  {isPlaying ? (
                    <iframe
                      src={item.youtube_embed_url}
                      title={item.title}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <button
                      onClick={() => setPlayingId(item.id)}
                      style={{ width: "100%", height: "100%", padding: 0, border: "none", cursor: "pointer", position: "relative", background: "#0D0F11" }}
                    >
                      {youtubeId && (
                        <img
                          src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      )}
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.25)" }}>
                        <PlayCircle size={46} color="#fff" />
                      </div>
                    </button>
                  )}
                </div>
                <div style={{ padding: "10px 14px" }}>
                  <div style={{ color: "#F4F4F3", fontSize: 14, fontWeight: 600 }}>{item.title}</div>
                  {item.description && (
                    <div style={{ color: "#9CA1A7", fontSize: 12.5, marginTop: 2 }}>{item.description}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
