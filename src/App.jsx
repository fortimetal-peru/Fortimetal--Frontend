import { NavLink, Route, Routes } from "react-router-dom";
import { Home, PackageSearch, Ruler, Sparkles, FileText } from "lucide-react";

import SupplierDirectory from "./components/SupplierDirectory.jsx";
import MaterialTakeoffCalculator from "./components/MaterialTakeoffCalculator.jsx";
import BudgetGenerator from "./components/BudgetGenerator.jsx";
import RoofPreviewGenerator from "./components/RoofPreviewGenerator.jsx";

// NOTA sobre login: todavía no está integrado aquí (ver PROJECT_STATUS.md — se decidió
// usar Google OAuth pero está pausado hasta tener el correo de empresa). Cuando esté
// listo, esta es la pantalla donde se debe guardar el token (ver getAuthToken() dentro
// de SupplierDirectory.jsx, hoy lee window.__FORTIMETAL_TOKEN__).

const NAV_ITEMS = [
  { to: "/", label: "Inicio", icon: Home, end: true },
  { to: "/proveedores", label: "Proveedores", icon: PackageSearch },
  { to: "/calculadora", label: "Metrados", icon: Ruler },
  { to: "/cotizador", label: "Cotizador", icon: FileText },
  { to: "/vista-previa", label: "Vista IA", icon: Sparkles },
];

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
      <main style={{ flex: 1, paddingBottom: 72 }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/proveedores" element={<SupplierDirectory />} />
          <Route path="/calculadora" element={<MaterialTakeoffCalculator />} />
          <Route path="/cotizador" element={<BudgetGenerator />} />
          {/* companySlug y quoteId reales llegan del flujo del cotizador público
              (POST /public/{slug}/quotes) una vez que el login/cotizador formal esté
              conectado. Sin ellos, el componente sigue funcionando pero no persiste
              la imagen en el backend — ver comentario en RoofPreviewGenerator.jsx. */}
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
