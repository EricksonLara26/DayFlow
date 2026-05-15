import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import Button from "../common/Button";
import EmptyState from "../common/EmptyState";

export default function UserTable({ onDeleteUser, onUpdateUserEmail, users }) {
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingEmail, setEditingEmail] = useState("");
  const [error, setError] = useState("");

  if (!users.length) {
    return <EmptyState title="Sin usuarios" message="Los empleados registrados se mostraran aqui." />;
  }

  function confirmDelete(user) {
    if (window.confirm("Esta seguro de que desea eliminar este usuario?")) {
      onDeleteUser(user.id);
    }
  }

  function startEditing(user) {
    setEditingUserId(user.id);
    setEditingEmail(user.email);
    setError("");
  }

  function cancelEditing() {
    setEditingUserId(null);
    setEditingEmail("");
    setError("");
  }

  function saveEmail(user) {
    const result = onUpdateUserEmail(user.id, editingEmail);

    if (result?.ok === false) {
      setError(result.message);
      return;
    }

    cancelEditing();
  }

  function handleEmailKeyDown(event, user) {
    if (event.key === "Enter") {
      event.preventDefault();
      saveEmail(user);
    }

    if (event.key === "Escape") {
      cancelEditing();
    }
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
              <td>
                {editingUserId === user.id ? (
                  <div className="email-edit-cell">
                    <input
                      aria-label={`Correo de ${user.firstName} ${user.lastName}`}
                      type="email"
                      value={editingEmail}
                      onChange={(event) => setEditingEmail(event.target.value)}
                      onKeyDown={(event) => handleEmailKeyDown(event, user)}
                    />
                    {error ? <span>{error}</span> : null}
                  </div>
                ) : (
                  user.email
                )}
              </td>
              <td>{user.jobTitle}</td>
              <td>{user.department}</td>
              <td>
                <div className="user-row-actions">
                  {editingUserId === user.id ? (
                    <>
                      <Button
                        aria-label={`Guardar correo de ${user.firstName} ${user.lastName}`}
                        className="user-icon-button user-save-button"
                        icon={Check}
                        title="Guardar correo"
                        variant="ghost"
                        onClick={() => saveEmail(user)}
                      />
                      <Button
                        aria-label={`Cancelar edicion de correo de ${user.firstName} ${user.lastName}`}
                        className="user-icon-button user-cancel-button"
                        icon={X}
                        title="Cancelar"
                        variant="ghost"
                        onClick={cancelEditing}
                      />
                    </>
                  ) : (
                    <Button
                      aria-label={`Editar correo de ${user.firstName} ${user.lastName}`}
                      className="user-icon-button user-edit-button"
                      icon={Pencil}
                      title="Editar correo"
                      variant="ghost"
                      onClick={() => startEditing(user)}
                    />
                  )}
                  <Button
                    aria-label={`Borrar usuario ${user.firstName} ${user.lastName}`}
                    className="user-icon-button user-delete-button"
                    icon={Trash2}
                    title="Borrar usuario"
                    variant="ghost"
                    onClick={() => confirmDelete(user)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
