import AccessDeniedState from "../../components/common/AccessDeniedState";
import "./AccessDenied.css";

export default function AccessDenied({ onGoHome }) {
  return (
    <div className="page-stack access-denied-page">
      <AccessDeniedState onGoHome={onGoHome} />
    </div>
  );
}
