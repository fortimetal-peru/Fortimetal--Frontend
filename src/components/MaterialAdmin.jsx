import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Package, Image as ImageIcon, Loader2, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Panel de administración de materiales. Reutiliza los endpoints que ya
// existían en el backend (GET/POST/PATCH/DELETE /materials, POST
// /materials/{id}/adjust-stock) — primera interfaz que los usa.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";

const CATEGORY_LABELS = { viga: "Viga", perfil: "Perfil", tubo: "Tubo", plancha: "Plancha", angulo: "Ángulo", otro: "Otro" };
const UNIT_LABELS = { m: "metro (m)", kg: "kilogramo (kg)", unidad: "unidad", ton: "tonelada (ton)" };

const EMPTY_FORM = { name: "", category: "otro", description: "", unit: "unidad", stock_quantity: "0", unit_price: "", image_url: "" };

export default function MaterialAdmin() {
  const { accessToken } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [stockPanelId, setStockPanelId] = useState(null); // material con el mini-panel de ajuste abierto
  const fileInputRef = useRef(null);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };
  const jsonHeaders = { ...authHeaders, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/materials?only_active=false`, { headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo cargar los materiales");
      setMaterials(await res.json());
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

  function openEditForm(m) {
    setEditingId(m.id);
    setForm({
      name: m.name || "", category: m.category, description: m.description || "",
      unit: m.unit, stock_quantity: String(m.stock_quantity), unit_price: m.unit_price != null ? String(m.unit_price) : "",
      image_url: m.image_url || "",
    });
    setShowForm(true);
  }

  async function handlePhotoSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`${API_BASE}/uploads/image?category=materials`, { method: "POST", headers: authHeaders, body });
      if (!res.ok) throw new Error("No se pudo subir la foto");
      const { url } = await res.json();
      setForm((f) => ({ ...f, image_url: url }));
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
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
        category: form.category,
        description: form.description.trim() || null,
        unit: form.unit,
        stock_quantity: Number(form.stock_quantity) || 0,
        unit_price: form.unit_price !== "" ? Number(form.unit_price) : null,
        image_url: form.image_url || null,
      };
      const res = editingId
        ? await fetch(`${API_BASE}/materials/${editingId}`, { method: "PATCH", headers: jsonHeaders, body: JSON.stringify(payload) })
        : await fetch(`${API_BASE}/materials`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo guardar el material");
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

  async function handleDeactivate(m) {
    if (!confirm(`¿Descontinuar "${m.name}"? Ya no aparecerá disponible.`)) return;
    try {
      const res = await fetch(`${API_BASE}/materials/${m.id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo descontinuar el material");
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
        <Package size={22} /> Materiales
      </h1>
      <p style={{ color: "#4B5157", fontSize: 13.5, marginBottom: 16 }}>
        Carga tu catálogo de materiales y ajusta el stock cuando entra o sale mercadería.
      </p>

      <button onClick={openNewForm} style={btnPrimary}>
        <Plus size={16} /> Nuevo material
      </button>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, margin: "14px 0" }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{editingId ? "Editar material" : "Nuevo material"}</strong>
            <button type="button" onClick={() => setShowForm(false)} style={iconBtn}><X size={16} /></button>
          </div>

          <Field label="Nombre *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} placeholder="Ej. Tubo estructural 2x2 pulg" />
          </Field>
          <Field label="Descripción">
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ ...input, minHeight: 50, resize: "vertical" }} />
          </Field>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Categoría" style={{ flex: 1 }}>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={input}>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Unidad" style={{ flex: 1 }}>
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} style={input}>
                {Object.entries(UNIT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Field label={editingId ? "Stock actual" : "Stock inicial"} style={{ flex: 1 }}>
              <input type="number" step="0.01" min="0" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} style={input} disabled={!!editingId} />
            </Field>
            <Field label="Precio unitario (S/)" style={{ flex: 1 }}>
              <input type="number" step="0.01" min="0" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} style={input} placeholder="Opcional" />
            </Field>
          </div>
          {editingId && (
            <p style={{ fontSize: 11.5, color: "#9CA1A7", marginTop: -4, marginBottom: 10 }}>
              El stock se ajusta desde el botón ↑↓ en la lista, no editándolo aquí directamente.
            </p>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={labelStyle}>Foto</label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              {form.image_url && (
                <img src={`${MEDIA_BASE}${form.image_url}`} alt="" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, border: "1px solid #D8D9D6" }} />
              )}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto} style={btnSecondary}>
                {uploadingPhoto ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} /> : <ImageIcon size={15} />}
                {form.image_url ? "Cambiar foto" : "Subir foto"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhotoSelected} style={{ display: "none" }} />
            </div>
          </div>

          <button type="submit" disabled={saving} style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 6 }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear material"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Cargando...</p>
      ) : materials.length === 0 ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Todavía no hay materiales.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {materials.map((m) => (
            <div key={m.id} style={{ ...row, opacity: m.is_active ? 1 : 0.5 }}>
              {m.image_url ? (
                <img src={`${MEDIA_BASE}${m.image_url}`} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 44, height: 44, borderRadius: 8, background: "#EDEEEC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Package size={18} color="#9CA1A7" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: "#9CA1A7" }}>
                  {CATEGORY_LABELS[m.category]} · stock: {m.stock_quantity} {m.unit}
                  {m.unit_price != null ? ` · S/ ${m.unit_price}` : ""}
                  {!m.is_active ? " · descontinuado" : ""}
                </div>
              </div>
              <button onClick={() => setStockPanelId(stockPanelId === m.id ? null : m.id)} style={iconBtn} title="Ajustar stock">
                <ArrowUpCircle size={16} />
              </button>
              <button onClick={() => openEditForm(m)} style={iconBtn} title="Editar"><Pencil size={16} /></button>
              {m.is_active && (
                <button onClick={() => handleDeactivate(m)} style={{ ...iconBtn, color: "#B3261E" }} title="Descontinuar"><Trash2 size={16} /></button>
              )}
            </div>
          ))}
        </div>
      )}

      {stockPanelId && (
        <StockAdjustPanel
          material={materials.find((m) => m.id === stockPanelId)}
          accessToken={accessToken}
          onClose={() => setStockPanelId(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function StockAdjustPanel({ material, accessToken, onClose, onSaved }) {
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function submit(sign) {
    const value = Number(delta);
    if (!value || value <= 0) {
      setError("Ingresa una cantidad mayor a 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ""}/api/v1/materials/${material.id}/adjust-stock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ delta: value * sign, reason: reason.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo ajustar el stock");
      }
      setDelta("");
      setReason("");
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0", padding: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <strong style={{ fontSize: 14 }}>Ajustar stock — {material?.name}</strong>
          <button onClick={onClose} style={iconBtn}><X size={16} /></button>
        </div>
        <p style={{ fontSize: 12, color: "#9CA1A7", marginBottom: 12 }}>Stock actual: {material?.stock_quantity} {material?.unit}</p>

        {error && <div style={{ background: "#FDECEA", color: "#B3261E", padding: "8px 12px", borderRadius: 8, fontSize: 12.5, marginBottom: 10 }}>{error}</div>}

        <input type="number" step="0.01" min="0" value={delta} onChange={(e) => setDelta(e.target.value)} style={{ ...input, marginBottom: 8 }} placeholder="Cantidad" />
        <input value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...input, marginBottom: 12 }} placeholder="Motivo (opcional, ej. Compra a proveedor)" />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => submit(1)} disabled={saving} style={{ ...btnPrimary, flex: 1, justifyContent: "center" }}>
            <ArrowUpCircle size={15} /> Sumar (entrada)
          </button>
          <button onClick={() => submit(-1)} disabled={saving} style={{ ...btnSecondary, flex: 1, justifyContent: "center", color: "#B3261E", borderColor: "#F3C6C2" }}>
            <ArrowDownCircle size={15} /> Restar (salida)
          </button>
        </div>
      </div>
    </div>
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

const input = { width: "100%", padding: "9px 11px", fontSize: 13.5, border: "1px solid #D8D9D6", borderRadius: 8, boxSizing: "border-box", fontFamily: "inherit" };
const formCard = { background: "#fff", border: "1px solid #E5E6E3", borderRadius: 12, padding: 16, margin: "14px 0" };
const row = { display: "flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #E5E6E3", borderRadius: 10, padding: "10px 12px" };
const btnPrimary = { display: "flex", alignItems: "center", gap: 6, background: "#F5A623", color: "#1A1A1A", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
const btnSecondary = { ...btnPrimary, background: "#fff", border: "1px solid #D8D9D6", color: "#1A1A1A" };
const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#4B5157", cursor: "pointer", padding: 6 };
const labelStyle = { display: "block", fontSize: 11.5, color: "#6B7076", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" };
