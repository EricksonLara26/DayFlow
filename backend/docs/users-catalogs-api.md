# API de usuarios y catálogos de DayFlow

Base: `/api/v1/`. Todas las rutas requieren JWT y que
`must_change_password` sea `false`.

Las listas usan paginación:

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": []
}
```

El tamaño predeterminado es 20. `page_size` permite hasta 100 registros.

## Usuarios

Rutas:

- `GET/POST users/`
- `GET/PUT/PATCH users/{id}/`
- `POST users/{id}/deactivate/`
- `POST users/{id}/reset-password/`

No existe una operación `DELETE`.

Filtros de `GET users/`:

- `search`: nombre, apellido, username, correo o posición.
- `role`: `ADMINISTRATOR`, `TECHNICIAN`, `EMPLOYEE` o `ALL`.
- `department`: ID de departamento o `ALL`.
- `is_active`: `true`, `false` o `ALL`.
- `ordering`: `username`, `first_name`, `last_name` o `created_at`;
  se admite el prefijo `-`.

Solo los administradores listan y crean usuarios. Un administrador consulta
y edita cualquier usuario; un técnico consulta y edita solamente empleados.
Solo un administrador desactiva usuarios y nunca puede desactivarse a sí
mismo. Administradores y técnicos pueden restablecer contraseñas de acuerdo
con la matriz actual del frontend: el técnico únicamente sobre empleados
activos, y ningún actor sobre sí mismo.

La creación acepta usuarios `EMPLOYEE` o `TECHNICIAN`. Los administradores
se crean exclusivamente mediante `createsuperuser`.

Restablecimiento de contraseña:

```json
{
  "temporary_password": "ContraseñaTemporal!937",
  "confirm_password": "ContraseñaTemporal!937"
}
```

Ambos campos son `write_only`. La operación utiliza el hash y los validadores
de Django, activa `must_change_password` y revoca los refresh existentes.

## Departamentos y categorías

Rutas equivalentes:

- `GET/POST departments/`
- `GET/PUT/PATCH departments/{id}/`
- `POST departments/{id}/deactivate/`
- `POST departments/{id}/activate/`
- `GET/POST categories/`
- `GET/PUT/PATCH categories/{id}/`
- `POST categories/{id}/deactivate/`
- `POST categories/{id}/activate/`

Todo usuario autenticado puede listar y consultar elementos activos para
formularios. La creación, edición, activación y desactivación requieren rol
`ADMINISTRATOR`.

Las listas aceptan `search`. Un administrador también puede usar
`active=true`, `active=false` o `active=all`; sin este parámetro la lista
devuelve solamente activos.

No existen rutas `DELETE`. La desactivación cambia únicamente `active`, por
lo que las relaciones protegidas desde usuarios, tickets e historial
permanecen intactas.
