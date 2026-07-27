# Despliegue seguro de DayFlow

Esta guía no contiene claves, contraseñas, tokens ni nombres de personas
reales. Los valores sensibles deben inyectarse desde un gestor de secretos o
desde un archivo `.env` legible únicamente por la cuenta del servicio.

## Configuración obligatoria

En producción:

- `DEBUG=False` y `ENABLE_API_DOCS=False`.
- `SECRET_KEY` y `JWT_SIGNING_KEY` deben ser aleatorias, tener al menos 50
  caracteres y ser diferentes.
- `ALLOWED_HOSTS` contiene únicamente el host del backend.
- `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS` contienen únicamente los
  orígenes HTTPS del frontend, sin comodines.
- `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`,
  `CSRF_COOKIE_SECURE` y `JWT_REFRESH_COOKIE_SECURE` quedan en `True`.
- `TRUST_X_FORWARDED_PROTO=True` solo cuando un proxy controlado elimina el
  encabezado recibido del cliente y establece su propio
  `X-Forwarded-Proto`.
- `CACHE_URL` apunta a Redis con autenticación y TLS cuando sale del host.
- Si MySQL es remoto, `DB_SSL_CA` apunta a la CA que valida su certificado.

Antes de iniciar el servicio:

```powershell
.\backend\.venv\Scripts\python.exe .\backend\manage.py check --deploy
.\backend\.venv\Scripts\python.exe .\backend\manage.py migrate --check
.\backend\.venv\Scripts\python.exe .\backend\manage.py collectstatic --noinput
```

Los checks `dayflow_security.*` convierten configuraciones inseguras en
errores de despliegue. No deben silenciarse.

## HTTPS, tokens y navegador

El proxy debe terminar TLS, redirigir HTTP a HTTPS y establecer límites de
cuerpo equivalentes a `REQUEST_MAX_MB`. HSTS comienza sin `preload` ni
subdominios; esas dos opciones se activan solo cuando todos los subdominios
estén permanentemente en HTTPS.

El access token vive únicamente en memoria JavaScript. El refresh token vive
en una cookie `HttpOnly`, `Secure`, con `SameSite=Lax` y ruta limitada a
`/api/v1/auth/`. Login, refresh, logout y cambio de contraseña rechazan
orígenes de navegador fuera de la lista CORS. Una política CSP debe
configurarse en el servidor que publica el frontend Vite, al menos con
`default-src 'self'`, `object-src 'none'`, `base-uri 'self'` y un
`connect-src` que incluya solo la API.

Todas las respuestas bajo `/api/` envían `Cache-Control: no-store` y
`Pragma: no-cache` para que datos de usuarios, tickets y métricas no queden en
cachés compartidas.

## Adjuntos y permisos

Django crea archivos con modo `0640` y directorios con `0750` en sistemas
POSIX. `backend/media/` no debe ser una ruta pública del proxy: las descargas
se realizan exclusivamente por el endpoint autenticado.

La API limita el archivo a `TICKET_ATTACHMENT_MAX_MB`, la petición completa a
`REQUEST_MAX_MB` y valida extensión, MIME declarado y firma básica. DOCX/XLSX
además rechazan ZIP cifrado, rutas ascendentes, demasiadas entradas y tamaño
expandido excesivo. En un entorno que reciba archivos de terceros se debe
añadir análisis antimalware asíncrono y cuarentena antes de entregar el
archivo.

En Windows, protege el `.env` desde una consola de la cuenta propietaria:

```powershell
$currentUserSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
icacls .env /inheritance:r
icacls .env /grant:r "*$($currentUserSid):(F)" "*S-1-5-18:(F)" "*S-1-5-32-544:(F)"
```

Verifica el resultado con `Get-Acl .env`; no ejecutes estas órdenes sobre una
carpeta compartida sin confirmar primero las cuentas de servicio necesarias.

## MySQL y copias de seguridad

Usa una cuenta de migración separada para DDL. La cuenta de ejecución necesita
solo `SELECT`, `INSERT`, `UPDATE` y `DELETE` sobre `dayflow_db.*`; no necesita
privilegios globales, `FILE`, `SUPER`, `CREATE USER` ni `GRANT OPTION`.
Confirma con:

```sql
SHOW GRANTS FOR 'dayflow_app'@'host_aprobado';
```

Las copias deben cifrarse, tener retención definida y almacenarse fuera del
servidor. Una copia lógica manual, solicitando la contraseña de forma
interactiva, puede generarse así:

```powershell
mysqldump --host=127.0.0.1 --user=dayflow_backup --password `
  --single-transaction --routines --triggers --no-tablespaces `
  --result-file="D:\DayFlowBackups\dayflow_YYYYMMDD_HHMMSS.sql" dayflow_db
```

La automatización debe usar un gestor de secretos, no una contraseña en la
línea de comandos. Prueba mensualmente la restauración en una base aislada y
registra RPO/RTO, hash, tamaño, fecha y resultado. Nunca restaures una prueba
sobre `dayflow_db`.

## Proceso, logs, datos personales y dependencias

No uses `runserver`. Desde `backend/`, Waitress puede ejecutarse detrás del
proxy:

```powershell
.\.venv\Scripts\waitress-serve.exe --listen=127.0.0.1:8000 config.wsgi:application
```

Los logs de aplicación se envían a consola, no habilitan SQL y redactan
Bearer, password, token, secret, Authorization, Cookie y DB password. El
recolector debe aplicar control de acceso y retención. No registres bodies,
adjuntos, correos ni nombres completos.

Usuarios, comentarios, adjuntos e historial contienen datos personales.
Define responsables, finalidad, plazo de retención, proceso de rectificación,
exportación y eliminación compatible con la obligación de auditoría. Cifra
backups y volúmenes, limita el acceso administrativo y evita usar datos reales
en pruebas.

Audita antes de cada release:

```powershell
.\backend\.venv\Scripts\python.exe -m pip check
.\backend\.venv\Scripts\python.exe -m pip_audit -r .\backend\requirements.txt
pnpm audit --prod --audit-level moderate
pnpm build
```

La paginación predeterminada es 20 y el máximo solicitado es 100. Las tasas
globales por usuario/anónimo y las tasas de autenticación son variables de
entorno; Redis debe ser compartido por todos los workers.
