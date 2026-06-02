import { useState } from "react";
import TechnicianReportPanel from "../../components/reports/TechnicianReportPanel";
import "../InformationPanel/InformationPanel.css";

export default function Reports({ onAuthorizeReport, tickets, users }) {
  const [reportCount, setReportCount] = useState(0);

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
        onAuthorizeReport={onAuthorizeReport}
        onReportCountChange={setReportCount}
        tickets={tickets}
        users={users}
      />
    </div>
  );
}
