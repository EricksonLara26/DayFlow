import EmptyState from "../common/EmptyState";

export default function TechnicianRanking({ technicians = [] }) {
  return (
    <section className="panel ranking-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Ranking</p>
          <h2>Cierres por técnico</h2>
        </div>
      </div>
      {technicians.length ? (
        <div className="ranking-list">
          {technicians.map((technician, index) => {
            const completed = technician.completedTickets ?? 0;
            const technicianName =
              technician.technicianName ?? `${technician.firstName ?? ""} ${technician.lastName ?? ""}`.trim();

            return (
              <article className="ranking-item" key={technician.technicianId ?? technician.id}>
                <span className="ranking-position">{index + 1}</span>
                <div>
                  <strong>{technicianName}</strong>
                  <span>Solicitudes completadas</span>
                </div>
                <b>{completed}</b>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="Sin técnicos registrados"
          message="El ranking se mostrará cuando existan técnicos activos en el sistema."
        />
      )}
    </section>
  );
}
