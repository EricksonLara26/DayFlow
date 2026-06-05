import { useState } from "react";
import AccessDeniedState from "../../components/common/AccessDeniedState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import TechnicianReportPanel from "../../components/reports/TechnicianReportPanel";
import "../InformationPanel/InformationPanel.css";

export default function Reports({
  canDownloadReports = false,
  error = "",
  isLoading = false,
  onAuthorizeReport,
  onRetry,
  tickets,
  users,
}) {
  const [reportCount, setReportCount] = useState(0);

  if (isLoading) {
    return (
      <div className="page-stack information-page">
        <LoadingState title="Cargando reportes" message="Estamos preparando los datos de informes." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack information-page">
        <ErrorState title="No se pudieron cargar los reportes" message={error} onRetry={onRetry} />
      </div>
    );
  }

  if (!canDownloadReports) {
    return (
      <div className="page-stack information-page">
        <AccessDeniedState
          message="Solo las cuentas autorizadas pueden consultar y descargar informes administrativos."
          title="No tienes permiso para ver reportes."
        />
      </div>
    );
  }

  return (
    <div className="page-stack information-page">
      <section className="panel page-intro">
        <div>
          <p className="eyebrow">Informes administrativos</p>
          <h2>Descarga de informes por técnico</h2>
        </div>
        <strong>{reportCount} ticket(s)</strong>
      </section>

      <TechnicianReportPanel
        canDownloadReports={canDownloadReports}
        onAuthorizeReport={onAuthorizeReport}
        onReportCountChange={setReportCount}
        tickets={tickets}
        users={users}
      />
    </div>
  );
}
