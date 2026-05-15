import { sortTechniciansByCompletedTickets } from "../../utils/ticketUtils";

export default function TechnicianRanking({ technicians }) {
  const rankedTechnicians = sortTechniciansByCompletedTickets(technicians).sort((first, second) => {
    const firstTotal = (first.completedTickets ?? 0) + (first.dismissedTickets ?? 0);
    const secondTotal = (second.completedTickets ?? 0) + (second.dismissedTickets ?? 0);

    return secondTotal - firstTotal || first.firstName.localeCompare(second.firstName);
  });

  return (
    <section className="panel ranking-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>Tickets por tecnico</h2>
        </div>
      </div>
      <div className="ranking-list">
        {rankedTechnicians.map((technician, index) => {
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
