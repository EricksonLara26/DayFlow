import { useMemo, useState } from "react";
import { KeyRound, UserPlus, X } from "lucide-react";
import Button from "../../components/common/Button";
import LoadingButton from "../../components/common/LoadingButton";
import SearchInput from "../../components/common/SearchInput";
import UserForm from "../../components/users/UserForm";
import UserTable from "../../components/users/UserTable";
import { canCreateUser } from "../../config/permissions";
import { ROLES, getRoleLabel, getUserFullName } from "../../data/users";
import {
  FORM_MIN_LENGTHS,
  cleanField,
  confirmationError,
  getApiErrorMessage,
  getApiFieldErrors,
  minLengthError,
  requiredError,
} from "../../utils/formValidation";
import "./Users.css";

export default function Users({
  currentUser,
  onCreateUser,
  onDeactivateUser,
  onResetPassword,
  onUpdateUser,
  users,
}) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [resetForm, setResetForm] = useState({
    temporaryPassword: "",
    confirmPassword: "",
  });
  const [resetFieldErrors, setResetFieldErrors] = useState({});
  const [resetError, setResetError] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const canOpenUserForm = canCreateUser(currentUser);
  const departments = useMemo(
    () => [...new Set(users.map((user) => user.department).filter(Boolean))].sort(),
    [users],
  );
  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return users.filter((user) => {
      const searchableText = `${getUserFullName(user)} ${user.username} ${user.email}`.toLowerCase();
      const matchesSearch = !normalizedSearch || searchableText.includes(normalizedSearch);
      const matchesDepartment = departmentFilter === "ALL" || user.department === departmentFilter;
      const matchesRole = roleFilter === "ALL" || user.role === roleFilter;

      return matchesSearch && matchesDepartment && matchesRole;
    });
  }, [departmentFilter, roleFilter, search, users]);

  async function handleCreateUser(form) {
    const result = await onCreateUser(form);

    if (result?.ok === false) {
      return result;
    }

    setMessage(result?.message ?? "Usuario creado correctamente.");
    setIsUserFormOpen(false);
    return result;
  }

  async function handleUpdateUser(userId, form) {
    const result = await onUpdateUser(userId, form);

    if (result?.ok !== false) {
      setMessage(result?.message ?? "Usuario actualizado correctamente.");
    }

    return result;
  }

  function openPasswordReset(user) {
    setResetTargetUser(user);
    setResetForm({
      temporaryPassword: "",
      confirmPassword: "",
    });
    setResetError("");
    setResetFieldErrors({});
    setMessage("");
  }

  function closePasswordReset() {
    setResetTargetUser(null);
    setResetForm({
      temporaryPassword: "",
      confirmPassword: "",
    });
    setResetError("");
    setResetFieldErrors({});
    setIsResettingPassword(false);
  }

  function updateResetField(field, value) {
    setResetForm((current) => ({ ...current, [field]: value }));
    setResetFieldErrors((current) => {
      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
    setResetError("");
  }

  function validatePasswordReset() {
    const temporaryPassword = cleanField(resetForm.temporaryPassword);
    const confirmPassword = cleanField(resetForm.confirmPassword);
    const nextErrors = {};
    const temporaryRequired = requiredError(temporaryPassword, "La contraseña temporal", { feminine: true });
    const confirmRequired = requiredError(confirmPassword, "La confirmación", { feminine: true });

    if (temporaryRequired) {
      nextErrors.temporaryPassword = temporaryRequired;
    } else {
      const min = minLengthError(temporaryPassword, "La contraseña temporal", FORM_MIN_LENGTHS.password);

      if (min) {
        nextErrors.temporaryPassword = min;
      }
    }

    if (confirmRequired) {
      nextErrors.confirmPassword = confirmRequired;
    } else if (!nextErrors.temporaryPassword) {
      const confirmation = confirmationError(temporaryPassword, confirmPassword);

      if (confirmation) {
        nextErrors.confirmPassword = confirmation;
      }
    }

    return {
      errors: nextErrors,
      values: {
        confirmPassword,
        temporaryPassword,
      },
    };
  }

  async function handlePasswordResetSubmit(event) {
    event.preventDefault();

    if (isResettingPassword) {
      return { ok: false };
    }

    if (!resetTargetUser) {
      return { ok: false };
    }

    const { errors, values } = validatePasswordReset();

    if (Object.keys(errors).length) {
      setResetFieldErrors(errors);
      setResetError("Revisa los campos marcados antes de guardar.");
      return { ok: false };
    }

    if (!window.confirm(`¿Asignar una contraseña temporal a ${getUserFullName(resetTargetUser)}?`)) {
      return { ok: false };
    }

    setResetError("");
    setResetFieldErrors({});
    setIsResettingPassword(true);

    try {
      const result = await onResetPassword(resetTargetUser.id, values.temporaryPassword);

      if (result?.ok === false) {
        setResetFieldErrors(getApiFieldErrors(result));
        setResetError(getApiErrorMessage(result, "No se pudo asignar la contraseña temporal."));
        return result;
      }

      closePasswordReset();
      setMessage(result?.message ?? "Contraseña temporal asignada correctamente.");

      return result;
    } catch {
      setResetError("No se pudo asignar la contraseña temporal.");
      return { ok: false };
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleDeactivateUser(userId) {
    const result = await onDeactivateUser(userId);

    if (result?.ok !== false) {
      setMessage(result?.message ?? "Usuario desactivado correctamente.");
    }

    return result;
  }

  return (
    <div className="page-stack users-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Administración</p>
          <h2>Gestión de usuarios</h2>
        </div>
        <div className="users-page-actions">
          <strong>{users.length} usuario(s)</strong>
          {canOpenUserForm ? (
            <Button icon={UserPlus} onClick={() => setIsUserFormOpen(true)}>
              Agregar usuario
            </Button>
          ) : null}
        </div>
      </section>

      {message ? <p className="form-success">{message}</p> : null}

      {isUserFormOpen && canOpenUserForm ? (
        <div className="user-form-overlay" role="dialog" aria-modal="true" aria-labelledby="new-user-title">
          <div className="user-form-modal">
            <UserForm
              onCancel={() => setIsUserFormOpen(false)}
              onCreateUser={handleCreateUser}
              users={users}
            />
          </div>
        </div>
      ) : null}

      {resetTargetUser ? (
        <div className="user-form-overlay" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
          <div className="user-form-modal password-reset-modal">
            <form className="form-panel user-form password-reset-form" noValidate onSubmit={handlePasswordResetSubmit}>
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Seguridad</p>
                  <h2 id="reset-password-title">Asignar contraseña temporal</h2>
                </div>
                <KeyRound size={20} aria-hidden="true" />
              </div>
              <div className="reset-target-summary">
                <strong>{getUserFullName(resetTargetUser)}</strong>
                <span>{resetTargetUser.username}</span>
              </div>
              <label className="field">
                <span>Contraseña temporal</span>
                <input
                  aria-invalid={Boolean(resetFieldErrors.temporaryPassword)}
                  autoFocus
                  disabled={isResettingPassword}
                  type="password"
                  value={resetForm.temporaryPassword}
                  onChange={(event) => updateResetField("temporaryPassword", event.target.value)}
                />
                {resetFieldErrors.temporaryPassword ? (
                  <p className="field-error">{resetFieldErrors.temporaryPassword}</p>
                ) : null}
              </label>
              <label className="field">
                <span>Confirmar contraseña temporal</span>
                <input
                  aria-invalid={Boolean(resetFieldErrors.confirmPassword)}
                  disabled={isResettingPassword}
                  type="password"
                  value={resetForm.confirmPassword}
                  onChange={(event) => updateResetField("confirmPassword", event.target.value)}
                />
                {resetFieldErrors.confirmPassword ? (
                  <p className="field-error">{resetFieldErrors.confirmPassword}</p>
                ) : null}
              </label>
              {resetError ? <p className="form-error">{resetError}</p> : null}
              <div className="form-actions">
                <Button disabled={isResettingPassword} icon={X} variant="ghost" onClick={closePasswordReset}>
                  Cancelar
                </Button>
                <LoadingButton icon={KeyRound} loading={isResettingPassword} type="submit">
                  Guardar temporal
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <div className="users-layout">
        <section className="panel user-list-panel">
          <div className="section-heading">
            <h2>Usuarios registrados</h2>
            <span>{filteredUsers.length}</span>
          </div>
          <div className="user-filter-panel">
            <SearchInput
              className="small-search"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre"
            />
            <label className="field compact-field">
              <span>Rol</span>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                <option value={ROLES.ADMINISTRATOR}>{getRoleLabel(ROLES.ADMINISTRATOR)}</option>
                <option value={ROLES.TECHNICIAN}>{getRoleLabel(ROLES.TECHNICIAN)}</option>
                <option value={ROLES.EMPLOYEE}>{getRoleLabel(ROLES.EMPLOYEE)}</option>
              </select>
            </label>
            <label className="field compact-field">
              <span>Área/departamento</span>
              <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
                <option value="ALL">Todos</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <UserTable
            currentUser={currentUser}
            onDeactivateUser={handleDeactivateUser}
            onResetPassword={openPasswordReset}
            onUpdateUser={handleUpdateUser}
            users={filteredUsers}
          />
        </section>
      </div>
    </div>
  );
}
