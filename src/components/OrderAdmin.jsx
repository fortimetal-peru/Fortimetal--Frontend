import { useCallback, useEffect, useState } from "react";
import { ClipboardList, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Panel de administración de pedidos. Reutiliza GET /orders y PATCH
// /orders/{id} — primera interfaz que los usa. Los pedidos hoy solo se pueden
// crear vía API (todavía no hay pantalla para que un cliente arme un pedido
// desde la app — eso quedó pausado a propósito), así que esta lista puede
// verse vacía hasta que ese flujo se construya. Igual sirve para revisar y
// cambiar el estado de cualquier pedido que exista.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

const STATUS_LABELS = { pending: "Pendiente", confirmed: "Confirmado", delivered: "Entregado", cancelled: "Cancelado" };
const STATUS_COLORS = {
  pending: { bg: "#FFF4E0", fg: "#B8720A" },
  confirmed: { bg: "#E6F0FF", fg: "#1D5FCC" },
  delivered: { bg: "#E7F6E9", fg: "#237A3D" },
  cancelled: { bg: "#FDECEA", fg: "#B3261E" },
};

export default function OrderAdmin() {
  const { accessToken } = useAuth();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState({}); // id -> user
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oRes, uRes] = await Promise.all([
        fetch(`${API_BASE}/orders`, { headers: authHeaders }),
        fetch(`${API_BASE}/users`, { headers: authHeaders }),
      ]);
      if (!oRes.ok || !uRes.ok) throw new Error("No se pudo cargar los pedidos");
      setOrders(await oRes.json());
      const users = await uRes.json();
      setClients(Object.fromEntries(users.map((u) => [u.id, u])));
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

  async function changeStatus(orderId, status) {
    setUpdatingId(orderId);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}`, {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el estado del pedido");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 640, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
      `}</style>
      <h1 className="fm-display" style={{ fontSize: 22, color: "#1A1A1A", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
        <ClipboardList size={22} /> Pedidos
      </h1>
      <p style={{ color: "#4B5157", fontSize: 13.5, marginBottom: 16 }}>
        Solicitudes de materiales hechas por tus clientes. Cambia el estado a medida que las procesas
        — esto no descuenta stock solo; ajústalo desde "Materiales" cuando entregues de verdad.
      </p>

      {error && (
        <div style={{ background: "#FDECEA", color: "#B3261E", padding: "10px 14px", borderRadius: 8, fontSize: 13.5, marginBottom: 14 }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Cargando...</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "#4B5157", fontSize: 13.5 }}>Todavía no hay pedidos.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {orders.map((o) => {
            const client = clients[o.client_id];
            const total = o.items.reduce((sum, it) => sum + (Number(it.subtotal) || 0), 0);
            const colors = STATUS_COLORS[o.status];
            return (
              <div key={o.id} style={card}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "#1A1A1A" }}>{client?.full_name || "Cliente"}</div>
                    <div style={{ fontSize: 11.5, color: "#9CA1A7" }}>{client?.email}</div>
                  </div>
                  <span style={{ background: colors.bg, color: colors.fg, fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }}>
                    {STATUS_LABELS[o.status]}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  {o.items.map((it) => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#4B5157" }}>
                      <span>{it.quantity} {it.material.unit} — {it.material.name}</span>
                      {it.subtotal != null && <span>S/ {Number(it.subtotal).toFixed(2)}</span>}
                    </div>
                  ))}
                </div>

                {o.notes && (
                  <p style={{ fontSize: 12.5, color: "#6B7076", fontStyle: "italic", marginBottom: 8 }}>"{o.notes}"</p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid #EDEEEC", paddingTop: 8 }}>
                  <strong style={{ fontSize: 13.5 }}>Total: S/ {total.toFixed(2)}</strong>
                  <div style={{ position: "relative" }}>
                    <select
                      value={o.status}
                      disabled={updatingId === o.id}
                      onChange={(e) => changeStatus(o.id, e.target.value)}
                      style={selectStyle}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                    <ChevronDown size={13} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#9CA1A7" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const card = { background: "#fff", border: "1px solid #E5E6E3", borderRadius: 12, padding: 14 };
const selectStyle = {
  appearance: "none", padding: "6px 26px 6px 10px", fontSize: 12.5, border: "1px solid #D8D9D6",
  borderRadius: 8, background: "#fff", fontFamily: "inherit", cursor: "pointer",
};
