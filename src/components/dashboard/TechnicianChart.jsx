import { sortTechniciansByCompletedTickets } from "../../utils/ticketUtils";

export default function TechnicianChart({ technicians }) {
  const sortedTechnicians = sortTechniciansByCompletedTickets(technicians);
  const maxValue = Math.max(1, ...sortedTechnicians.map((technician) => technician.completedTickets ?? 0));

  return (
    <section className="panel chart-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Solicitudes completadas</p>
          <h2>Tecnicos ordenados de menor a mayor</h2>
        </div>
      </div>
      <div className="bar-chart">
        {sortedTechnicians.map((technician) => {
          const completed = technician.completedTickets ?? 0;
          const width = `${Math.max(8, (completed / maxValue) * 100)}%`;

          return (
            <div className="bar-row" key={technician.id}>
              <span>{technician.firstName} {technician.lastName}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width }}>
                  <strong>{completed}</strong>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
