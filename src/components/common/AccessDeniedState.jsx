import { ShieldAlert } from "lucide-react";
import Button from "./Button";

export default function AccessDeniedState({
  actionLabel = "Volver al inicio",
  message = "Tu rol actual no tiene acceso visual ni funcional a esta parte del sistema.",
  onGoHome,
  title = "No tienes permisos para acceder a esta seccion.",
}) {
  return (
    <section className="panel access-denied-panel" role="alert">
      <div className="access-denied-icon" aria-hidden="true">
        <ShieldAlert size={34} />
      </div>
      <div>
        <p className="eyebrow">Acceso denegado</p>
        <h2>{title}</h2>
        <p className="muted-note">{message}</p>
      </div>
      {onGoHome ? <Button onClick={onGoHome}>{actionLabel}</Button> : null}
    </section>
  );
}
