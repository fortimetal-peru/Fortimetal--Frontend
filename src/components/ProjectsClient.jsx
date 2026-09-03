import { useCallback, useEffect, useState } from "react";
import { FolderKanban, X, Image as ImageIcon, Bell, ChevronRight, MapPin, Calendar } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_LABELS = { planning: "Planificación", in_progress: "En ejecución", on_hold: "Pausado", completed: "Finalizado", cancelled: "Cancelado" };
const STATUS_COLORS = {
  planning: { bg: "#F0F1EE", fg: "#4B5157" },
  in_progress: { bg: "#FFF4E0", fg: "#B8720A" },
  on_hold: { bg: "#FDECEA", fg: "#B3261E" },
  completed: { bg: "#E7F6E9", fg: "#237A3D" },
  cancelled: { bg: "#FDECEA", fg: "#B3261E" },
};

export default function ProjectsClient() {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/projects`, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error("No se pudo cargar tus proyectos");
      setProjects(await res.json());
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
      <h1 className="fm-display" style={{ fontSize: 22, color: "#1A1A1A", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FolderKanban size={22} /> Mis proyectos
      </h1>
      <p style={{ color: "#4B5157", fontSize: 13.5, marginBottom: 16 }}>Sigue el avance de tus proyectos con FORTIMETAL.</p>

      {error && <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Cargando...</p>
      ) : projects.length === 0 ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Todavía no tienes proyectos asignados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => {
            const colors = STATUS_COLORS[p.status];
            return (
              <button key={p.id} onClick={() => setOpenId(p.id)} style={row}>
                <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{p.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span style={{ background: colors.bg, color: colors.fg, fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>{STATUS_LABELS[p.status]}</span>
                    <span style={{ fontSize: 11.5, color: "#9CA1A7" }}>{p.progress_percent}% avance</span>
                  </div>
                  <div style={{ marginTop: 6, height: 5, background: "#EDEEEC", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: `${p.progress_percent}%`, height: "100%", background: "#F5A623" }} />
                  </div>
                </div>
                <ChevronRight size={16} color="#B8BCB9" />
              </button>
            );
          })}
        </div>
      )}

      {openId && <ProjectDetailModal projectId={openId} accessToken={accessToken} onClose={() => setOpenId(null)} />}
    </div>
  );
}

function ProjectDetailModal({ projectId, accessToken, onClose }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("gallery");

  useEffect(() => {
    fetch(`${API_BASE}/projects/${projectId}`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setDetail);
  }, [projectId, accessToken]);

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#EDEEEC", width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", borderRadius: "16px 16px 0 0", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
          <div>
            <strong style={{ fontSize: 15 }}>{detail?.name || "Cargando..."}</strong>
            {detail?.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9CA1A7", marginTop: 2 }}>
                <MapPin size={12} /> {detail.location}
              </div>
            )}
          </div>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>

        {detail?.description && <p style={{ fontSize: 13, color: "#4B5157", marginBottom: 12 }}>{detail.description}</p>}

        {(detail?.start_date || detail?.estimated_end_date) && (
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "#9CA1A7", marginBottom: 12 }}>
            <Calendar size={12} />
            {detail.start_date && `Inicio: ${detail.start_date}`}
            {detail.start_date && detail.estimated_end_date && " · "}
            {detail.estimated_end_date && `Fin estimado: ${detail.estimated_end_date}`}
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <TabButton active={tab === "gallery"} onClick={() => setTab("gallery")} icon={ImageIcon} label={`Fotos (${detail?.images?.length || 0})`} />
          <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")} icon={Bell} label={`Avisos (${detail?.notifications?.length || 0})`} />
        </div>

        {tab === "gallery" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {detail?.images?.length ? (
              detail.images.map((img) => (
                <img key={img.id} src={`${MEDIA_BASE}${img.image_url}`} alt={img.caption || ""} style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }} />
              ))
            ) : (
              <p style={{ fontSize: 12.5, color: "#9CA1A7" }}>Todavía no hay fotos de este proyecto.</p>
            )}
          </div>
        )}

        {tab === "notifications" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {detail?.notifications?.length ? (
              detail.notifications.map((n) => (
                <div key={n.id} style={{ background: "#fff", border: "1px solid #E5E6E3", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: "#4B5157" }}>{n.message}</div>
                </div>
              ))
            ) : (
              <p style={{ fontSize: 12.5, color: "#9CA1A7" }}>Todavía no hay avisos de avance.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8,
        border: active ? "1px solid #F5A623" : "1px solid #D8D9D6",
        background: active ? "#F5A623" : "#fff", color: active ? "#1A1A1A" : "#4B5157",
        fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

const row = { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #E5E6E3", borderRadius: 10, padding: "12px 12px", cursor: "pointer", width: "100%", textAlign: "left" };
const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#4B5157", cursor: "pointer", padding: 6 };
