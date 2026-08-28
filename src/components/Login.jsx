import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// ---------------------------------------------------------------------------
// Carga el script de Google Identity Services (GIS) una sola vez, sin importar
// cuántas veces se monte este componente.
// ---------------------------------------------------------------------------
let gisScriptPromise = null;
function loadGoogleScript() {
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No se pudo cargar el script de Google"));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

export default function Login() {
  const { loginWithGoogle, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const buttonRef = useRef(null);
  const [scriptError, setScriptError] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Si ya hay sesión, no tiene sentido mostrar el login — vuelve a donde el
  // usuario quería ir (o a inicio).
  useEffect(() => {
    if (isAuthenticated) {
      const redirectTo = location.state?.from || "/";
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, location.state]);

  useEffect(() => {
    if (isAuthenticated) return;
    if (!GOOGLE_CLIENT_ID) {
      setScriptError(
        "Falta configurar VITE_GOOGLE_CLIENT_ID en el frontend (ver .env.example)."
      );
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !buttonRef.current) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: async (response) => {
            setAuthError(null);
            try {
              await loginWithGoogle(response.credential);
              // La redirección ocurre en el useEffect de arriba cuando
              // isAuthenticated pase a true.
            } catch (err) {
              setAuthError(err.message || "No se pudo iniciar sesión con Google");
            }
          },
        });
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: "outline",
          size: "large",
          width: 280,
          text: "continue_with",
          locale: "es",
        });
      })
      .catch((err) => {
        if (!cancelled) setScriptError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loginWithGoogle]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#EDEEEC",
        textAlign: "center",
      }}
    >
      <h1 className="fm-display" style={{ fontSize: 28, color: "#1A1A1A", marginBottom: 6 }}>
        FORTIMETAL
      </h1>
      <p style={{ color: "#4B5157", fontSize: 14, marginBottom: 28, maxWidth: 320 }}>
        Inicia sesión con tu cuenta de Google para ver tus proyectos, materiales y proveedores.
      </p>

      <div ref={buttonRef} />

      {scriptError && (
        <p style={{ color: "#B3261E", fontSize: 13, marginTop: 16, maxWidth: 300 }}>{scriptError}</p>
      )}
      {authError && (
        <p style={{ color: "#B3261E", fontSize: 13, marginTop: 16, maxWidth: 300 }}>{authError}</p>
      )}
    </div>
  );
}
