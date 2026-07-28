# DayFlow

DayFlow es una aplicación de gestión interna de tickets. El repositorio contiene:

- frontend React 19 + Vite;
- API Django REST Framework bajo `/api/v1/`;
- autenticación JWT con refresh en cookie `HttpOnly`;
- persistencia MySQL en `dayflow_db`;
- roles canónicos `ADMINISTRATOR`, `TECHNICIAN` y `EMPLOYEE`.

Los componentes trabajan en `camelCase`; la API conserva `snake_case` y los
mappers de `src/services/mappers.js` realizan la conversión en la frontera.

## Requisitos verificados

El cierre técnico del 27 de julio de 2026 se ejecutó con:

- Python 3.14.3;
- Django 5.2.16;
- MySQL 8.0.46;
- MySQL Workbench 8.0.47;
- Node.js 24.14.0;
- pnpm 11.1.1.

Usa versiones compatibles con `backend/requirements.txt`, `package.json` y
`pnpm-lock.yaml`. No reemplaces pnpm por npm.

## Preparación desde PowerShell

Todos los comandos de esta guía parten de la raíz del repositorio.

### 1. Variables de entorno

El mismo `.env` de la raíz sirve a Django y Vite:

```powershell
if (-not (Test-Path .\.env)) {
    Copy-Item .\.env.example .\.env
}
notepad .\.env
```

Reemplaza todos los valores `CHANGE_ME...`. No copies contraseñas, tokens ni
claves reales al repositorio. Como mínimo configura:

```dotenv
SECRET_KEY=<CLAVE_DJANGO_ALEATORIA>
JWT_SIGNING_KEY=<CLAVE_JWT_ALEATORIA_DISTINTA>
DB_NAME=dayflow_db
DB_USER=dayflow_app
DB_PASSWORD=<CONTRASENA_MYSQL_LOCAL>
DB_HOST=127.0.0.1
DB_PORT=3306
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Para desarrollo HTTP local conserva `DEBUG=True`, cookies seguras desactivadas
y solo los orígenes `http://127.0.0.1:5173` y
`http://localhost:5173`. Para producción revisa
[deployment-security.md](backend/docs/deployment-security.md).

### 2. Backend

Crear y activar el entorno virtual no modifica pnpm ni `node_modules`:

```powershell
py -m venv .\backend\.venv
.\backend\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r .\backend\requirements.txt
```

Comprobar la configuración, aplicar migraciones y crear el primer administrador:

```powershell
python .\backend\manage.py check
python .\backend\manage.py migrate
python .\backend\manage.py createsuperuser
```

`createsuperuser` solicita los datos de forma interactiva y guarda la
contraseña con el hash de Django. No crees administradores mediante SQL.

Iniciar la API:

```powershell
python .\backend\manage.py runserver 127.0.0.1:8000
```

Con `ENABLE_API_DOCS=True`, la documentación local queda disponible en:

- `http://127.0.0.1:8000/api/v1/docs/`;
- `http://127.0.0.1:8000/api/v1/redoc/`;
- `http://127.0.0.1:8000/api/v1/schema/`.

### 3. Frontend

En otra terminal PowerShell:

```powershell
pnpm install
pnpm dev
```

Abrir `http://127.0.0.1:5173/`. El frontend obtiene usuarios, catálogos,
tickets y autenticación desde la API; no existen credenciales de demostración
en esta guía.

## MySQL

La aplicación espera una base `dayflow_db` con `utf8mb4` y un usuario de
aplicación `dayflow_app`. La creación del usuario y sus privilegios debe
hacerla un administrador de MySQL desde Workbench; usa una contraseña
administrada fuera de Git.

El usuario de aplicación necesita los permisos DML y DDL indispensables para
ejecutar las migraciones del proyecto sobre `dayflow_db`, pero no privilegios
globales ni `GRANT OPTION`.

Comprobación desde MySQL Workbench:

1. Conectar a `127.0.0.1:3306` con la conexión local autorizada.
2. Abrir `Schemas` y actualizar `dayflow_db`.
3. Ejecutar `SHOW TABLES FROM dayflow_db;`.
4. Usar `Database > Reverse Engineer`, elegir `dayflow_db` y revisar las nueve
   tablas de negocio.
5. Comparar el resultado con
   [dbml-model-migration-matrix.md](backend/docs/dbml-model-migration-matrix.md).

Nunca incluyas `users.password` en consultas de evidencia o capturas.

## Pruebas y verificación

Suite Django aislada:

```powershell
Push-Location .\backend
.\.venv\Scripts\python.exe manage.py test --settings=config.settings_test
Pop-Location
```

Checks y migraciones pendientes contra la configuración local:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py check
.\backend\.venv\Scripts\python.exe .\backend\manage.py makemigrations --check --dry-run
.\backend\.venv\Scripts\python.exe .\backend\manage.py migrate --check
```

Suite y build del frontend:

```powershell
pnpm test -- --runInBand
pnpm build
```

Comprobación previa a despliegue:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py check --deploy
```

En producción este último comando exige una `CACHE_URL` de Redis compartida
para que el throttling funcione igual en todos los workers. HSTS solo debe
activarse después de confirmar HTTPS en todos los dominios y subdominios.

## Estructura

```text
backend/
  accounts/      usuarios, autenticación y permisos
  analytics/     métricas derivadas y reportes
  catalogs/      roles, departamentos y categorías
  config/        settings, URLs y configuración transversal
  docs/          OpenAPI, pruebas, seguridad y matriz DBML
  tickets/       tickets, comentarios, historial y adjuntos
  manage.py
src/
  components/
  config/
  context/
  hooks/
  mocks/         fixtures usadas exclusivamente por pruebas
  pages/
  routes/
  services/      cliente HTTP, tokens, mappers y servicios API
  test/          servidor API simulado para pruebas de frontend
```

`localStorage` se limita a preferencias visuales. `sessionStorage` contiene
solo una caché sanitizada del usuario autenticado; el access token vive en
memoria y el refresh token se gestiona mediante cookie `HttpOnly`. MySQL y la
API son la fuente de verdad de los datos de negocio.

## Documentación técnica

- [OpenAPI](backend/docs/openapi.yaml)
- [Guía de pruebas de API](backend/docs/api-testing.md)
- [Matriz DBML, modelos y migraciones](backend/docs/dbml-model-migration-matrix.md)
- [Informe integral por rol](backend/docs/integral-role-test-report.md)
- [Seguridad de despliegue](backend/docs/deployment-security.md)
- [Cierre técnico](backend/docs/technical-close-report.md)
