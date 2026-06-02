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
import { getDepartmentNamesSnapshot } from "../../services/departmentService";
import {
  FORM_MIN_LENGTHS,
  allowedValueError,
  cleanField,
  emailError,
  getApiErrorMessage,
  getApiFieldErrors,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";

const editableRoles = [ROLES.ADMINISTRATOR, ROLES.TECHNICIAN, ROLES.EMPLOYEE];
const departmentNames = getDepartmentNamesSnapshot();

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

function validateEditForm(form, { canChangeRole }) {
  const values = {
    firstName: cleanField(form.firstName),
    lastName: cleanField(form.lastName),
    email: cleanField(form.email).toLowerCase(),
    position: cleanField(form.position),
    department: cleanField(form.department),
    role: form.role,
  };
  const nextErrors = {};

  [
    ["firstName", values.firstName, "El nombre", FORM_MIN_LENGTHS.name],
    ["lastName", values.lastName, "El apellido", FORM_MIN_LENGTHS.name],
    ["position", values.position, "El cargo", FORM_MIN_LENGTHS.position],
  ].forEach(([field, value, label, minLength]) => {
    const required = requiredError(value, label);
    const min = required ? "" : minLengthError(value, label, minLength);
    const fieldError = required || min;

    if (fieldError) {
      nextErrors[field] = fieldError;
    }
  });

  const emailValidation = emailError(values.email);

  if (emailValidation) {
    nextErrors.email = emailValidation;
  }

  const departmentRequired = requiredError(values.department, "El departamento");
  const departmentValidation = departmentRequired || allowedValueError(values.department, departmentNames, "El departamento");

  if (departmentValidation) {
    nextErrors.department = departmentValidation;
  }

  if (canChangeRole) {
    const roleValidation = allowedValueError(values.role, editableRoles, "El rol");

    if (roleValidation) {
      nextErrors.role = roleValidation;
    }
  }

  return { errors: nextErrors, values };
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
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [loadingAction, setLoadingAction] = useState("");

  if (!users.length) {
    return <EmptyState title="Sin usuarios" message="Los usuarios registrados se mostrarán aquí." />;
  }

  function updateField(field, value) {
    setEditForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setError("");
  }

  function startEditing(user) {
    if (!canEditUser(currentUser, user)) {
      return;
    }

    setEditingUserId(user.id);
    setEditForm(getEditForm(user));
    setFieldErrors({});
    setError("");
  }

  function cancelEditing() {
    setEditingUserId(null);
    setEditForm(getEditForm({}));
    setFieldErrors({});
    setError("");
    setLoadingAction("");
  }

  function saveUser(user) {
    const canChangeRole = canChangeUserRole(currentUser) && currentUser.id !== user.id;
    const { errors, values } = validateEditForm(editForm, { canChangeRole });

    if (loadingAction) {
      return;
    }

    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError("Revisa los campos marcados antes de guardar.");
      return;
    }

    setFieldErrors({});
    setError("");
    setLoadingAction(`save-${user.id}`);

    Promise.resolve(onUpdateUser(user.id, values))
      .then((result) => {
        if (result?.ok === false) {
          setFieldErrors(getApiFieldErrors(result));
          setError(getApiErrorMessage(result, "No se pudo actualizar el usuario."));
          return;
        }

        cancelEditing();
      })
      .catch(() => setError("No se pudo actualizar el usuario."))
      .finally(() => setLoadingAction(""));
  }

  function confirmDeactivate(user) {
    if (!window.confirm(`¿Deseas desactivar al usuario ${getUserFullName(user)}? Esta acción limita su acceso.`)) {
      return;
    }

    setLoadingAction(`deactivate-${user.id}`);
    Promise.resolve(onDeactivateUser(user.id))
      .then((result) => {
        if (result?.ok === false) {
          setError(getApiErrorMessage(result, "No se pudo desactivar el usuario."));
        }
      })
      .catch(() => setError("No se pudo desactivar el usuario."))
      .finally(() => setLoadingAction(""));
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
            const isSaving = loadingAction === `save-${user.id}`;
            const isDeactivating = loadingAction === `deactivate-${user.id}`;
            const isProcessing = Boolean(loadingAction);
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
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-label={`Nombre de ${getUserFullName(user)}`}
                        disabled={isSaving}
                        value={editForm.firstName}
                        onChange={(event) => updateField("firstName", event.target.value)}
                      />
                      {fieldErrors.firstName ? <p className="table-row-error">{fieldErrors.firstName}</p> : null}
                      <input
                        aria-invalid={Boolean(fieldErrors.lastName)}
                        aria-label={`Apellido de ${getUserFullName(user)}`}
                        disabled={isSaving}
                        value={editForm.lastName}
                        onChange={(event) => updateField("lastName", event.target.value)}
                      />
                      {fieldErrors.lastName ? <p className="table-row-error">{fieldErrors.lastName}</p> : null}
                    </div>
                  ) : (
                    <strong>{getUserFullName(user)}</strong>
                  )}
                </td>
                <td>{user.username}</td>
                <td>
                  {isEditing ? (
                    <>
                      <input
                        aria-invalid={Boolean(fieldErrors.email)}
                        aria-label={`Correo de ${getUserFullName(user)}`}
                        className="table-inline-input"
                        disabled={isSaving}
                        type="email"
                        value={editForm.email}
                        onChange={(event) => updateField("email", event.target.value)}
                      />
                      {fieldErrors.email ? <p className="table-row-error">{fieldErrors.email}</p> : null}
                    </>
                  ) : (
                    user.email
                  )}
                </td>
                <td>
                  {isEditing && canChangeRole ? (
                    <>
                      <select
                        aria-invalid={Boolean(fieldErrors.role)}
                        aria-label={`Rol de ${getUserFullName(user)}`}
                        className="table-inline-input"
                        disabled={isSaving}
                        value={editForm.role}
                        onChange={(event) => updateField("role", event.target.value)}
                      >
                        {editableRoles.map((role) => (
                          <option key={role} value={role}>
                            {getRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.role ? <p className="table-row-error">{fieldErrors.role}</p> : null}
                    </>
                  ) : (
                    getRoleLabel(user.role)
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <>
                      <input
                        aria-invalid={Boolean(fieldErrors.position)}
                        aria-label={`Cargo de ${getUserFullName(user)}`}
                        className="table-inline-input"
                        disabled={isSaving}
                        value={editForm.position}
                        onChange={(event) => updateField("position", event.target.value)}
                      />
                      {fieldErrors.position ? <p className="table-row-error">{fieldErrors.position}</p> : null}
                    </>
                  ) : (
                    user.position
                  )}
                </td>
                <td>
                  {isEditing ? (
                    <>
                      <select
                        aria-invalid={Boolean(fieldErrors.department)}
                        aria-label={`Departamento de ${getUserFullName(user)}`}
                        className="table-inline-input"
                        disabled={isSaving}
                        value={editForm.department}
                        onChange={(event) => updateField("department", event.target.value)}
                      >
                        <option value="">Selecciona un departamento</option>
                        {departmentNames.map((department) => (
                          <option key={department} value={department}>
                            {department}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.department ? <p className="table-row-error">{fieldErrors.department}</p> : null}
                    </>
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
                          loading={isSaving}
                          loadingText=""
                          title="Guardar usuario"
                          variant="ghost"
                          onClick={() => saveUser(user)}
                        />
                        <Button
                          aria-label={`Cancelar edición de ${getUserFullName(user)}`}
                          className="user-icon-button user-cancel-button"
                          disabled={isSaving}
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
                            disabled={isProcessing}
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
                            disabled={isProcessing}
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
                            disabled={isProcessing}
                            icon={UserX}
                            loading={isDeactivating}
                            loadingText=""
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
