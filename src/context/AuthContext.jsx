import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

// ---------------------------------------------------------------------------
// Contexto de autenticación de FORTIMETAL.
//
// Reemplaza el placeholder window.__FORTIMETAL_TOKEN__ que usaba
// SupplierDirectory.jsx: ahora el token vive acá (en memoria + localStorage
// para persistir entre recargas) y cualquier componente lo lee con useAuth().
//
// Login soportado hoy: Google (Google Identity Services) contra
// POST /api/v1/auth/google. El login clásico con email/password sigue
// funcionando en el backend (POST /api/v1/auth/login) pero no tiene UI acá
// todavía — si se necesita, se puede agregar un loginWithPassword() análogo
// a loginWithGoogle() más abajo.
// ---------------------------------------------------------------------------

const API_BASE = `${import.meta.env.VITE_API_BASE_URL || ""}/api/v1`;

const STORAGE_KEYS = {
  accessToken: "fortimetal_access_token",
  refreshToken: "fortimetal_refresh_token",
  user: "fortimetal_user",
};

const AuthContext = createContext(null);

function readStoredSession() {
  try {
    const accessToken = localStorage.getItem(STORAGE_KEYS.accessToken);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken);
    const userRaw = localStorage.getItem(STORAGE_KEYS.user);
    if (!accessToken || !userRaw) return null;
    return { accessToken, refreshToken, user: JSON.parse(userRaw) };
  } catch {
    return null;
  }
}

function persistSession(session) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.accessToken, session.accessToken);
      localStorage.setItem(STORAGE_KEYS.refreshToken, session.refreshToken ?? "");
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(session.user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.accessToken);
      localStorage.removeItem(STORAGE_KEYS.refreshToken);
      localStorage.removeItem(STORAGE_KEYS.user);
    }
  } catch {
    // localStorage puede fallar en navegación privada — la sesión simplemente
    // no persiste entre recargas, pero la app sigue funcionando en memoria.
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readStoredSession());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    persistSession(session);
  }, [session]);

  const loginWithGoogle = useCallback(async (idToken, companySlug) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_token: idToken,
          // company_slug es opcional — si no se manda, el backend usa
          // DEFAULT_COMPANY_SLUG ("fortimetal"). Se deja explícito acá por
          // claridad y para cuando la plataforma sirva a más de una empresa.
          ...(companySlug ? { company_slug: companySlug } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "No se pudo iniciar sesión con Google");
      }
      const data = await res.json();
      setSession({ accessToken: data.access_token, refreshToken: data.refresh_token, user: data.user });
      return data.user;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      accessToken: session?.accessToken ?? null,
      isAuthenticated: Boolean(session?.accessToken),
      loading,
      error,
      loginWithGoogle,
      logout,
    }),
    [session, loading, error, loginWithGoogle, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
