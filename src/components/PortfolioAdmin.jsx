import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Image as ImageIcon, Youtube, Briefcase, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Panel para que el admin de la empresa suba trabajos terminados (fotos + un
// video opcional de YouTube) para que sus clientes los vean en /portafolio.
// Las fotos se suben una por una a POST /uploads/image (categoría "portfolio")
// y se guardan como URLs relativas — el archivo real vive en el disco del
// backend (Railway Volume), no en el navegador.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const EMPTY_FORM = { title: "", description: "", photo_urls: [], youtube_url: "" };

export default function PortfolioAdmin() {
  const { accessToken } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const fileInputRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/portfolio?only_active=false`, { headers: authHeaders });
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

  function openNewForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item.id);
    setForm({
      title: item.title || "",
      description: item.description || "",
      photo_urls: item.photo_urls || [],
      youtube_url: item.youtube_url || "",
    });
    setShowForm(true);
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo después
    if (!file) return;

    setUploadingPhoto(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_BASE}/uploads/image?category=portfolio`, {
        method: "POST",
        headers: authHeaders, // sin Content-Type: el navegador arma el multipart/form-data solo
        body,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "No se pudo subir la foto");
      }
      const { url } = await res.json();
      setForm((f) => ({ ...f, photo_urls: [...f.photo_urls, url] }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  function removePhoto(url) {
    setForm((f) => ({ ...f, photo_urls: f.photo_urls.filter((u) => u !== url) }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        photo_urls: form.photo_urls,
        youtube_url: form.youtube_url.trim() || null,
      };
      const res = editingId
        ? await fetch(`${API_BASE}/portfolio/${editingId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) })
        : await fetch(`${API_BASE}/portfolio`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // El validador de YouTube devuelve un 422 con detail en formato de lista de Pydantic
        const detail = Array.isArray(body.detail) ? body.detail[0]?.msg : body.detail;
        throw new Error(detail || "No se pudo guardar el trabajo");
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

  async function handleDeactivate(item) {
    if (!confirm(`¿Quitar "${item.title}" del portafolio? Los clientes ya no lo verán.`)) return;
    try {
      const res = await fetch(`${API_BASE}/portfolio/${item.id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo quitar el trabajo");
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
      <h1 className="fm-display" style={{ fontSize: 22, color: "#1A1A1A", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <Briefcase size={22} /> Portafolio de trabajos
      </h1>
      <p style={{ color: "#4B5157", fontSize: 13.5, marginBottom: 16 }}>
        Sube fotos de trabajos terminados y, si quieres, un video de YouTube. Tus clientes
        lo ven al entrar a "Trabajos" en la app — no es público en internet.
      </p>

      <button onClick={openNewForm} style={btnPrimary}>
        <Plus size={16} /> Nuevo trabajo
      </button>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, margin: "14px 0" }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{editingId ? "Editar trabajo" : "Nuevo trabajo"}</strong>
            <button type="button" onClick={() => setShowForm(false)} style={iconBtn}>
              <X size={16} />
            </button>
          </div>

          <Field label="Título *">
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={input} placeholder="Ej. Galpón industrial - Huancayo" />
          </Field>
          <Field label="Descripción">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, minHeight: 60, resize: "vertical" }} placeholder="Ej. Galpón de 500m2 para almacén, techo a dos aguas." />
          </Field>

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Fotos</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {form.photo_urls.map((url) => (
                <div key={url} style={{ position: "relative", width: 64, height: 64 }}>
                  <img src={`${import.meta.env.VITE_API_BASE_URL || ""}${url}`} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: "1px solid #D8D9D6" }} />
                  <button type="button" onClick={() => removePhoto(url)} style={removePhotoBtn} aria-label="Quitar foto">
                    <X size={11} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                style={addPhotoBtn}
              >
                {uploadingPhoto ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <ImageIcon size={18} />}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelected} style={{ display: "none" }} />
            </div>
          </div>

          <Field label="Video de YouTube (opcional)">
            <div style={{ position: "relative" }}>
              <Youtube size={15} style={{ position: "absolute", left: 10, top: 11, color: "#9CA1A7" }} />
              <input
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                style={{ ...input, paddingLeft: 32 }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          </Field>

          <button type="submit" disabled={saving} style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 6 }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Publicar trabajo"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Cargando...</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Todavía no hay trabajos publicados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item) => (
            <div key={item.id} style={{ ...row, opacity: item.is_active ? 1 : 0.5 }}>
              {item.photo_urls?.[0] ? (
                <img src={`${import.meta.env.VITE_API_BASE_URL || ""}${item.photo_urls[0]}`} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "#EDEEEC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <ImageIcon size={18} color="#9CA1A7" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{item.title}</div>
                <div style={{ fontSize: 11.5, color: "#9CA1A7" }}>
                  {item.photo_urls?.length || 0} foto(s){item.youtube_url ? " · con video" : ""}
                  {!item.is_active ? " · oculto" : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEditForm(item)} style={iconBtn} title="Editar">
                  <Pencil size={16} />
                </button>
                {item.is_active && (
                  <button onClick={() => handleDeactivate(item)} style={{ ...iconBtn, color: "#B3261E" }} title="Quitar">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 4 }}>{children}</div>
    </div>
  );
}

const input = {
  width: "100%",
  padding: "9px 11px",
  fontSize: 13.5,
  border: "1px solid #D8D9D6",
  borderRadius: 8,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const formCard = { background: "#fff", border: "1px solid #E5E6E3", borderRadius: 12, padding: 16, margin: "14px 0" };
const row = { display: "flex", alignItems: "center", gap: 10, background: "#fff", border: "1px solid #E5E6E3", borderRadius: 10, padding: "10px 12px" };
const btnPrimary = { display: "flex", alignItems: "center", gap: 6, background: "#F5A623", color: "#1A1A1A", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#4B5157", cursor: "pointer", padding: 6 };
const addPhotoBtn = { width: 64, height: 64, borderRadius: 8, border: "1px dashed #D8D9D6", background: "#FAFAF9", display: "flex", alignItems: "center", justifyContent: "center", color: "#9CA1A7", cursor: "pointer" };
const removePhotoBtn = { position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#B3261E", color: "#fff", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 };
const labelStyle = { display: "block", fontSize: 11.5, color: "#6B7076", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" };
