export default function StatCard({ icon: Icon, label, tone = "blue", value }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <span className="stat-icon">{Icon ? <Icon size={20} aria-hidden="true" /> : null}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    </article>
  );
}
