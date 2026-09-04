import { useCallback, useEffect, useState } from "react";
import { Package, X, Plus, Minus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Catálogo de materiales para el cliente, con carrito simple y envío real del
// pedido a POST /orders (el admin lo revisa y confirma desde /admin/pedidos).
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";
const CATEGORY_LABELS = { viga: "Viga", perfil: "Perfil", tubo: "Tubo", plancha: "Plancha", angulo: "Ángulo", otro: "Otro" };

export default function MaterialsCatalog() {
  const { accessToken } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState({}); // material_id -> cantidad
  const [showCart, setShowCart] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/materials`, { headers: { Authorization: `Bearer ${accessToken}` } });
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

  function setQuantity(materialId, quantity) {
    setCart((c) => {
      const next = { ...c };
      if (quantity <= 0) delete next[materialId];
      else next[materialId] = quantity;
      return next;
    });
  }

  const cartCount = Object.keys(cart).length;

  async function submitOrder() {
    setSubmitting(true);
    setError(null);
    try {
      const items = Object.entries(cart).map(([material_id, quantity]) => ({ material_id, quantity }));
      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items, notes: notes.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo enviar el pedido");
      }
      setSubmitted(true);
      setCart({});
      setNotes("");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <CheckCircle2 size={48} color="#3AA65C" style={{ marginBottom: 12 }} />
        <h2 style={{ fontSize: 17, color: "#F4F4F3", marginBottom: 6 }}>¡Pedido enviado!</h2>
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Te contactaremos para confirmar disponibilidad y precio.</p>
        <button onClick={() => setSubmitted(false)} style={{ ...btnPrimary, marginTop: 16 }}>Ver materiales de nuevo</button>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto", paddingBottom: 90 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <h1 className="fm-display" style={{ fontSize: 22, color: "#F4F4F3", display: "flex", alignItems: "center", gap: 8 }}>
          <Package size={22} /> Materiales
        </h1>
        {cartCount > 0 && (
          <button onClick={() => setShowCart(true)} style={{ ...btnPrimary, padding: "8px 12px" }}>
            <ShoppingCart size={15} /> {cartCount}
          </button>
        )}
      </div>
      <p style={{ color: "#9CA1A7", fontSize: 13.5, marginBottom: 16 }}>Arma tu pedido y lo confirmamos contigo.</p>

      {error && <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>{error}</div>}

      {loading ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Cargando...</p>
      ) : materials.length === 0 ? (
        <p style={{ color: "#9CA1A7", fontSize: 13.5 }}>Todavía no hay materiales publicados.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {materials.map((m) => (
            <div key={m.id} style={row}>
              {m.image_url ? (
                <img src={`${MEDIA_BASE}${m.image_url}`} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, background: "#14171A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Package size={18} color="#9CA1A7" />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#F4F4F3" }}>{m.name}</div>
                <div style={{ fontSize: 11.5, color: "#9CA1A7" }}>
                  {CATEGORY_LABELS[m.category]}{m.unit_price != null ? ` · S/ ${m.unit_price} / ${m.unit}` : ` · ${m.unit}`}
                </div>
              </div>
              <QuantityStepper value={cart[m.id] || 0} onChange={(q) => setQuantity(m.id, q)} />
            </div>
          ))}
        </div>
      )}

      {showCart && (
        <div onClick={() => setShowCart(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#1C2126", width: "100%", maxWidth: 480, borderRadius: "16px 16px 0 0", padding: 18, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <strong style={{ fontSize: 15 }}>Tu pedido</strong>
              <button onClick={() => setShowCart(false)} style={iconBtn}><X size={18} /></button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {Object.entries(cart).map(([materialId, qty]) => {
                const m = materials.find((x) => x.id === materialId);
                if (!m) return null;
                return (
                  <div key={materialId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13.5 }}>
                    <span>{m.name}</span>
                    <QuantityStepper value={qty} onChange={(q) => setQuantity(materialId, q)} />
                  </div>
                );
              })}
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comentario (opcional, ej. para cuándo lo necesitas)" style={{ width: "100%", padding: 10, fontSize: 13.5, border: "1px solid #2A2E33", borderRadius: 8, minHeight: 56, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 12 }} />
            <button onClick={submitOrder} disabled={submitting} style={{ ...btnPrimary, width: "100%", justifyContent: "center" }}>
              {submitting ? "Enviando..." : "Enviar pedido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuantityStepper({ value, onChange }) {
  if (value === 0) {
    return (
      <button onClick={() => onChange(1)} style={{ ...btnPrimary, padding: "6px 10px" }}>
        <Plus size={14} /> Pedir
      </button>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <button onClick={() => onChange(value - 1)} style={stepBtn}><Minus size={13} /></button>
      <span style={{ minWidth: 20, textAlign: "center", fontSize: 13.5, fontWeight: 600 }}>{value}</span>
      <button onClick={() => onChange(value + 1)} style={stepBtn}><Plus size={13} /></button>
    </div>
  );
}

const row = { display: "flex", alignItems: "center", gap: 10, background: "#1C2126", border: "1px solid #2A2E33", borderRadius: 10, padding: "10px 12px" };
const btnPrimary = { display: "flex", alignItems: "center", gap: 6, background: "#F5A623", color: "#1A1A1A", border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer" };
const iconBtn = { display: "flex", alignItems: "center", justifyContent: "center", background: "none", border: "none", color: "#9CA1A7", cursor: "pointer", padding: 6 };
const stepBtn = { width: 26, height: 26, borderRadius: "50%", border: "1px solid #2A2E33", background: "#1C2126", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 };
