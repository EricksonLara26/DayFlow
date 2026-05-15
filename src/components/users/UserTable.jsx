import { Trash2 } from "lucide-react";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";

export default function UserTable({ onDeleteUser, users }) {
  if (!users.length) {
    return <EmptyState title="Sin usuarios" message="Los empleados registrados se mostraran aqui." />;
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Cargo</th>
            <th>Area/departamento</th>
            <th>Acciones</th>
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
              <td>{user.jobTitle}</td>
              <td>{user.department}</td>
              <td>
                <Button icon={Trash2} variant="ghost" onClick={() => onDeleteUser(user.id)}>
                  Eliminar
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
