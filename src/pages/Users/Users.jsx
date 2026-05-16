import { useMemo, useState } from "react";
import { UserPlus } from "lucide-react";
import Button from "../../components/common/Button";
import SearchInput from "../../components/common/SearchInput";
import UserForm from "../../components/users/UserForm";
import UserTable from "../../components/users/UserTable";
import { ROLES } from "../../data/users";
import "./Users.css";

export default function Users({ onCreateUser, onDeleteUser, onUpdateUserEmail, users }) {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const employees = users.filter((user) => user.role === ROLES.EMPLOYEE);
  const departments = useMemo(
    () => [...new Set(employees.map((user) => user.department).filter(Boolean))].sort(),
    [employees],
  );
  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return employees.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const matchesSearch = !normalizedSearch || fullName.includes(normalizedSearch);
      const matchesDepartment = departmentFilter === "ALL" || user.department === departmentFilter;

      return matchesSearch && matchesDepartment;
    });
  }, [departmentFilter, employees, search]);

  function handleCreateUser(form) {
    onCreateUser(form);
    setIsUserFormOpen(false);
  }

  return (
    <div className="page-stack users-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Gestion de usuarios</h2>
        </div>
        <div className="users-page-actions">
          <strong>{employees.length} empleado(s)</strong>
          <Button icon={UserPlus} onClick={() => setIsUserFormOpen(true)}>
            Agregar usuario
          </Button>
        </div>
      </section>

      {isUserFormOpen ? (
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
            <h2>Empleados registrados</h2>
            <span>{filteredEmployees.length}</span>
          </div>
          <div className="user-filter-panel">
            <SearchInput
              className="small-search"
              value={search}
              onChange={setSearch}
              placeholder="Buscar por nombre"
            />
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
          <UserTable onDeleteUser={onDeleteUser} onUpdateUserEmail={onUpdateUserEmail} users={filteredEmployees} />
        </section>
      </div>
    </div>
  );
}
