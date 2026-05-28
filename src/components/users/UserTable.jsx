import { useState } from "react";
import { Check, KeyRound, Pencil, UserX, X } from "lucide-react";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";
import {
  canChangeUserRole,
  canDeactivateUser,
  canEditUser,
  canResetUserPassword,
} from "../../config/permissions";
import { ROLES, getRoleLabel, getUserFullName } from "../../data/users";

const editableRoles = [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE];

function getEditForm(user) {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    email: user.email ?? "",
    position: user.position ?? "",
    department: user.department ?? "",
    role: user.role,
  };
}

export default function UserTable({
  currentUser,
  onDeactivateUser,
  onResetPassword,
  onUpdateUser,
  users,
}) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState(getEditForm({}));
  const [error, setError] = useState("");

  if (!users.length) {
    return <EmptyState title="Sin usuarios" message="Los usuarios registrados se mostrarán aquí." />;
  }

  function updateField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
  }

  function startEditing(user) {
    if (!canEditUser(currentUser, user)) {
      return;
    }

    setEditingUserId(user.id);
    setEditForm(getEditForm(user));
    setError("");
  }

  function cancelEditing() {
    setEditingUserId(null);
    setEditForm(getEditForm({}));
    setError("");
  }

  function saveUser(user) {
    Promise.resolve(onUpdateUser(user.id, editForm))
      .then((result) => {
        if (result?.ok === false) {
          setError(result.message);
          return;
        }

        cancelEditing();
      })
      .catch(() => setError("No se pudo actualizar el usuario."));
  }

  function confirmDeactivate(user) {
    if (window.confirm("Desea desactivar este usuario?")) {
      Promise.resolve(onDeactivateUser(user.id)).catch(() => setError("No se pudo desactivar el usuario."));
    }
  }

  return (
    <div className="table-wrap">
      <table className="data-table user-management-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
            <th>Cargo</th>
            <th>Área/departamento</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const isEditing = editingUserId === user.id;
            const canEdit = canEditUser(currentUser, user);
            const canChangeRole = canChangeUserRole(currentUser) && currentUser.id !== user.id;
            const canDeactivate = canDeactivateUser(currentUser, user);
            const canResetPassword = canResetUserPassword(currentUser, user);
            const hasActions = canEdit || canResetPassword || canDeactivate;

            return (
              <tr key={user.id}>
                <td>
                  {isEditing ? (
                    <div className="user-edit-grid">
                      <input
                        aria-label={`Nombre de ${getUserFullName(user)}`}
                        value={editForm.firstName}
                        onChange={(event) => updateField("firstName", event.target.value)}
                      />
                      <input
                        aria-label={`Apellido de ${getUserFullName(user)}`}
                        value={editForm.lastName}
                        onChange={(event) => updateField("lastName", event.target.value)}
                      />
                    </div>
                  ) : (
                    <strong>{getUserFullName(user)}</strong>
                  )}
                </td>
                <td>{user.username}</td>
                <td>
                  {isEditing ? (
                    <input
                      aria-label={`Correo de ${getUserFullName(user)}`}
                      className="table-inline-input"
                      type="email"
                      value={editForm.email}
                      onChange={(event) => updateField("email", event.target.value)}
                    />
                  ) : (
                    user.email
                  )}
                </td>
                <td>
                  {isEditing && canChangeRole ? (
                    <select
                      aria-label={`Rol de ${getUserFullName(user)}`}
                      className="table-inline-input"
                      value={editForm.role}
                      onChange={(event) => updateField("role", event.target.value)}
                    >
                      {editableRoles.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    getRoleLabel(user.role)
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      aria-label={`Cargo de ${getUserFullName(user)}`}
                      className="table-inline-input"
                      value={editForm.position}
                      onChange={(event) => updateField("position", event.target.value)}
                    />
                  ) : (
                    user.position
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <input
                      aria-label={`Departamento de ${getUserFullName(user)}`}
                      className="table-inline-input"
                      value={editForm.department}
                      onChange={(event) => updateField("department", event.target.value)}
                    />
                  ) : (
                    user.department
                  )}
                </td>
                <td>
                  <span className={`user-status-pill ${user.active === false ? "inactive" : "active"}`}>
                    {user.active === false ? "Inactivo" : "Activo"}
                  </span>
                </td>
                <td>
                  <div className="user-row-actions">
                    {isEditing ? (
                      <>
                        <Button
                          aria-label={`Guardar usuario ${getUserFullName(user)}`}
                          className="user-icon-button user-save-button"
                          icon={Check}
                          title="Guardar usuario"
                          variant="ghost"
                          onClick={() => saveUser(user)}
                        />
                        <Button
                          aria-label={`Cancelar edición de ${getUserFullName(user)}`}
                          className="user-icon-button user-cancel-button"
                          icon={X}
                          title="Cancelar"
                          variant="ghost"
                          onClick={cancelEditing}
                        />
                      </>
                    ) : (
                      <>
                        {canEdit ? (
                          <Button
                            aria-label={`Editar usuario ${getUserFullName(user)}`}
                            className="user-icon-button user-edit-button"
                            icon={Pencil}
                            title="Editar usuario"
                            variant="ghost"
                            onClick={() => startEditing(user)}
                          />
                        ) : null}
                        {canResetPassword ? (
                          <Button
                            aria-label={`Asignar contraseña temporal de ${getUserFullName(user)}`}
                            className="user-icon-button user-reset-button"
                            icon={KeyRound}
                            title="Asignar contraseña temporal"
                            variant="ghost"
                            onClick={() => onResetPassword(user)}
                          />
                        ) : null}
                        {canDeactivate ? (
                          <Button
                            aria-label={`Desactivar usuario ${getUserFullName(user)}`}
                            className="user-icon-button user-delete-button"
                            icon={UserX}
                            title="Desactivar usuario"
                            variant="ghost"
                            onClick={() => confirmDeactivate(user)}
                          />
                        ) : null}
                        {!hasActions ? <span className="muted-note">Sin acciones</span> : null}
                      </>
                    )}
                  </div>
                  {isEditing && error ? <p className="table-row-error">{error}</p> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
