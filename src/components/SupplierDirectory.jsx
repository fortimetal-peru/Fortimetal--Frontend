import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, Phone, MessageCircle, MapPin, X, PackageSearch } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// CONEXIÓN CON EL BACKEND
// En desarrollo, Vite hace proxy de /api/v1 a localhost:8000 (ver vite.config.js).
// En producción, define VITE_API_BASE_URL con la URL real del backend desplegado
// (repo separado). El token de sesión ahora viene del AuthContext (login con
// Google) en vez del placeholder window.__FORTIMETAL_TOKEN__ que había antes.
// ---------------------------------------------------------------------------
const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

// Datos de ejemplo — se usan solo si el backend no responde (por ejemplo, en esta
// vista previa sin servidor). En producción, con el backend corriendo, esto no se usa.
const DEMO_SUPPLIERS = [
  { id: "1", name: "Ferretería El Constructor", address: "Av. Huancavelica 456, Huancayo", phone: "51964000001", whatsapp: "51964000001", categories: ["Pernos", "Herramientas", "Tornillería"], tel_link: "tel:+51964000001", whatsapp_link: "https://wa.me/51964000001", notes: "Abierto de lunes a sábado, 8am - 7pm." },
  { id: "2", name: "Aceros Central SAC", address: "Jr. Ancash 890, Huancayo", phone: "51964000002", whatsapp: "51964000002", categories: ["Aceros", "Vigas", "Perfiles", "Planchas"], tel_link: "tel:+51964000002", whatsapp_link: "https://wa.me/51964000002", notes: "Distribuidor mayorista, mejores precios por tonelada." },
  { id: "3", name: "Pinturas ColorMax", address: "Av. Ferrocarril 210, Huancayo", phone: "51964000003", whatsapp: null, categories: ["Pintura", "Anticorrosivos", "Solventes"], tel_link: "tel:+51964000003", whatsapp_link: null, notes: "Tienen pintura anticorrosiva para estructuras metálicas." },
  { id: "4", name: "Soldimport E.I.R.L.", address: "Calle Real 1200, Huancayo", phone: "51964000004", whatsapp: "51964000004", categories: ["Soldadura", "Electrodos"], tel_link: "tel:+51964000004", whatsapp_link: "https://wa.me/51964000004", notes: "Venden y alquilan equipos de soldadura." },
  { id: "5", name: "Tuberías y Conexiones del Centro", address: "Av. Mariscal Castilla 340, Huancayo", phone: "51964000005", whatsapp: null, categories: ["Tubos", "Conexiones", "Planchas"], tel_link: "tel:+51964000005", whatsapp_link: null, notes: null },
];

export default function SupplierDirectory() {
  const { accessToken } = useAuth();
  const [suppliers, setSuppliers] = useState(DEMO_SUPPLIERS);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [usingDemoData, setUsingDemoData] = useState(false);

  const fetchSuppliers = useCallback(async (q, category) => {
    if (!accessToken) {
      setUsingDemoData(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);

      const [suppliersRes, categoriesRes] = await Promise.all([
        fetch(`${API_BASE}/suppliers?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch(`${API_BASE}/suppliers/categories`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      ]);
      if (!suppliersRes.ok || !categoriesRes.ok) throw new Error("Respuesta no válida del servidor");

      setSuppliers(await suppliersRes.json());
      setCategories(await categoriesRes.json());
      setUsingDemoData(false);
    } catch {
      // Sin backend disponible (o token ausente): se mantiene la vista con datos de ejemplo.
      setSuppliers(DEMO_SUPPLIERS);
      setUsingDemoData(true);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchSuppliers(query, activeCategory), 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, activeCategory]);

  const demoCategories = useMemo(
    () => [...new Set(DEMO_SUPPLIERS.flatMap((s) => s.categories))].sort(),
    []
  );
  const visibleCategories = usingDemoData ? demoCategories : categories;

  return (
    <div style={{ background: "#EDEEEC", minHeight: "100%", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
        .fm-mono { font-family: 'IBM Plex Mono', monospace; }
        .fm-scrollbar::-webkit-scrollbar { height: 0px; }
        .fm-card { clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%); }
        .fm-chip:focus-visible, .fm-btn:focus-visible, .fm-input:focus-visible {
          outline: 2px solid #F5A623; outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
      `}</style>

      {/* Header tipo placa de acero */}
      <header style={{ background: "#1A1D21", padding: "28px 20px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <PackageSearch size={22} color="#F5A623" strokeWidth={2.5} />
          <span className="fm-mono" style={{ color: "#8B9096", fontSize: 12, letterSpacing: "0.08em" }}>
            DIRECTORIO LOCAL
          </span>
        </div>
        <h1 className="fm-display" style={{ color: "#F4F4F3", fontSize: 26, margin: 0, letterSpacing: "-0.01em" }}>
          BUSCADOR DE PROVEEDORES
        </h1>
        <p style={{ color: "#9CA1A7", fontSize: 14, marginTop: 6, marginBottom: 0 }}>
          Encuentra dónde comprar tus materiales, con llamada o WhatsApp directo.
        </p>
      </header>

      <main style={{ padding: "18px 16px 40px", maxWidth: 640, margin: "0 auto" }}>
        {/* Buscador */}
        <div style={{ position: "relative", marginBottom: 14 }}>
          <Search
            size={18}
            color="#6B7076"
            style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            className="fm-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, dirección o producto..."
            style={{
              width: "100%",
              padding: "13px 14px 13px 42px",
              borderRadius: 10,
              border: "1px solid #D5D7D4",
              background: "#FFFFFF",
              fontSize: 15,
              color: "#1A1D21",
              boxSizing: "border-box",
            }}
          />
          {query && (
            <button
              className="fm-btn"
              onClick={() => setQuery("")}
              aria-label="Limpiar búsqueda"
              style={{
                position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                border: "none", background: "transparent", cursor: "pointer", padding: 4,
              }}
            >
              <X size={17} color="#6B7076" />
            </button>
          )}
        </div>

        {/* Filtro por categoría (chips tipo etiqueta remachada) */}
        <div
          className="fm-scrollbar"
          style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 18 }}
        >
          <CategoryChip label="Todas" active={activeCategory === null} onClick={() => setActiveCategory(null)} />
          {visibleCategories.map((cat) => (
            <CategoryChip key={cat} label={cat} active={activeCategory === cat} onClick={() => setActiveCategory(cat)} />
          ))}
        </div>

        {usingDemoData && (
          <div
            style={{
              background: "#FCEFD6", border: "1px solid #F0D9A8", color: "#8A5A0A",
              fontSize: 12.5, padding: "8px 12px", borderRadius: 8, marginBottom: 14,
            }}
          >
            Mostrando datos de ejemplo — conecta la sesión del usuario para ver el directorio real de tu empresa.
          </div>
        )}

        {/* Resultados */}
        {loading ? (
          <p style={{ color: "#6B7076", fontSize: 14, textAlign: "center", padding: "30px 0" }}>Buscando proveedores…</p>
        ) : suppliers.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "#6B7076" }}>
            <PackageSearch size={30} color="#B8BBBE" style={{ marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: 14.5 }}>No encontramos proveedores con esa búsqueda.</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#9CA1A7" }}>Prueba con otro término o categoría.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {suppliers.map((s) => (
              <SupplierCard key={s.id} supplier={s} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function CategoryChip({ label, active, onClick }) {
  return (
    <button
      className="fm-chip"
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "7px 14px",
        borderRadius: 6,
        border: active ? "1px solid #F5A623" : "1px solid #D5D7D4",
        background: active ? "#F5A623" : "#FFFFFF",
        color: active ? "#1A1D21" : "#4B5157",
        fontSize: 12.5,
        fontWeight: 600,
        letterSpacing: "0.03em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function SupplierCard({ supplier }) {
  return (
    <article
      className="fm-card"
      style={{
        background: "#FFFFFF",
        border: "1px solid #DEE0DD",
        borderRadius: 10,
        padding: "16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <h2 className="fm-display" style={{ fontSize: 16.5, color: "#1A1D21", margin: 0, lineHeight: 1.25 }}>
          {supplier.name}
        </h2>
      </div>

      {supplier.address && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 6 }}>
          <MapPin size={14} color="#8B9096" style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 13.5, color: "#5B6066" }}>{supplier.address}</span>
        </div>
      )}

      {supplier.categories?.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {supplier.categories.map((c) => (
            <span
              key={c}
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                color: "#7A5310",
                background: "#FBEBCB",
                border: "1px solid #F0D9A8",
                borderRadius: 4,
                padding: "3px 8px",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}

      {supplier.notes && (
        <p style={{ fontSize: 12.5, color: "#8B9096", marginTop: 8, marginBottom: 0, fontStyle: "italic" }}>
          {supplier.notes}
        </p>
      )}

      {supplier.phone && (
        <p className="fm-mono" style={{ fontSize: 12.5, color: "#4B5157", marginTop: 10, marginBottom: 0 }}>
          +{supplier.phone}
        </p>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {supplier.tel_link && (
          <a
            href={supplier.tel_link}
            className="fm-btn"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 8, background: "#1A1D21", color: "#F4F4F3",
              fontSize: 13.5, fontWeight: 600, textDecoration: "none",
            }}
          >
            <Phone size={15} /> Llamar
          </a>
        )}
        {supplier.whatsapp_link && (
          <a
            href={supplier.whatsapp_link}
            target="_blank"
            rel="noreferrer"
            className="fm-btn"
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 0", borderRadius: 8, background: "#25D366", color: "#0B3D24",
              fontSize: 13.5, fontWeight: 600, textDecoration: "none",
            }}
          >
            <MessageCircle size={15} /> WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}
