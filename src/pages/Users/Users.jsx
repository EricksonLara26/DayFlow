import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import Button from "../../components/common/Button";
import SearchInput from "../../components/common/SearchInput";
import UserForm from "../../components/users/UserForm";
import UserTable from "../../components/users/UserTable";
import { canCreateUser } from "../../config/permissions";
import { ROLES, getRoleLabel, getUserFullName } from "../../data/users";
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

  function handleCreateUser(form) {
    const result = onCreateUser(form);

    if (result?.ok === false) {
      return result;
    }

    setMessage(result?.message ?? "Usuario creado correctamente.");
    setIsUserFormOpen(false);
    return result;
  }

  function handleUpdateUser(userId, form) {
    const result = onUpdateUser(userId, form);

    if (result?.ok !== false) {
      setMessage(result?.message ?? "Usuario actualizado correctamente.");
    }

    return result;
  }

  function handleResetPassword(userId) {
    const result = onResetPassword(userId);

    if (result?.ok !== false) {
      setMessage(result?.message ?? "Contrase\u00f1a restablecida correctamente.");
    }

    return result;
  }

  function handleDeactivateUser(userId) {
    const result = onDeactivateUser(userId);

    if (result?.ok !== false) {
      setMessage(result?.message ?? "Usuario desactivado correctamente.");
    }

    return result;
  }

  return (
    <div className="page-stack users-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Gestion de usuarios</h2>
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
              <span>Area/departamento</span>
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
            onResetPassword={handleResetPassword}
            onUpdateUser={handleUpdateUser}
            users={filteredUsers}
          />
        </section>
      </div>
    </div>
  );
}
