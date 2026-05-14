import { sortTechniciansByCompletedTickets } from "../../utils/ticketUtils";

export default function TechnicianRanking({ technicians }) {
  return (
    <section className="panel ranking-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>Gestion por tecnico</h2>
        </div>
      </div>
      <div className="ranking-list">
        {sortTechniciansByCompletedTickets(technicians).map((technician, index) => {
          const completed = technician.completedTickets ?? 0;
          const dismissed = technician.dismissedTickets ?? 0;

          return (
            <article className="ranking-item" key={technician.id}>
              <span className="ranking-position">{index + 1}</span>
              <div>
                <strong>{technician.firstName} {technician.lastName}</strong>
                <span>{completed} completados - {dismissed} desestimados</span>
              </div>
              <b>{completed + dismissed}</b>
            </article>
          );
        })}
      </div>
    </section>
  );
}
