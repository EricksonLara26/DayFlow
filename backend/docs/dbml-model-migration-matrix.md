# Matriz DBML -> modelo -> migración

Estado revisado antes y después de aplicar migraciones a `dayflow_db`.

## Auditoría previa a `migrate` - 2026-07-27

Fuente comparada: las tres páginas de `diagramaV4.pdf`, revisadas mediante
extracción de texto y renderizado visual.

| Tabla DBML | Columnas, nulabilidad y únicos | Modelo | Migración / SQL MySQL | Constraints, índices y FK | Resultado |
| --- | --- | --- | --- | --- | --- |
| `roles` | 5 columnas; `code` NN y UNIQUE | `catalogs.Role` | `catalogs.0001_initial` crea `roles` | CHECK de los tres códigos canónicos; índice `(active, code)` | Coincide; extras exigidos y justificados |
| `departments` | 6 columnas; `description` NULL; `name` NN y UNIQUE | `catalogs.Department` | `catalogs.0001_initial` crea `departments` | CHECK de nombre no vacío; índice `(active, name)` | Coincide; extras justificados |
| `categories` | 6 columnas; `description` NULL; `name` NN y UNIQUE | `catalogs.Category` | `catalogs.0001_initial` crea `categories` | CHECK de nombre no vacío; índice `(active, name)` | Coincide; extras justificados |
| `users` | 14 columnas; `last_login` y `job_position` NULL; `username` y `email` UNIQUE | `accounts.User` | `accounts.0001_initial` crea `users` | FK a `roles` y `departments`; sin columnas extra de permisos | Coincide |
| `tickets` | 14 columnas; técnico, toma, cierre y vencimiento NULL | `tickets.Ticket` | `tickets.0001_initial` crea `tickets` | 11 índices; 7 CHECK; 4 FK protegidas | Coincide; extras exigidos y justificados |
| `ticket_comments` | 6 columnas NN | `tickets.TicketComment` | `tickets.0001_initial` crea `ticket_comments` | 2 índices; CHECK de mensaje; FK a ticket, usuario y rol | Coincide; extras justificados |
| `ticket_history` | 5 columnas NN | `tickets.TicketHistory` | `tickets.0001_initial` crea `ticket_history` | 3 índices; CHECK de acción; FK a ticket y actor | Coincide; extras justificados |
| `ticket_history_changes` | 5 columnas; valores anterior y nuevo NULL | `tickets.TicketHistoryChange` | `tickets.0001_initial` crea `ticket_history_changes` | Índice `(history_id, field_code)`; 2 CHECK; FK a historial | Coincide; extras justificados |
| `ticket_attachments` | 9 columnas; `description` NULL; `storage_path` NN y UNIQUE | `tickets.TicketAttachment` | `tickets.0001_initial` crea `ticket_attachments` | 2 índices; 3 CHECK; FK a ticket y usuario | Coincide; extras justificados |

### Resultado de los comandos

- `makemigrations --check --dry-run --verbosity 2`: `No changes detected`.
- `sqlmigrate catalogs 0001`: crea `roles`, `departments` y `categories`,
  incluidos uniques, CHECK e índices.
- `sqlmigrate catalogs 0002`: es una operación Python reversible que carga
  los códigos `ADMINISTRATOR`, `TECHNICIAN` y `EMPLOYEE`; no tiene SQL estático.
- `sqlmigrate accounts 0001`: crea `users` y sus dos FK.
- `sqlmigrate tickets 0001`: crea las cinco tablas de tickets con sus
  constraints, índices y doce FK.
- `sqlmigrate auth 0001`: la operación `Create model User` aparece como
  `-- (no-op)` debido a `AUTH_USER_MODEL = "accounts.User"`; no crea
  `auth_user`.
- `migrate --plan`: revisado sin ejecutar operaciones.
- `check --database default`: cero errores y una advertencia conocida
  `mysql.W003`, explicada en la sección de adjuntos.

### Dependencias y tablas administradas

El orden de negocio es:

1. `catalogs.0001_initial`: crea los tres catálogos.
2. `catalogs.0002_seed_canonical_roles`: carga los roles canónicos.
3. `accounts.0001_initial`: crea el usuario personalizado y depende de la
   carga de roles.
4. `tickets.0001_initial`: depende de catálogos y de
   `swappable_dependency(settings.AUTH_USER_MODEL)`.

Las migraciones internas de `contenttypes`, `auth`, `admin` y `sessions`
forman su propio grafo de dependencias y Django las administra
automáticamente.

Los nueve modelos de negocio tienen `managed=True`,
`router.allow_migrate_model(...)=True` y una operación `CreateModel` en sus
migraciones iniciales. No existen `RunSQL`, `SeparateDatabaseAndState` ni
modelos `managed=False` en `accounts`, `catalogs` o `tickets`. La introspección
previa de `dayflow_db` devolvió `existing_tables=[]`: Django no esperaba
ninguna tabla creada manualmente.

## Cobertura de las nueve tablas

| Tabla DBML | Modelo Django | Migración | Estado |
| --- | --- | --- | --- |
| `roles` | `catalogs.Role` | `catalogs.0001_initial` | Implementada |
| `departments` | `catalogs.Department` | `catalogs.0001_initial` | Implementada |
| `categories` | `catalogs.Category` | `catalogs.0001_initial` | Implementada |
| `users` | `accounts.User` | `accounts.0001_initial` | Implementada |
| `tickets` | `tickets.Ticket` | `tickets.0001_initial` | Implementada |
| `ticket_comments` | `tickets.TicketComment` | `tickets.0001_initial` | Implementada |
| `ticket_history` | `tickets.TicketHistory` | `tickets.0001_initial` | Implementada |
| `ticket_history_changes` | `tickets.TicketHistoryChange` | `tickets.0001_initial` | Implementada |
| `ticket_attachments` | `tickets.TicketAttachment` | `tickets.0001_initial` | Implementada |

## roles

| Campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `id bigint PK NN` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `code varchar(32) UNIQUE NN` | `CharField(max_length=32, unique=True)` | `varchar(32) COLLATE utf8mb4_bin NOT NULL UNIQUE` | Coincide; comparación binaria explícita |
| `active boolean NN` | `BooleanField(default=True)` | `bool NOT NULL` | Coincide |
| `created_at datetime(6) NN` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |
| `updated_at datetime(6) NN` | `DateTimeField(auto_now=True)` | `datetime(6) NOT NULL` | Coincide |

La restricción `roles_code_canonical_ck` admite exclusivamente
`ADMINISTRATOR`, `TECHNICIAN` y `EMPLOYEE`. La migración
`catalogs.0002_seed_canonical_roles` carga esos tres registros como activos.
Las etiquetas españolas de `TextChoices` son metadatos visuales y no se
persisten en `roles.code`.

## departments y categories

Ambas tablas siguen el mismo contrato de campos:

| Campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `id bigint PK NN` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `name varchar(150) UNIQUE NN` | `CharField(max_length=150, unique=True)` | `varchar(150) COLLATE utf8mb4_0900_ai_ci NOT NULL UNIQUE` | Coincide |
| `description text NULL` | `TextField(blank=True, null=True)` | `longtext NULL` | Compatible; adaptación estándar de Django/MySQL |
| `active boolean NN` | `BooleanField(default=True)` | `bool NOT NULL` | Coincide |
| `created_at datetime(6) NN` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |
| `updated_at datetime(6) NN` | `DateTimeField(auto_now=True)` | `datetime(6) NOT NULL` | Coincide |

La estrategia de comparación normaliza espacios y usa
`utf8mb4_0900_ai_ci`: la unicidad no distingue mayúsculas ni acentos. La
eliminación lógica cambia `active` a `false`; Django Admin no ofrece borrado
físico.

## users

| Campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `id bigint PK NN` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `first_name varchar(150) NN` | `CharField(max_length=150)` | `varchar(150) NOT NULL` | Coincide |
| `last_name varchar(150) NN` | `CharField(max_length=150)` | `varchar(150) NOT NULL` | Coincide |
| `username varchar(150) UNIQUE NN` | `CharField(max_length=150, unique=True)` | `varchar(150) NOT NULL UNIQUE` | Coincide |
| `email varchar(254) UNIQUE NN` | `EmailField(max_length=254, unique=True)` | `varchar(254) NOT NULL UNIQUE` | Coincide |
| `password varchar(128) NN` | Heredado de `AbstractBaseUser` | `varchar(128) NOT NULL` | Coincide; contiene hash Django |
| `last_login datetime(6) NULL` | Heredado de `AbstractBaseUser` | `datetime(6) NULL` | Coincide |
| `role_id bigint NN` | `ForeignKey(Role, PROTECT)` | `bigint NOT NULL` y FK a `roles(id)` | Coincide |
| `department_id bigint NN` | `ForeignKey(Department, PROTECT)` | `bigint NOT NULL` y FK a `departments(id)` | Coincide |
| `job_position varchar(150) NULL` | `position`, con `db_column="job_position"` | `varchar(150) NULL` | Coincide en MySQL |
| `active boolean NN` | `BooleanField(default=True)` | `bool NOT NULL` | Coincide |
| `must_change_password boolean NN` | `BooleanField(default=True)` | `bool NOT NULL` | Coincide |
| `created_at datetime(6) NN` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |
| `updated_at datetime(6) NN` | `DateTimeField(auto_now=True)` | `datetime(6) NOT NULL` | Coincide |

`active` es la columna física; `is_active`, `is_staff` e `is_superuser` son
propiedades de compatibilidad. `PermissionsMixin` no añade columnas de grupos,
permisos o superusuario al esquema aprobado.

## tickets

| Campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `id bigint PK NN` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `title varchar(200) NN` | `CharField(max_length=200)` | `varchar(200) NOT NULL` | Coincide |
| `description text NN` | `TextField()` | `longtext NOT NULL` | Compatible |
| `category_id bigint NN` | `ForeignKey(Category, PROTECT)` | `bigint NOT NULL` y FK a `categories(id)` | Coincide |
| `status ticket_status NN` | `CharField` con `TicketStatus` | `varchar(20) NOT NULL` y `tickets_status_valid` | Dominio equivalente |
| `priority ticket_priority NN` | `CharField` con `TicketPriority` | `varchar(8) NOT NULL` y `tickets_priority_valid` | Dominio equivalente |
| `requester_id bigint NN` | `ForeignKey(User, PROTECT)` | `bigint NOT NULL` y FK a `users(id)` | Coincide |
| `assigned_technician_id bigint NULL` | `ForeignKey(User, PROTECT, null=True)` | `bigint NULL` y FK a `users(id)` | Coincide |
| `requester_department_id bigint NN` | `ForeignKey(Department, PROTECT)` | `bigint NOT NULL` y FK a `departments(id)` | Coincide |
| `created_at datetime(6) NN` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |
| `updated_at datetime(6) NN` | `DateTimeField(auto_now=True)` | `datetime(6) NOT NULL` | Coincide |
| `taken_at datetime(6) NULL` | `DateTimeField(null=True)` | `datetime(6) NULL` | Coincide |
| `closed_at datetime(6) NULL` | `DateTimeField(null=True)` | `datetime(6) NULL` | Coincide |
| `due_date date NULL` | `DateField(null=True)` | `date NULL` | Coincide |

Los estados persistidos son exactamente `OPEN`, `IN_PROGRESS`, `ON_HOLD`,
`COMPLETED` y `DISMISSED`. Las prioridades persistidas son `LOW`, `MEDIUM`,
`HIGH` y `CRITICAL`.

Los índices de `tickets` cubren estado, prioridad, solicitante, técnico,
categoría, departamento, vencimiento y las fechas de creación, actualización,
toma y cierre. Los índices compuestos priorizan el filtro habitual y luego la
fecha o el estado.

## ticket_comments

| Campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `id bigint PK NN` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `ticket_id bigint NN` | `ForeignKey(Ticket, PROTECT)` | `bigint NOT NULL` y FK a `tickets(id)` | Coincide |
| `author_id bigint NN` | `ForeignKey(User, PROTECT)` | `bigint NOT NULL` y FK a `users(id)` | Coincide |
| `author_role_id bigint NN` | `ForeignKey(Role, PROTECT)` | `bigint NOT NULL` y FK a `roles(id)` | Coincide |
| `message text NN` | `TextField()` | `longtext NOT NULL` | Compatible |
| `created_at datetime(6) NN` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |

`author_role_id` se copia del rol del autor al crear el comentario, por lo que
conserva el contexto histórico aunque el usuario cambie de rol.

## ticket_history y ticket_history_changes

| Tabla y campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `ticket_history.id` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `ticket_history.ticket_id` | `ForeignKey(Ticket, PROTECT)` | `bigint NOT NULL` y FK | Coincide |
| `ticket_history.action_code varchar(64)` | `CharField(max_length=64)` | `varchar(64) NOT NULL` | Coincide |
| `ticket_history.actor_id` | `ForeignKey(User, PROTECT)` | `bigint NOT NULL` y FK | Coincide |
| `ticket_history.created_at` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |
| `ticket_history_changes.id` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `ticket_history_changes.history_id` | `ForeignKey(TicketHistory, PROTECT)` | `bigint NOT NULL` y FK | Coincide |
| `ticket_history_changes.field_code varchar(64)` | `CharField(max_length=64)` | `varchar(64) NOT NULL` | Coincide |
| `ticket_history_changes.old_value text NULL` | `TextField(null=True)` | `longtext NULL` | Compatible |
| `ticket_history_changes.new_value text NULL` | `TextField(null=True)` | `longtext NULL` | Compatible |

`action_code` conserva un vocabulario extensible. El tipo de evento y la
etiqueta legible se derivan en Python; no se inventan columnas `event_type` ni
`action`. Los cambios de estado, prioridad, asignación y marcas de tiempo se
guardan como filas en `ticket_history_changes`.

## ticket_attachments

| Campo DBML | Modelo Django | SQL de `sqlmigrate` | Resultado |
| --- | --- | --- | --- |
| `id bigint PK NN` | `BigAutoField` | `bigint AUTO_INCREMENT NOT NULL PRIMARY KEY` | Coincide |
| `ticket_id bigint NN` | `ForeignKey(Ticket, PROTECT)` | `bigint NOT NULL` y FK a `tickets(id)` | Coincide |
| `uploaded_by_id bigint NN` | `ForeignKey(User, PROTECT)` | `bigint NOT NULL` y FK a `users(id)` | Coincide |
| `file_name varchar(255) NN` | `CharField(max_length=255)` | `varchar(255) NOT NULL` | Coincide |
| `storage_path varchar(500) UNIQUE NN` | `FileField(max_length=500, unique=True)` | `varchar(500) NOT NULL UNIQUE` | Coincide |
| `mime_type varchar(255) NN` | `CharField(max_length=255)` | `varchar(255) NOT NULL` | Coincide |
| `size_bytes bigint NN` | `BigIntegerField()` | `bigint NOT NULL` | Coincide |
| `description text NULL` | `TextField(null=True)` | `longtext NULL` | Compatible |
| `created_at datetime(6) NN` | `DateTimeField(auto_now_add=True)` | `datetime(6) NOT NULL` | Coincide |

`FileField` guarda únicamente la ruta relativa en `storage_path`; el archivo se
almacena bajo `MEDIA_ROOT`. La ruta usa UUID para evitar colisiones, mientras
`file_name` conserva el nombre original.

Django emite `mysql.W003` porque una cadena única supera 255 caracteres. Se
mantiene `VARCHAR(500) UNIQUE` porque es el contrato aprobado. Con `utf8mb4`
consume como máximo 2000 bytes de índice, dentro del límite de 3072 bytes de
InnoDB en la configuración MySQL 8 revisada.

## Reglas de negocio y protección histórica

- `create_ticket()` exige solicitante activo, departamento y categoría activa;
  copia el departamento del solicitante en `requester_department`.
- `take_ticket()` bloquea la fila con `select_for_update()` y admite solo un
  usuario activo con rol activo `TECHNICIAN`.
- Los cambios de estado y prioridad actualizan marcas de tiempo e historial en
  una misma transacción.
- Comentarios y adjuntos generan entradas de historial.
- Las FK históricas usan `PROTECT`; el SQL crea claves foráneas sin cascada.
- El admin de tickets es de solo lectura para impedir cambios que omitan los
  servicios transaccionales y su auditoría.
- No existen columnas `created_by_name`, `assigned_to_name` ni `author_name`.

Las restricciones simples de base de datos validan valores canónicos, textos
no vacíos, tamaño no negativo, coherencia de cierre, orden temporal y que cada
cambio histórico tenga al menos un valor. Las reglas entre usuarios, roles,
catálogos, transiciones y snapshots permanecen en `tickets.services`.

## Diferencias deliberadas de Django

1. Django representa `TextField` como `LONGTEXT` en MySQL. Conserva
   nulabilidad y semántica, con mayor capacidad que `TEXT`.
2. Los enums del DBML se implementan como `VARCHAR` más `CHECK`, porque
   `TextChoices` mantiene integración con formularios, serializers y Python sin
   perder el conjunto permitido en MySQL.
3. `PROTECT` actúa en el ORM y las FK SQL se crean sin cascada; MySQL restringe
   el borrado de filas referenciadas.
4. Los valores `default` son valores de aplicación. `sqlmigrate` confirma que
   no se agregan cláusulas `DEFAULT` permanentes no declaradas en el DBML.
5. Django crea tablas internas de administración, sesiones, contenido y
   permisos. No son tablas de negocio del DBML.

## Verificación y estado de aplicación

- `manage.py check`: sin errores. Con `--database default` conserva únicamente
  la advertencia justificada `mysql.W003` de `storage_path`.
- `manage.py makemigrations --check --dry-run`: sin cambios pendientes.
- `manage.py sqlmigrate tickets 0001`: revisado; crea las cinco tablas, FK,
  índices y restricciones descritos.
- Pruebas de `accounts`, `catalogs` y `tickets`: 51 aprobadas con SQLite en
  memoria para no requerir privilegios de creación de una base MySQL de prueba.
- `catalogs.0001_initial`: aplicada.
- `catalogs.0002_seed_canonical_roles`: aplicada.
- `catalogs.0003_seed_approved_catalogs`: aplicada.
- `accounts.0001_initial`: aplicada.
- `tickets.0001_initial`: aplicada.
- Las migraciones internas de Django también están aplicadas.

Conteos confirmados en `dayflow_db`:

| Entidad | Total |
| --- | ---: |
| Roles | 3 |
| Categorías | 8 |
| Departamentos | 5 |
| Usuarios | 1 |
| Administradores | 1 |
| Tickets, comentarios, historial, cambios y adjuntos | 0 |

La función de `catalogs.0003_seed_approved_catalogs` se ejecutó una segunda vez
para comprobar idempotencia: los conteos permanecieron `(3, 8, 5)`.

## Comprobación desde MySQL Workbench

Conectar a `127.0.0.1:3306` con el usuario `dayflow_app`, usando la contraseña
configurada localmente, y ejecutar:

```sql
USE dayflow_db;

SHOW TABLES;

SELECT app, name, applied
FROM django_migrations
WHERE app IN ('catalogs', 'accounts', 'tickets')
ORDER BY applied;

SELECT COUNT(*) AS roles FROM roles;
SELECT COUNT(*) AS categories FROM categories;
SELECT COUNT(*) AS departments FROM departments;
SELECT COUNT(*) AS users FROM users;

SELECT code, active
FROM roles
ORDER BY id;

SELECT id, name, active
FROM categories
ORDER BY id;

SELECT id, name, active
FROM departments
ORDER BY id;

SELECT id, username, email, role_id, department_id, active
FROM users
ORDER BY id;

SHOW CREATE TABLE users;
SHOW CREATE TABLE tickets;
SHOW CREATE TABLE ticket_history_changes;
```

Las consultas omiten deliberadamente `users.password`.
