import EmptyState from "../common/EmptyState";
import { getRoleLabel } from "../../data/users";

export default function UserTable({ users }) {
  if (!users.length) {
    return <EmptyState title="Sin usuarios" message="Los empleados creados se mostraran aqui." />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Rol</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.firstName} {user.lastName}</strong>
              </td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{getRoleLabel(user.role)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
