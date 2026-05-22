# DayFlow - Frontend Status Checklist

Fecha de revision: 2026-05-22

## Alcance de la revision

- Revision general del frontend actual sin cambios funcionales.
- Validacion por build, tests existentes, servidor dev local e inspeccion de codigo.
- Congelamiento documental del estado antes de iniciar integracion con Django + MySQL.

## Resultado tecnico

- Build de produccion: OK (`pnpm build`).
- Tests automatizados: OK (`pnpm test -- --runInBand`), 7 suites y 65 tests pasando.
- Servidor dev: OK, `http://127.0.0.1:5173/` respondio HTTP 200 durante la verificacion.
- Observacion de entorno: un intento de `pnpm dev` dentro del sandbox fallo con `spawn EPERM`; ejecutado fuera del sandbox, el servidor local respondio correctamente.
- Estado git antes de documentar: limpio.

## Flujos demo que funcionan

- Login por rol: funciona con usuarios mock y permisos por rol (`ADMINISTRADOR`, `TECNICO`, `EMPLEADO`). El login acepta usuario, correo o nombre completo, valida password y rechaza usuarios inactivos.
- Empleado crea ticket: funciona. El empleado puede abrir "Crear solicitud", enviar titulo/descripcion/categoria/prioridad, crear un ticket abierto sin tecnico asignado y quedar en la pantalla de detalle.
- Tecnico toma ticket: funciona. Un tecnico puede tomar tickets abiertos sin asignar; el ticket queda asignado al tecnico, cambia a `IN_PROGRESS` y registra historial.
- Tecnico cambia estado: funciona. Desde el detalle puede cambiar entre `IN_PROGRESS`, `ON_HOLD`, `COMPLETED` y `DISMISSED` segun permisos y asignacion.
- Tecnico cierra ticket: funciona. `COMPLETED` y `DISMISSED` se tratan como estados terminales, asignan `completedAt` y bloquean acciones tecnicas posteriores.
- Administrador gestiona usuarios: funciona. El administrador puede crear usuarios, editar datos, cambiar roles de otros usuarios, restablecer passwords y desactivar usuarios activos.
- Dashboard muestra metricas: funciona. Calcula totales por estado, vencimientos proximos y ranking de tecnicos con datos mock.
- Reportes funcionan: funcionan para administrador desde las vistas de reportes/panel de informacion, con exportacion XLSX cliente-side por tecnico y ano.
- Navegacion principal: funciona por hash routes y permisos por rol. El acceso denegado se muestra cuando una vista no corresponde al rol.

## Flujos con deuda tecnica

- No hay pruebas E2E completas que recorran login -> crear ticket -> tomar -> cambiar estado -> cerrar -> reportar. La validacion actual combina unit tests, service tests, build y lectura de codigo.
- No existe rol `SUPERVISOR`. La gestion de usuarios esta disponible para `ADMINISTRADOR`; si Supervisor es un rol real, falta modelarlo en permisos, navegacion y datos.
- La vista `REPORTS` existe y tiene permiso para administrador, pero no aparece como item directo en la navegacion principal. El reporte tambien vive dentro del panel de informacion.
- El estado de tickets y usuarios vive en memoria React. Los cambios se pierden al recargar, salvo auth/preferencias en `localStorage`.
- La creacion de ticket no captura `dueDate`, aunque las tablas y detalles muestran fecha limite. Los tickets nuevos quedan con "Sin fecha".
- Las acciones tecnicas permiten auto-asignar un ticket sin tecnico si se cambia estado desde el detalle. Conviene decidir si backend debe exigir "tomar ticket" antes de cambiar estado.
- La exportacion XLSX esta implementada en el cliente con un generador propio; falta cobertura automatizada del archivo descargado.
- No hay capa API/adaptador HTTP separada para auth, tickets, usuarios y reportes. La migracion a backend requerira extraer contratos y manejar loading/error reales.

## Bugs detectados

- Cambio de password: en `src/App.jsx`, `changePassword` detecta password actual incorrecto pero no retorna error dentro del bloque `if (!fullUser || currentPassword !== fullUser.password)`. Resultado: se puede cambiar la password aunque la actual sea incorrecta.

## Riesgos antes de Django + MySQL

- Permisos y roles deben validarse server-side; el frontend actual confia en estado local.
- Los enums de roles, estados, prioridades y categorias deben alinearse con modelos/choices de Django.
- La toma de tickets necesita control de concurrencia para evitar que dos tecnicos tomen el mismo ticket.
- El esquema de tickets debe definir campos obligatorios, especialmente `dueDate`, `assignedTo`, `takenAt`, `completedAt`, comentarios e historial.
- Hay que definir si reportes se generan en frontend o backend. Para MySQL/Django puede convenir endpoint de reporte y descarga server-side.
- La sesion actual usa `localStorage`; para backend hay que decidir JWT/session cookie, refresh, expiracion y logout real.
- Las mutaciones actuales son sincronas en memoria; con API se necesitan estados de carga, errores, reintentos y rollback/optimistic UI donde aplique.

## Estado general para Django + MySQL

Estado: parcialmente preparado.

La app esta estable como demo frontend y compila correctamente. La base de permisos, rutas, modelos mock y componentes principales es util para definir contratos de backend. Para conectar Django + MySQL sin romper flujos, primero conviene formalizar API schemas y agregar pruebas de flujo antes de reemplazar el estado local.

## Recomendacion de siguiente paso

1. Congelar este baseline como referencia.
2. Corregir el bug de cambio de password antes de exponer autenticacion real.
3. Definir contrato backend: usuarios, roles, tickets, comentarios, historial, reportes y permisos.
4. Agregar pruebas E2E smoke para los flujos demo principales.
5. Introducir una capa de servicios/API conservando la UI actual, y luego conectar Django + MySQL por partes.

## Comandos ejecutados

- `git status --short`
- `rg --files`
- `pnpm build`
- `pnpm test -- --runInBand`
- `pnpm dev -- --port 5173 --strictPort`
- `Invoke-WebRequest http://127.0.0.1:5173/`
