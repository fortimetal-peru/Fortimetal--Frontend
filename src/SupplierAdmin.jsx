import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Upload, PackageSearch } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Panel simple para que el admin de la empresa cargue/edite sus proveedores
// sin tener que usar /docs (Swagger). Habla directo con los mismos endpoints
// que ya prueba SupplierDirectory.jsx: GET/POST/PATCH/DELETE /suppliers y
// POST /suppliers/import (carga masiva).
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

const EMPTY_FORM = { name: "", address: "", phone: "", whatsapp: "", categories: "", notes: "" };

// Mismos proveedores de ejemplo que trae el backend en proveedores.example.json —
// se usan para el botón "Cargar ejemplos", así el admin ve la pantalla poblada
// de un clic en vez de tener que escribir cada proveedor a mano solo para probar.
const EXAMPLE_SUPPLIERS = [
  { name: "Ferretería El Constructor", address: "Av. Huancavelica 456, Huancayo", phone: "51964000001", whatsapp: "51964000001", categories: ["Pernos", "Herramientas", "Tornillería"], notes: "Abierto de lunes a sábado, 8am - 7pm." },
  { name: "Aceros Central SAC", address: "Jr. Ancash 890, Huancayo", phone: "51964000002", whatsapp: "51964000002", categories: ["Aceros", "Vigas", "Perfiles", "Planchas"], notes: "Distribuidor mayorista, mejores precios por tonelada." },
  { name: "Pinturas ColorMax", address: "Av. Ferrocarril 210, Huancayo", phone: "51964000003", categories: ["Pintura", "Anticorrosivos", "Solventes"], notes: "Tienen pintura anticorrosiva para estructuras metálicas." },
  { name: "Soldimport E.I.R.L.", address: "Calle Real 1200, Huancayo", phone: "51964000004", whatsapp: "51964000004", categories: ["Soldadura", "Electrodos", "Equipos de soldar"], notes: "Venden y alquilan equipos de soldadura MIG/SMAW." },
  { name: "Tuberías y Conexiones del Centro", address: "Av. Mariscal Castilla 340, Huancayo", phone: "51964000005", categories: ["Tubos", "Conexiones", "Planchas"], notes: null },
  { name: "Ferretería Industrial Los Andes", address: "Jr. Cusco 567, Huancayo", phone: "51964000006", whatsapp: "51964000006", categories: ["Pernos", "Aceros", "Herramientas", "Pintura"], notes: "Catálogo amplio, buena opción para compras urgentes." },
];

function supplierToForm(s) {
  return {
    name: s.name || "",
    address: s.address || "",
    phone: s.phone || "",
    whatsapp: s.whatsapp || "",
    categories: (s.categories || []).join(", "),
    notes: s.notes || "",
  };
}

function formToPayload(form) {
  return {
    name: form.name.trim(),
    address: form.address.trim() || null,
    phone: form.phone.trim() || null,
    whatsapp: form.whatsapp.trim() || null,
    categories: form.categories.split(",").map((c) => c.trim()).filter(Boolean),
    notes: form.notes.trim() || null,
  };
}

export default function SupplierAdmin() {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const authHeaders = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/suppliers`, { headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo cargar la lista de proveedores");
      setSuppliers(await res.json());
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

  function openEditForm(supplier) {
    setEditingId(supplier.id);
    setForm(supplierToForm(supplier));
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
      const payload = formToPayload(form);
      const res = editingId
        ? await fetch(`${API_BASE}/suppliers/${editingId}`, { method: "PATCH", headers: authHeaders, body: JSON.stringify(payload) })
        : await fetch(`${API_BASE}/suppliers`, { method: "POST", headers: authHeaders, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo guardar el proveedor");
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

  async function handleDeactivate(supplier) {
    if (!confirm(`¿Desactivar "${supplier.name}"? Ya no aparecerá en el buscador de proveedores.`)) return;
    try {
      const res = await fetch(`${API_BASE}/suppliers/${supplier.id}`, { method: "DELETE", headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo desactivar el proveedor");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleImportExamples() {
    if (!confirm(`Esto agrega ${EXAMPLE_SUPPLIERS.length} proveedores de ejemplo a tu lista. ¿Continuar?`)) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/suppliers/import`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ suppliers: EXAMPLE_SUPPLIERS }),
      });
      if (!res.ok) throw new Error("No se pudo importar la lista de ejemplo");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="fm-display" style={{ fontSize: 22, color: "#F4F4F3", display: "flex", alignItems: "center", gap: 8 }}>
          <PackageSearch size={22} /> Proveedores
        </h1>
      </div>
      <p style={{ color: "#9CA1A7", fontSize: 13.5, marginBottom: 16 }}>
        Aquí puedes agregar, editar o quitar los proveedores que aparecen en el buscador
        de la app, sin necesidad de tocar código.
      </p>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={openNewForm} style={btnPrimary}>
          <Plus size={16} /> Nuevo proveedor
        </button>
        {suppliers.length === 0 && !loading && (
          <button onClick={handleImportExamples} disabled={saving} style={btnSecondary}>
            <Upload size={16} /> Cargar 6 proveedores de ejemplo
          </button>
        )}
      </div>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} style={formCard}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>{editingId ? "Editar proveedor" : "Nuevo proveedor"}</strong>
            <button type="button" onClick={() => setShowForm(false)} style={iconBtn}>
              <X size={16} />
            </button>
          </div>

          <Field label="Nombre *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={input} placeholder="Ej. Ferretería El Constructor" />
          </Field>
          <Field label="Dirección">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} style={input} placeholder="Ej. Av. Huancavelica 456, Huancayo" />
          </Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Teléfono" style={{ flex: 1 }}>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={input} placeholder="51987654321" />
            </Field>
            <Field label="WhatsApp" style={{ flex: 1 }}>
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} style={input} placeholder="51987654321" />
            </Field>
          </div>
          <Field label="Categorías (separadas por coma)">
            <input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} style={input} placeholder="Pernos, Herramientas, Aceros" />
          </Field>
          <Field label="Notas">
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ ...input, minHeight: 60, resize: "vertical" }} placeholder="Ej. Abierto de lunes a sábado, 8am - 7pm." />
          </Field>

          <button type="submit" disabled={saving} style={{ ...btnPrimary, width: "100%", justifyContent: "center", marginTop: 6 }}>
            {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear proveedor"}
          </button>
        </form>
      )}

      {loading ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Cargando...</p>
      ) : suppliers.length === 0 ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Todavía no hay proveedores cargados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {suppliers.map((s) => (
            <div key={s.id} style={row}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#F4F4F3" }}>{s.name}</div>
                {s.address && <div style={{ fontSize: 12.5, color: "#9CA1A7" }}>{s.address}</div>}
                {s.categories?.length > 0 && (
                  <div style={{ fontSize: 11.5, color: "#F5A623", marginTop: 3 }}>{s.categories.join(" · ")}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => openEditForm(s)} style={iconBtn} title="Editar">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDeactivate(s)} style={{ ...iconBtn, color: "#B3261E" }} title="Desactivar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({ label, children, style }) {
  return (
    <label style={{ display: "block", marginBottom: 10, fontSize: 12.5, color: "#9CA1A7", ...style }}>
      {label}
      <div style={{ marginTop: 4 }}>{children}</div>
    </label>
  );
}

const input = {
  width: "100%",
  padding: "9px 11px",
  fontSize: 13.5,
  border: "1px solid #2A2E33",
  borderRadius: 8,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const formCard = {
  background: "#1C2126",
  border: "1px solid #2A2E33",
  borderRadius: 12,
  padding: 16,
  marginBottom: 18,
};

const row = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#1C2126",
  border: "1px solid #2A2E33",
  borderRadius: 10,
  padding: "10px 12px",
};

const btnPrimary = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "#F5A623",
  color: "#F4F4F3",
  border: "none",
  borderRadius: 8,
  padding: "9px 14px",
  fontSize: 13.5,
  fontWeight: 600,
  cursor: "pointer",
};

const btnSecondary = {
  ...btnPrimary,
  background: "#1C2126",
  border: "1px solid #2A2E33",
  color: "#F4F4F3",
};

const iconBtn = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "none",
  border: "none",
  color: "#9CA1A7",
  cursor: "pointer",
  padding: 6,
};
