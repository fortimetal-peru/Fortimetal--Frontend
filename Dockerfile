FROM python:3.12-slim

WORKDIR /code

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY ./app ./app
COPY ./alembic ./alembic
COPY ./alembic.ini .

EXPOSE 8000

# Railway (y la mayoría de PaaS) inyectan el puerto real a usar en la variable de
# entorno $PORT, y varía en cada deploy — por eso no se puede hardcodear "--port 8000"
# como antes. Con shell form ("CMD algo $VAR", sin corchetes) el contenedor sí expande
# la variable de entorno; con la forma exec (con corchetes) NO se expande y el server
# fallaría al arrancar. En local (docker-compose, sin $PORT seteada) cae al 8000 de siempre.
#
# Antes de levantar el servidor, corre las migraciones de Alembic — así la base de
# datos queda al día en cada deploy sin intervención manual (ver alembic/).
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
