# FORTIMETAL — Backend API (multi-empresa)

API REST **multi-tenant** construida con **FastAPI + PostgreSQL**: sirve a FORTIMETAL
y, con la misma base de código, a cualquier otra empresa de servicios que se registre
en la plataforma (gasfitería, carpintería, electricidad, etc.), con los datos de cada
una totalmente aislados entre sí.

**Roles:**
- **super_admin**: dueño de la plataforma (tú). Gestiona el listado de empresas, no opera datos de negocio.
- **admin**: administrador de UNA empresa. Gestión completa dentro de su propia empresa.
- **client**: cliente de una empresa. Solo ve su propia información.

## Módulos incluidos

| Módulo | Descripción |
|---|---|
| **Companies** | Multi-tenant: registro self-service de nuevas empresas, branding público, gestión de plataforma |
| **Auth** | Login con JWT (access + refresh token), cambio de contraseña |
| **Users** | Admin crea/gestiona cuentas de clientes |
| **Projects** | Proyectos con progreso, galería de fotos y notificaciones de avance |
| **Materials** | Catálogo de stock (vigas, perfiles, tubos) con ajuste de inventario |
| **Calculator** | Cálculo rápido de vigas (momento, cortante, flecha) |
| **Support** | Tickets de soporte técnico desde la PWA |
| **Uploads** | Subida de imágenes (proyectos, materiales, notificaciones), servidas vía `/media` |
| **Quotes** | Cotizador público (sin login): estimado instantáneo de peso/costo + gestión de leads |
| **Suppliers** | Buscador de proveedores locales: filtro por categoría, texto libre, links tel:/WhatsApp listos |

Corresponde 1:1 a las secciones de la app: *Proyectos Activos*, *Materiales en Stock*,
*Calculadora de Estructuras*, *Soporte Técnico* y *Notificaciones Recientes de Proyectos*.

## Cómo correrlo

### Opción A: Docker (recomendado, levanta API + PostgreSQL juntos)

```bash
cp .env.example .env
docker compose up --build
```

La API queda en `http://localhost:8000`. Documentación interactiva en `http://localhost:8000/docs`.

### Opción B: local, con tu propio PostgreSQL

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # edita DATABASE_URL con tus credenciales
uvicorn app.main:app --reload
```

En modo `development`, la app crea automáticamente:
- Un usuario **super_admin** de plataforma (`FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` del `.env`).
- Una empresa semilla **FORTIMETAL** con su propio admin: `admin@fortimetal24.com` / la misma contraseña.

Cualquier otra empresa (como la de un amigo) se suma vía `POST /companies/register`, sin tocar código.

> En producción, cambia `ENVIRONMENT=production` en el `.env` y usa **Alembic**
> para migraciones en vez de la creación automática de tablas (ver sección siguiente).

## Despliegue en Railway

El proyecto ya está listo para Railway tal cual (Dockerfile + Alembic). Pasos:

1. **Crea el proyecto en Railway** e importa este repo (o el zip subido a un repo de GitHub).
2. **Agrega un plugin de PostgreSQL** desde el panel de Railway (botón "New" → "Database"
   → "PostgreSQL"). Railway te da su propia `DATABASE_URL` — cópiala.
3. En el servicio de la API, agrega estas variables de entorno (Settings → Variables):

   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` | La que dio el plugin de Postgres, cambiando el prefijo a `postgresql+psycopg://` (Railway la da como `postgresql://`; SQLAlchemy con el driver `psycopg` v3 necesita el prefijo `+psycopg`) |
   | `SECRET_KEY` | Una cadena larga y aleatoria (ej. `openssl rand -hex 32`) — **no** dejes el valor de ejemplo |
   | `ENVIRONMENT` | `production` |
   | `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` | Los del super_admin de la plataforma — cambia la contraseña de ejemplo |
   | `GOOGLE_CLIENT_ID` | El Client ID de OAuth de Google Cloud Console |
   | `CORS_ORIGINS` | Dominios del frontend, separados por coma (ej. `https://fortimetal.vercel.app`) |

4. Railway detecta el `Dockerfile` automáticamente y lo usa para el build — no hace
   falta configurar nada más de build/start command.
5. En cada deploy, el contenedor corre `alembic upgrade head` antes de levantar
   `uvicorn` (ver `Dockerfile`), así que las tablas quedan al día solas.
6. **Nota sobre `ENVIRONMENT=production`**: con esta variable, la app deja de correr el
   seed automático (super_admin + empresa FORTIMETAL de ejemplo) que sí se ejecuta en
   `development`. Si quieres esos datos también en producción, créalos a mano después
   del primer deploy: el super_admin con un `INSERT` directo o un script puntual, y la
   empresa FORTIMETAL vía `POST /companies/register` (ver sección de arriba).
7. **Imágenes subidas (`/media`)**: Railway usa un filesystem efímero — cualquier
   imagen subida a `media/` se pierde en el próximo deploy o reinicio. Para producción
   real conviene un volumen de Railway o mover el storage a S3/R2/Supabase Storage
   (ver nota en la sección de Subida de imágenes más abajo). Para una primera puesta
   en marcha esto no bloquea el despliegue, pero es bueno saberlo antes de subir fotos
   reales de proyectos.

## Migraciones con Alembic (producción)

Ya está todo armado (carpeta `alembic/`, `env.py` conectado a `Base.metadata` y a
`settings.DATABASE_URL`, y una migración inicial `alembic/versions/23bfa69b292c_init.py`
con las 9 tablas del proyecto, generada y probada contra un Postgres real). El
`Dockerfile` corre `alembic upgrade head` automáticamente antes de arrancar el servidor
en cada deploy — no necesitas correr nada a mano en Railway.

Para el día a día en desarrollo, cuando cambies un modelo:

```bash
alembic revision --autogenerate -m "descripción del cambio"
alembic upgrade head
```

Revisa siempre el archivo generado en `alembic/versions/` antes de aplicarlo —
autogenerate detecta bien la mayoría de cambios, pero no todos (ej. renombrar una
columna se detecta como "borrar una y crear otra", perdiendo los datos si no se corrige
a mano).

## Multi-empresa (multi-tenant)

Todo dato de negocio (proyectos, materiales, cotizaciones, tickets, usuarios) está
ligado a una `company_id`, y cada endpoint filtra automáticamente por la empresa del
usuario autenticado — nunca hay que pasarlo manualmente ni existe riesgo de que una
empresa vea datos de otra.

**Cómo se suma una empresa nueva** (tu amigo, por ejemplo):

```bash
curl -X POST http://localhost:8000/api/v1/companies/register \
  -H "Content-Type: application/json" \
  -d '{
    "company_name": "Gasfitería XYZ",
    "slug": "gasfiteria-xyz",
    "industry": "plumbing",
    "admin_full_name": "Pedro Gómez",
    "admin_email": "pedro@gasfiteriaxyz.com",
    "admin_password": "unaClaveSegura123"
  }'
```

Esto crea la empresa y su primer usuario admin en un solo paso, y devuelve tokens
para entrar directo a su panel — sin que tú tengas que crear nada manualmente.

**El cotizador público usa el `slug` en la URL** para saber a qué empresa pertenece
cada lead, ya que ese endpoint no requiere login:

```
POST /api/v1/public/{slug}/quotes       -> ej. /api/v1/public/gasfiteria-xyz/quotes
GET  /api/v1/companies/public/{slug}    -> branding (logo, colores) para pintar la PWA de esa empresa
```

En el frontend, cada empresa vive en su propia URL/subdominio (ej. `fortimetal.tuapp.com`,
`gasfiteria-xyz.tuapp.com`), y la PWA usa ese `slug` para cargar tanto el branding como
las llamadas al cotizador público correspondientes.

**Módulos genéricos** (sirven para cualquier rubro): proyectos, materiales/catálogo,
cotizador, soporte técnico, notificaciones, subida de imágenes.
**Módulo específico de FORTIMETAL**: la calculadora de vigas (`/calculator/beam`) —
si otra empresa de un rubro distinto no la necesita, simplemente no la usa desde su
frontend; queda disponible para cualquier empresa igual, sin restricción por industria.

## Buscador de proveedores locales

`GET /api/v1/suppliers?q=pernos&category=Aceros` — busca en nombre, dirección y
categorías, con filtro exacto opcional por categoría. Disponible para admin y
clientes autenticados de la empresa (no público, a diferencia del cotizador).

Cada proveedor devuelto ya trae los links armados, listos para un botón:

```json
{
  "name": "Aceros Central SAC",
  "phone": "51964000002",
  "tel_link": "tel:+51964000002",
  "whatsapp": "51964000002",
  "whatsapp_link": "https://wa.me/51964000002"
}
```

Así el frontend solo necesita `<a href={proveedor.whatsapp_link}>Escribir</a>` —
sin tener que armar el formato del link él mismo.

`GET /suppliers/categories` devuelve las categorías realmente en uso (no una lista
fija en el código), para poblar el filtro del buscador dinámicamente.

**Carga inicial**: `proveedores.example.json` en la raíz del proyecto tiene datos de
ejemplo (ficticios) con el formato correcto. Se importan todos de una vez con:

```bash
curl -X POST http://localhost:8000/api/v1/suppliers/import \
  -H "Authorization: Bearer <token-de-admin>" \
  -H "Content-Type: application/json" \
  -d @proveedores.example.json
```

Reemplaza los datos de ejemplo por los proveedores reales de tu zona antes de importar.

## Cotizador público (generador de leads)

Este es el módulo pensado para que la PWA deje de ser solo una vitrina: cualquier
visitante (sin crear cuenta) puede pedir un estimado instantáneo desde
`POST /api/v1/public/{slug}/quotes`, y el sistema calcula al vuelo:

- **Peso estimado de acero** (kg), según fórmulas por tipo de estructura
  (`app/core/quote_calculator.py`): galpón, techo parabólico, cerco, portón,
  escalera y baranda. Cada fórmula ajusta el kg/m² o kg/m lineal según la luz
  (ancho) o el desnivel, siguiendo rangos típicos de la industria.
- **Rango de costo** (mínimo–máximo, en soles), aplicando el precio de acero
  configurado (`STEEL_PRICE_PER_KG`), un factor de desperdicio de material, y
  un multiplicador de mano de obra/montaje/utilidad (también configurable en
  `app/core/config.py` — súbelo o bájalo según cómo se comporten tus márgenes reales).

El resultado siempre incluye un `disclaimer` aclarando que es un estimado
referencial, no una cotización formal — importante tanto legal como comercialmente.

**Flujo completo de venta ya conectado:**

1. Visitante llena el formulario → `POST /public/{slug}/quotes` (público) → recibe estimado + se guarda como lead.
2. Ventas revisa la bandeja → `GET /quotes` (admin) → actualiza estado con `PATCH /quotes/{id}`
   (`new` → `contacted` → `quoted` → `won`/`lost`).
3. Si se cierra la venta → `POST /quotes/{id}/convert-to-project` (admin) crea automáticamente
   la cuenta del cliente (si no existía) *y* el proyecto, ya vinculados — sin volver a
   digitar nombre/teléfono/correo. Desde ahí el cliente ya puede loguearse en la PWA
   y ver el avance de su obra con todo lo que armamos antes (galería, notificaciones, etc.).

> Los precios (`STEEL_PRICE_PER_KG`, multiplicadores de mano de obra) hoy viven en
> variables de entorno para que puedas ajustarlos sin re-desplegar código. Si más
> adelante quieres que el propio admin los edite desde la PWA, es sencillo moverlos
> a una tabla `pricing_settings` en la base de datos — dime y lo armamos.

## Login con Google

Además del login clásico (`POST /auth/login`, email + contraseña), existe
`POST /auth/google` para iniciar sesión con una cuenta de Google:

```json
POST /api/v1/auth/google
{
  "id_token": "<id_token que devuelve el botón de Google en el navegador>",
  "company_slug": "fortimetal"   // opcional — si se omite, usa DEFAULT_COMPANY_SLUG
}
```

El backend valida el `id_token` contra los servidores de Google (firma, audiencia,
expiración) usando `GOOGLE_CLIENT_ID` — nunca confía en un email mandado como texto
plano. Reglas de resolución de usuario, en orden:

1. Ya existe un usuario vinculado a esa cuenta de Google (`google_sub`) → entra directo.
2. No hay vínculo todavía, pero ya existe un usuario con ese email (por ejemplo el
   admin sembrado `admin@fortimetal24.com`, creado con contraseña) → se vincula esa
   cuenta a Google (sigue pudiendo entrar también con su contraseña) y entra.
3. No existe ningún usuario con ese email → se crea una cuenta **client** nueva bajo
   la empresa indicada en `company_slug` (self-service). Este endpoint nunca crea un
   `admin` automáticamente, para no abrir una vía de escalar privilegios sin
   intervención humana — los admins se crean por `POST /companies/register` o los da
   de alta otro admin/super_admin.

Variables de entorno nuevas (ver `.env.example`):

- `GOOGLE_CLIENT_ID` — Client ID de OAuth 2.0 ("Web application") de
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Debe
  coincidir con `VITE_GOOGLE_CLIENT_ID` en el frontend.
- `DEFAULT_COMPANY_SLUG` — empresa a la que se asigna un usuario nuevo si el
  frontend no manda `company_slug` explícito (hoy `"fortimetal"`, porque solo hay
  una empresa activa).

Para que un usuario **exista sin contraseña** (cuentas creadas solo por Google),
`users.hashed_password` es nullable — ese usuario simplemente no puede usar
`POST /auth/login`, solo `/auth/google`.

## Seguridad

- Contraseñas con **bcrypt**.
- Autenticación **JWT** (access token de 8h, refresh token de 7 días).
- Control de acceso por rol en cada endpoint (`get_current_admin` vs `get_current_user`).
- Un cliente **nunca** puede ver ni modificar datos de otro cliente — se filtra siempre por `client_id`.

## Subida de imágenes

`POST /api/v1/uploads/image?category=projects|materials|notifications` (solo admin, multipart/form-data con campo `file`).

- Acepta JPG, PNG, WEBP. Rechaza otros formatos con 415.
- Tamaño máximo configurable con `MAX_UPLOAD_SIZE_MB` (10MB por defecto).
- Devuelve `{"url": "/media/projects/<uuid>.png"}` — esa URL se usa directo como
  `image_url` al crear/editar proyectos, materiales o notificaciones.
- Las imágenes se sirven desde `/media/...` (montado como archivos estáticos).

> En producción con múltiples instancias del backend, conviene mover el
> almacenamiento a un bucket (S3, Cloudflare R2, Supabase Storage) en vez del
> disco local, para que las imágenes no dependan de una sola instancia del servidor.
> El endpoint ya está aislado en `app/routers/uploads.py`, así que cambiar el
> backend de almacenamiento no afecta al resto de la API.

## Próximos pasos sugeridos

1. **Notificaciones push** para la PWA (Web Push API) cuando se crea una notificación de proyecto.
2. **Rate limiting** en `/auth/login` para evitar fuerza bruta.
3. **Tests automatizados** con pytest (la estructura ya es fácil de testear, como viste arriba).
4. **Almacenamiento en la nube** para imágenes (ver nota arriba) cuando pasen a producción con más de un servidor.
