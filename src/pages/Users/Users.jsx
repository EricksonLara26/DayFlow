import UserForm from "../../components/users/UserForm";
import UserTable from "../../components/users/UserTable";
import { ROLES } from "../../data/users";
import "./Users.css";

export default function Users({ onCreateUser, users }) {
  const employees = users.filter((user) => user.role === ROLES.EMPLOYEE);

  return (
    <div className="page-stack users-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Administracion</p>
          <h2>Gestión de Usuarios</h2>
        </div>
        <strong>{employees.length} empleado(s)</strong>
      </section>

      <UserForm onCreateUser={onCreateUser} users={users} />
      <section className="panel">
        <div className="section-heading">
          <h2>Empleados creados</h2>
        </div>
        <UserTable users={employees} />
      </section>
    </div>
  );
}
