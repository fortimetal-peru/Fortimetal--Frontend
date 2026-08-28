import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Home, PackageSearch, Ruler, Sparkles, FileText, LogIn, LogOut, User as UserIcon } from "lucide-react";

import SupplierDirectory from "./components/SupplierDirectory.jsx";
import MaterialTakeoffCalculator from "./components/MaterialTakeoffCalculator.jsx";
import BudgetGenerator from "./components/BudgetGenerator.jsx";
import RoofPreviewGenerator from "./components/RoofPreviewGenerator.jsx";
import Login from "./components/Login.jsx";
import { useAuth } from "./context/AuthContext.jsx";

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/proveedores", label: "Proveedores", icon: PackageSearch },
  { to: "/calculadora", label: "Metrados", icon: Ruler },
  { to: "/cotizador", label: "Cotizador", icon: FileText },
  { to: "/vista-previa", label: "Vista IA", icon: Sparkles },
];

// Envuelve rutas que requieren sesión (hoy solo /proveedores, porque el backend
// exige token para GET /suppliers). Si no hay sesión, manda a /login y recuerda
// a dónde volver.
function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}

function TopBar() {
  const { user, logout } = useAuth();
  return (
    <div
      style={{
        display: "flex", alignItems: "center", justifyContent: "flex-end",
        gap: 10, padding: "10px 16px", fontSize: 12.5, color: "#4B5157",
      }}
    >
      {user ? (
        <>
          <UserIcon size={14} />
          <span>{user.full_name}</span>
          <button
            onClick={logout}
            style={{
              display: "flex", alignItems: "center", gap: 4, background: "none",
              border: "none", color: "#4B5157", cursor: "pointer", fontSize: 12.5,
            }}
          >
            <LogOut size={14} /> Salir
          </button>
        </>
      ) : (
        <NavLink
          to="/login"
          style={{ display: "flex", alignItems: "center", gap: 4, color: "#F5A623", textDecoration: "none" }}
        >
          <LogIn size={14} /> Iniciar sesión
        </NavLink>
      )}
    </div>
  );
}

function HomePage() {
  return (
    <div style={{ padding: 24, maxWidth: 480, margin: "0 auto" }}>
      <h1 className="fm-display" style={{ fontSize: 26, color: "#1A1A1A" }}>FORTIMETAL</h1>
      <p style={{ color: "#4B5157", fontSize: 14 }}>
        Usa el menú de abajo para buscar proveedores, calcular metrados, armar una
        cotización de campo o generar una pre-visualización con IA.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <TopBar />
      <main style={{ flex: 1, paddingBottom: 72 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/proveedores"
            element={
              <RequireAuth>
                <SupplierDirectory />
              </RequireAuth>
            }
          />
          <Route path="/calculadora" element={<MaterialTakeoffCalculator />} />
          <Route path="/cotizador" element={<BudgetGenerator />} />
          {/* companySlug y quoteId reales llegan del flujo del cotizador público
              (POST /public/{slug}/quotes). Sin ellos, el componente sigue
              funcionando pero no persiste la imagen en el backend — ver
              comentario en RoofPreviewGenerator.jsx. */}
          <Route path="/vista-previa" element={<RoofPreviewGenerator />} />
        </Routes>
      </main>

      <nav
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, display: "flex",
          background: "#1A1D21", borderTop: "1px solid #2A2E33", zIndex: 10,
        }}
      >
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            style={({ isActive }) => ({
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3, padding: "10px 4px", textDecoration: "none",
              color: isActive ? "#F5A623" : "#8B9096", fontSize: 10.5,
            })}
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
