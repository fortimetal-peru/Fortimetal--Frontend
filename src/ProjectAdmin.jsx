import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Bell, FolderKanban, Loader2, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Panel de administración de proyectos. Reutiliza los mismos endpoints que ya
// existían en el backend desde el inicio (GET/POST/PATCH/DELETE /projects,
// POST /projects/{id}/images, POST /projects/{id}/notifications) — esta es la
// primera interfaz que los usa; antes solo existían en la API.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";

const STATUS_LABELS = {
  planning: "Planificación",
  in_progress: "En ejecución",
  on_hold: "Pausado",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

const EMPTY_FORM = {
  name: "", description: "", location: "", status: "planning", progress_percent: 0,
  start_date: "", estimated_end_date: "", client_id: "",
};

export default function ProjectAdmin() {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailProject, setDetailProject] = useState(null); // proyecto abierto para galería/notificaciones

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/projects`, { headers: authHeaders }),
        fetch(`${API_BASE}/users`, { headers: authHeaders }),
      ]);
      if (!pRes.ok || !uRes.ok) throw new Error("No se pudo cargar la información");
      setProjects(await pRes.json());
      const users = await uRes.json();
      setClients(users.filter((u) => u.role === "client"));
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

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || "", description: p.description || "", location: p.location || "",
      status: p.status, progress_percent: p.progress_percent,
      start_date: p.start_date || "", estimated_end_date: p.estimated_end_date || "",
      client_id: p.client_id || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        location: form.location.trim() || null,
        status: form.status,
        progress_percent: Number(form.progress_percent) || 0,
        start_date: form.start_date || null,
        estimated_end_date: form.estimated_end_date || null,
        client_id: form.client_id || null,
      };
      const res = editingId
        ? await fetch(`${API_BASE}/projects/${editingId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) })
        : await fetch(`${API_BASE}/projects`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo guardar el proyecto");
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`¿Eliminar el proyecto "${p.name}"? Esto no se puede deshacer.`)) return;
    try {
      const res = await fetch(`${API_BASE}/projects/${p.id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo eliminar el proyecto");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
      <h1 className="fm-display" style={{ fontSize: 22, color: "#F4F4F3", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <FolderKanban size={22} /> Proyectos
      </h1>
      <p style={{ color: "#9CA1A7", fontSize: 13.5, marginBottom: 16 }}>
        Crea proyectos, asígnalos a un cliente, y súbeles fotos y notificaciones de avance.
      </p>

      <button onClick={openNewForm} style={btnPrimary}>
        <Plus size={16} /> Nuevo proyecto
      </button>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, margin: "14px 0" }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{editingId ? "Editar proyecto" : "Nuevo proyecto"}</strong>
            <button type="button" onClick={() => setShowForm(false)} style={iconBtn}><X size={16} /></button>
          </div>

          <Field label="Nombre *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} placeholder="Ej. Galpón industrial - Av. Ferrocarril" />
          </Field>
          <Field label="Descripción">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, minHeight: 56, resize: "vertical" }} />
          </Field>
          <Field label="Ubicación">
            <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={input} placeholder="Ej. Huancayo, Junín" />
          </Field>

          <Field label="Cliente asignado">
            <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} style={input}>
              <option value="">Sin asignar</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
              ))}
            </select>
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Estado" style={{ flex: 1 }}>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} style={input}>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>
            <Field label="Avance (%)" style={{ width: 100 }}>
              <input type="number" min="0" max="100" value={form.progress_percent} onChange={(e) => setForm({ ...form, progress_percent: e.target.value })} style={input} />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Fecha de inicio" style={{ flex: 1 }}>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} style={input} />
            </Field>
            <Field label="Fin estimado" style={{ flex: 1 }}>
              <input type="date" value={form.estimated_end_date} onChange={(e) => setForm({ ...form, estimated_end_date: e.target.value })} style={input} />
            </Field>
          </div>

          <button type="submit" disabled={saving} style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 6 }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear proyecto"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Cargando...</p>
      ) : projects.length === 0 ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Todavía no hay proyectos.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {projects.map((p) => (
            <div key={p.id} style={row}>
              <button onClick={() => setDetailProject(p)} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", textAlign: "left", cursor: "pointer", padding: 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: "#F4F4F3" }}>{p.name}</div>
                  <div style={{ fontSize: 11.5, color: "#9CA1A7" }}>
                    {STATUS_LABELS[p.status]} · {p.progress_percent}% avance
                    {p.client_id ? " · asignado" : " · sin cliente"}
                  </div>
                </div>
                <ChevronRight size={16} color="#B8BCB9" />
              </button>
              <button onClick={() => openEditForm(p)} style={iconBtn} title="Editar"><Pencil size={16} /></button>
              <button onClick={() => handleDelete(p)} style={{ ...iconBtn, color: "#B3261E" }} title="Eliminar"><Trash2 size={16} /></button>
            </div>
          ))}
        </div>
      )}

      {detailProject && (
        <ProjectDetailPanel
          projectId={detailProject.id}
          projectName={detailProject.name}
          accessToken={accessToken}
          onClose={() => setDetailProject(null)}
        />
      )}
    </div>
  );
}

function ProjectDetailPanel({ projectId, projectName, accessToken, onClose }) {
  const [detail, setDetail] = useState(null);
  const [tab, setTab] = useState("gallery"); // "gallery" | "notifications"
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const load = useCallback(async () => {
    const res = await fetch(`${API_BASE}/projects/${projectId}`, { headers: authHeaders });
    if (res.ok) setDetail(await res.json());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, accessToken]);

  useEffect(() => { load(); }, [load]);

  async function handleUploadPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const upRes = await fetch(`${API_BASE}/uploads/image?category=projects`, { method: "POST", headers: authHeaders, body });
      if (!upRes.ok) throw new Error("No se pudo subir la foto");
      const { url } = await upRes.json();

      const params = new URLSearchParams({ image_url: url });
      const imgRes = await fetch(`${API_BASE}/projects/${projectId}/images?${params}`, { method: "POST", headers: authHeaders });
      if (!imgRes.ok) throw new Error("No se pudo agregar la foto al proyecto");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handlePostNotification(e) {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setError("Título y mensaje son obligatorios");
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/notifications`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ title: notifTitle.trim(), message: notifMessage.trim() }),
      });
      if (!res.ok) throw new Error("No se pudo publicar la notificación");
      setNotifTitle("");
      setNotifMessage("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#14171A", width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", borderRadius: "16px 16px 0 0", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <strong style={{ fontSize: 15 }}>{projectName}</strong>
          <button onClick={onClose} style={iconBtn}><X size={18} /></button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <TabButton active={tab === "gallery"} onClick={() => setTab("gallery")} icon={ImageIcon} label="Galería" />
          <TabButton active={tab === "notifications"} onClick={() => setTab("notifications")} icon={Bell} label="Notificaciones" />
        </div>

        {error && <div style={{ background: "#FDECEA", color: "#B3261E", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 12 }}>{error}</div>}

        {tab === "gallery" && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {detail?.images?.map((img) => (
              <img key={img.id} src={`${MEDIA_BASE}${img.image_url}`} alt="" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #2A2E33" }} />
            ))}
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={addPhotoBtn}>
              {uploading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <ImageIcon size={18} />}
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUploadPhoto} style={{ display: "none" }} />
          </div>
        )}

        {tab === "notifications" && (
          <div>
            <form onSubmit={handlePostNotification} style={{ background: "#1C2126", border: "1px solid #2A2E33", borderRadius: 10, padding: 12, marginBottom: 12 }}>
              <input value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} style={{ ...input, marginBottom: 8 }} placeholder="Título (ej. Avance de estructura)" />
              <textarea value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} style={{ ...input, minHeight: 56, resize: "vertical", marginBottom: 8 }} placeholder="Mensaje para el cliente..." />
              <button type="submit" disabled={posting} style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>
                {posting ? "Publicando..." : "Publicar notificación"}
              </button>
            </form>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {detail?.notifications?.map((n) => (
                <div key={n.id} style={{ background: "#1C2126", border: "1px solid #2A2E33", borderRadius: 10, padding: 10 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>
                  <div style={{ fontSize: 12.5, color: "#9CA1A7" }}>{n.message}</div>
                </div>
              ))}
            </div>
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
        border: active ? "1px solid #F5A623" : "1px solid #2A2E33",
        background: active ? "#F5A623" : "#1C2126", color: active ? "#1A1A1A" : "#9CA1A7",
        fontSize: 12.5, fontWeight: 600, cursor: "pointer",
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

function Field({ label, children, style }) {
  return (
    <div style={{ marginBottom: 10, ...style }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

const input = { width: "100%", padding: "9px 11px", fontSize: 13.5, border: "1px solid #2A2E33", borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" };
const formCard = { background: "#1C2126", border: "1px solid #2A2E33", borderRadius: 12, padding: 16, margin: "14px 0" };
const row = { display: "flex", alignItems: "center", gap: 6, background: "#1C2126", border: "1px solid #2A2E33", borderRadius: 10, padding: "10px 12px" };
const btnPrimary = { display: "flex", alignItems: "center", gap: 6, background: "#F5A623", color: "#1A1A1A", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#9CA1A7", cursor: "pointer", padding: 6 };
const addPhotoBtn = { width: 84, height: 84, borderRadius: 8, border: "1px dashed #2A2E33", background: "#14171A", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA1A7", cursor: "pointer" };
const labelStyle = { display: "block", fontSize: 11.5, color: "#6B7076", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" };
