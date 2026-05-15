import { sortTechniciansByCompletedTickets } from "../../utils/ticketUtils";
import EmptyState from "../common/EmptyState";

export default function TechnicianRanking({ technicians }) {
  const rankedTechnicians = sortTechniciansByCompletedTickets(technicians).filter(
    (technician) => (technician.completedTickets ?? 0) > 0,
  );

  return (
    <section className="panel ranking-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>Cierres por tecnico</h2>
        </div>
      </div>
      {rankedTechnicians.length ? (
        <div className="ranking-list">
          {rankedTechnicians.map((technician, index) => {
            const completed = technician.completedTickets ?? 0;

            return (
              <article className="ranking-item" key={technician.id}>
                <span className="ranking-position">{index + 1}</span>
                <div>
                  <strong>{technician.firstName} {technician.lastName}</strong>
                  <span>Solicitudes completadas</span>
                </div>
                <b>{completed}</b>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Sin cierres completados"
          message="El ranking se activara cuando existan solicitudes con estado completado."
        />
      )}
    </section>
  );
}
