# FORTIMETAL — Frontend (PWA)

Proyecto Vite + React. Repo separado del backend (FastAPI), pensado para desplegarse
independiente (ej. Vercel) y consumir la API por HTTP.

## Estructura

```
├── api/
│   └── render-preview.js      # función serverless (Vercel): arma el prompt oculto
│                               # y llama a Gemini 2.5 Flash Image para el render con IA
├── src/
│   ├── main.jsx                # entrypoint
│   ├── App.jsx                 # navegación + rutas
│   └── components/
│       ├── SupplierDirectory.jsx
│       ├── MaterialTakeoffCalculator.jsx
│       ├── BudgetGenerator.jsx
│       ├── RoofPreviewGenerator.jsx
│       └── lib/                # cálculos puros (metrados, presupuesto, PDF)
├── vite.config.js              # incluye plugin PWA (manifest + service worker)
├── .env.example
└── package.json
```

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # opcional en dev, ver nota abajo
npm run dev
```

En desarrollo, Vite ya hace **proxy** de `/api/v1` hacia `http://localhost:8000`
(el backend corriendo local — ver `vite.config.js`), así que normalmente no
necesitas tocar `.env.local` para probar contra tu backend local.

## Variables de entorno

Ver `.env.example`. Dos variables, con alcance distinto:

- `VITE_API_BASE_URL` — URL del backend FastAPI en **producción**. Se expone al
  navegador (todo lo que empieza con `VITE_` lo hace Vite), así que solo debe
  llevar la URL pública de la API, nunca secretos.
- `GEMINI_API_KEY` — usada **solo** dentro de `api/render-preview.js`, que corre
  en el servidor (función serverless), nunca en el navegador. Por eso no lleva
  el prefijo `VITE_`. Consíguela gratis en https://aistudio.google.com/apikey.

## Despliegue (Vercel)

1. Importa este repo en Vercel.
2. En **Project Settings > Environment Variables**, agrega:
   - `VITE_API_BASE_URL` = URL pública de tu backend (repo separado).
   - `GEMINI_API_KEY` = tu key de Google AI Studio.
3. Vercel detecta `api/render-preview.js` automáticamente como función serverless
   — no necesita configuración extra.
4. En el **backend**, agrega el dominio que te dé Vercel a `CORS_ORIGINS` en
   `app/core/config.py` (o como variable de entorno, si lo cambias a leerlo de ahí),
   o las peticiones del frontend van a fallar por CORS.

## Multi-empresa (multi-tenant)

El backend ya es multi-tenant (cada empresa tiene su `slug`, branding y datos
aislados). Este frontend hoy trae el branding de FORTIMETAL fijo en los
componentes (colores `#F5A623` / `#1A1A1A`, textos). Si vas a servir a varias
empresas desde este mismo frontend, lo siguiente pendiente es:

- Cargar el branding (`primary_color`, `secondary_color`, `logo_url`, `tagline`)
  desde `GET /public/{slug}/branding` según el slug de la empresa (subdominio o
  ruta), en vez de tenerlo hardcodeado.
- Pasar ese `slug` a `RoofPreviewGenerator` (prop `companySlug`) y al resto de
  componentes que llaman al backend.

## Login pendiente

Según `PROJECT_STATUS.md` del backend: se decidió usar Google OAuth en vez de
JWT propio, pausado hasta tener el correo de empresa. Mientras tanto, el JWT
actual sigue funcionando — `getAuthToken()` dentro de `SupplierDirectory.jsx`
es el lugar donde conectar el token de sesión real cuando el login esté listo.
