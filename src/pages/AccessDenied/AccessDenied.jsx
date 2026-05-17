import { ShieldAlert } from "lucide-react";
import Button from "../../components/common/Button";
import "./AccessDenied.css";

export default function AccessDenied({ onGoHome }) {
  return (
    <div className="page-stack access-denied-page">
      <section className="panel access-denied-panel">
        <div className="access-denied-icon" aria-hidden="true">
          <ShieldAlert size={34} />
        </div>
        <div>
          <p className="eyebrow">Acceso denegado</p>
          <h2>No tienes permisos para acceder a esta sección.</h2>
          <p className="muted-note">
            Tu rol actual no tiene acceso visual ni funcional a esta parte del sistema.
          </p>
        </div>
        <Button onClick={onGoHome}>Volver al inicio</Button>
      </section>
    </div>
  );
}
