import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FolderKanban, Package, Calculator, LifeBuoy, Bell, Phone, Mail, MessageCircle, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;
const MEDIA_BASE = import.meta.env.VITE_API_BASE_URL || "";

export default function Dashboard() {
  const { accessToken, user } = useAuth();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [projects, setProjects] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;
    const headers = { Authorization: `Bearer ${accessToken}` };
    Promise.all([
      fetch(`${API_BASE}/companies/me/contact`, { headers }).then((r) => (r.ok ? r.json() : null)),
      fetch(`${API_BASE}/projects`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/materials`, { headers }).then((r) => (r.ok ? r.json() : [])),
      fetch(`${API_BASE}/projects/notifications/feed?limit=10`, { headers }).then((r) => (r.ok ? r.json() : [])),
    ]).then(([companyData, projectsData, materialsData, feedData]) => {
      setCompany(companyData);
      setProjects(projectsData);
      setMaterials(materialsData);
      setFeed(feedData);
      setLoading(false);
    });
  }, [accessToken]);

  const activeProjects = projects
    .filter((p) => p.status === "in_progress" || p.status === "planning")
    .slice(0, 3);

  return (
    <div style={{ background: "#14171A", minHeight: "100%", paddingBottom: 20 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@700;800&display=swap');
        .fm-display { font-family: 'Archivo', sans-serif; }
      `}</style>

      {/* Hero */}
      <div style={{ padding: "28px 20px 22px", textAlign: "center", background: "linear-gradient(180deg, #1C2126 0%, #14171A 100%)" }}>
        {company?.logo_url && (
          <img src={`${MEDIA_BASE}${company.logo_url}`} alt={company.name} style={{ width: 68, height: 68, objectFit: "contain", marginBottom: 10 }} />
        )}
        <h1 className="fm-display" style={{ fontSize: 22, color: "#fff", letterSpacing: "0.02em", margin: 0 }}>
          {company?.name || "FORTIMETAL"}
        </h1>
        {company?.tagline && (
          <p style={{ color: "#F5A623", fontSize: 12.5, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", marginTop: 6 }}>
            {company.tagline}
          </p>
        )}
        <p style={{ color: "#8B9096", fontSize: 12.5, marginTop: 4 }}>Hola, {user?.full_name?.split(" ")[0]}</p>
      </div>

      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Fila de 2 tarjetas: Proyectos + Materiales */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <DashCard title="Proyectos activos" icon={FolderKanban} onClick={() => navigate("/proyectos")}>
            {loading ? (
              <SkeletonLines />
            ) : activeProjects.length === 0 ? (
              <EmptyHint text="Sin proyectos activos" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {activeProjects.map((p) => (
                  <div key={p.id}>
                    <div style={{ fontSize: 11.5, color: "#D6D8D5", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
                    <div style={{ height: 4, background: "#2A2E33", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${p.progress_percent}%`, height: "100%", background: "#F5A623" }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DashCard>

          <DashCard title="Materiales en stock" icon={Package} onClick={() => navigate("/materiales")}>
            {loading ? (
              <SkeletonLines />
            ) : materials.length === 0 ? (
              <EmptyHint text="Sin materiales cargados" />
            ) : (
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                {materials.slice(0, 3).map((m) => (
                  <div key={m.id} style={{ width: 34, height: 34, borderRadius: 8, background: "#2A2E33", overflow: "hidden", flexShrink: 0 }}>
                    {m.image_url && <img src={`${MEDIA_BASE}${m.image_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                ))}
              </div>
            )}
            <button style={dashBtn} onClick={(e) => { e.stopPropagation(); navigate("/materiales"); }}>Pedir</button>
          </DashCard>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <DashCard title="Calculadora" icon={Calculator} onClick={() => navigate("/calculadora")}>
            <p style={{ fontSize: 11.5, color: "#8B9096", marginBottom: 10 }}>Metrados de galpones, cercos, escaleras y más.</p>
            <button style={dashBtn} onClick={(e) => { e.stopPropagation(); navigate("/calculadora"); }}>Calcular</button>
          </DashCard>

          <DashCard title="Soporte técnico" icon={LifeBuoy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11.5, color: "#D6D8D5" }}>
              {company?.contact_phone && (
                <a href={`tel:${company.contact_phone}`} style={contactLink}><Phone size={12} /> {company.contact_phone}</a>
              )}
              {company?.contact_whatsapp && (
                <a href={`https://wa.me/${company.contact_whatsapp}`} target="_blank" rel="noreferrer" style={contactLink}><MessageCircle size={12} /> WhatsApp</a>
              )}
              {company?.contact_email && (
                <a href={`mailto:${company.contact_email}`} style={{ ...contactLink, wordBreak: "break-all" }}><Mail size={12} /> {company.contact_email}</a>
              )}
              {!company?.contact_phone && !company?.contact_whatsapp && !company?.contact_email && (
                <EmptyHint text="Sin datos de contacto" />
              )}
            </div>
          </DashCard>
        </div>

        {/* Notificaciones recientes */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 13, fontWeight: 700, marginBottom: 10 }}>
            <Bell size={14} color="#F5A623" /> Notificaciones recientes
          </div>
          {loading ? (
            <div style={{ height: 84, background: "#1C2126", borderRadius: 10 }} />
          ) : feed.length === 0 ? (
            <p style={{ fontSize: 12, color: "#8B9096" }}>Todavía no hay avisos de avance.</p>
          ) : (
            <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
              {feed.map((n) => (
                <button
                  key={n.id}
                  onClick={() => navigate("/proyectos")}
                  style={{ flexShrink: 0, width: 96, textAlign: "left", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <div style={{ width: 96, height: 72, borderRadius: 10, background: "#2A2E33", overflow: "hidden", marginBottom: 5 }}>
                    {n.image_url && <img src={`${MEDIA_BASE}${n.image_url}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ fontSize: 10.5, color: "#D6D8D5", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                    {n.project_name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DashCard({ title, icon: Icon, onClick, children }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "#1C2126", borderRadius: 14, padding: 14, cursor: onClick ? "pointer" : "default",
        border: "1px solid #262B31", display: "flex", flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fff", fontSize: 12.5, fontWeight: 700 }}>
          <Icon size={14} color="#F5A623" /> {title}
        </div>
        {onClick && <ChevronRight size={14} color="#4B5157" />}
      </div>
      {children}
    </div>
  );
}

function SkeletonLines() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ height: 8, background: "#2A2E33", borderRadius: 4, width: "80%" }} />
      <div style={{ height: 8, background: "#2A2E33", borderRadius: 4, width: "60%" }} />
    </div>
  );
}

function EmptyHint({ text }) {
  return <p style={{ fontSize: 11, color: "#5A6067" }}>{text}</p>;
}

const dashBtn = {
  background: "#F5A623", color: "#1A1A1A", border: "none", borderRadius: 7,
  padding: "6px 0", fontSize: 12, fontWeight: 700, cursor: "pointer", width: "100%",
};

const contactLink = { display: "flex", alignItems: "center", gap: 6, color: "#D6D8D5", textDecoration: "none" };
