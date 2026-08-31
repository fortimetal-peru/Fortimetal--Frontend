# FORTIMETAL PWA — Estado del proyecto (handoff)

> Sube este archivo junto con `fortimetal-backend.zip` al iniciar la nueva conversación,
> y dile a Claude: "Continuemos este proyecto, aquí está el contexto y el código actual."

## Qué es esto

Backend + componentes frontend para una PWA **multi-empresa** (multi-tenant), pensada
originalmente para FORTIMETAL (estructuras metálicas, Huancayo, Perú) pero armada para
que otros negocios de servicios (amigos del dueño) puedan sumarse a la misma plataforma
con sus propios datos aislados.

**Stack**: FastAPI + PostgreSQL (backend), React sin framework fijo aún (componentes sueltos).

## Arquitectura clave

- **Multi-tenant**: tabla `Company` (slug, branding, industria). Todo dato de negocio
  (proyectos, materiales, cotizaciones, proveedores, usuarios) tiene `company_id` y
  se filtra automáticamente por la empresa del usuario autenticado.
- **Roles**: `super_admin` (dueño de la plataforma, gestiona empresas) → `admin`
  (dueño de una empresa) → `client` (cliente de esa empresa, solo ve lo suyo).
- **Alta de empresa self-service**: `POST /companies/register` crea la empresa +
  su primer admin en un solo paso, sin intervención manual.
- Todo probado con pruebas funcionales end-to-end reales (no solo revisión visual)
  en cada módulo agregado — se corrieron con `TestClient` de FastAPI antes de entregar.

## Módulos ya construidos (backend, `app/`)

| Módulo | Qué hace |
|---|---|
| `auth` | Login JWT (access + refresh), cambio de contraseña |
| `companies` | Registro self-service, branding público por slug, gestión de plataforma |
| `users` | Admin crea/gestiona clientes dentro de su empresa |
| `projects` | Proyectos con progreso, galería de fotos, notificaciones de avance |
| `materials` | Catálogo de stock con ajuste de inventario |
| `calculator` | Cálculo rápido de vigas (momento, cortante, flecha) — específico de estructuras metálicas |
| `support` | Tickets de soporte técnico |
| `uploads` | Subida de imágenes, organizadas por carpeta de empresa |
| `quotes` | **Cotizador público** (sin login, por slug): estimado automático de peso/costo de acero + bandeja de leads + conversión a proyecto/cliente real |
| `suppliers` | **Buscador de proveedores locales**: filtro por categoría, texto libre, links `tel:`/`wa.me` ya armados |

## Módulos ya construidos (frontend, `frontend/`)

- `SupplierDirectory.jsx` — página de búsqueda de proveedores, diseño industrial (ámbar/acero), conectada a `GET /suppliers`.
- `MaterialTakeoffCalculator.jsx` + `lib/materialTakeoff.js` — **calculadora de metrados y despiece** (galpón/techo, cerco, escalera): calcula automáticamente traslapes de cobertura, tijerales, tiras de tubo con merma, pernos, pintura y soldadura. Sin backend, y se conecta directo al cotizador de campo (un botón envía la lista de materiales calculada a `BudgetGenerator.jsx` vía `localStorage`).
- `BudgetGenerator.jsx` + `lib/budgetCalculations.js` + `lib/pdfGenerator.js` — cotizador
  de campo **offline**: catálogo de precios en `localStorage`, genera PDF con `jsPDF`,
  comparte por WhatsApp con `navigator.share`. No depende del backend.

## Decisiones pendientes / conversación en curso

1. **Login con Google — YA ARMADO, falta solo la configuración externa**:
   - Backend: `POST /api/v1/auth/google` (en `app/routers/auth.py`), valida el
     `id_token` con `app/core/google_auth.py`, campo `google_sub` en `User`
     (`app/models/user.py`), `hashed_password` ahora nullable. Probado end-to-end
     con `TestClient` (usuario nuevo, usuario repetido, vincular cuenta existente
     por email, empresa inexistente → 404, `/auth/me` con el token resultante).
   - Frontend: `AuthContext` (`src/context/AuthContext.jsx`), pantalla
     `src/components/Login.jsx` con el botón de Google Identity Services, ruta
     `/login` y `/proveedores` protegida en `App.jsx`, `SupplierDirectory.jsx` ya
     lee el token del contexto (se quitó el placeholder `window.__FORTIMETAL_TOKEN__`).
   - **Lo único que falta para probarlo real**: crear el Client ID de OAuth en
     [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
     (tipo "Web application", con los orígenes autorizados de tu dev/producción) y
     poner el mismo valor en `GOOGLE_CLIENT_ID` (backend, `.env`) y
     `VITE_GOOGLE_CLIENT_ID` (frontend, `.env.local`). Sin eso, el botón de Google
     no aparece y el backend responde 500 si igual se llama al endpoint.
   - El login clásico con email/password (`POST /auth/login`) sigue intacto y
     funcionando — un usuario puede tener ambos métodos si su cuenta se vincula.
2. **Presupuestos de campo → backend**: hoy `BudgetGenerator.jsx` guarda todo en
   `localStorage` del dispositivo. Quedó pendiente (si se quiere) un `POST /budgets`
   para que el admin vea desde el panel web los presupuestos generados en campo.
3. **Ideas discutidas pero no construidas todavía**: notificaciones push, generación
   de PDF de comprobantes de pago, dashboard de métricas para admin, programa de
   referidos, recordatorios de mantenimiento preventivo.

## Cómo seguir

Dile a Claude algo como:
> "Aquí está el backend y frontend de FORTIMETAL que ya armamos (zip adjunto + este
> resumen). Quiero seguir con [notificaciones push / login con Google / lo que sea]."

Claude puede leer el zip directamente para ver el código real antes de seguir.
