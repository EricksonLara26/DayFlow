import {
  CalendarDays,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";

// Barra lateral: navegacion principal, selector de bloques y acciones de sesion.
export default function Sidebar({
  activeView,
  onChangeView,
  areas,
  activeArea,
  onAreaChange,
  newAreaName,
  onNewAreaName,
  onAddArea,
  onDeleteArea,
  user,
  onLogout,
}) {
  const userLabel = user.email || user.username || user.name;
  const navItems = [
    { label: "Inicio", icon: LayoutDashboard },
    { label: "Tareas", icon: ListTodo },
    { label: "Calendario", icon: CalendarDays },
  ];

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      <div className="brand">
        <img className="brand-logo" src="/dayflow-mark.png" alt="DayFlow" />
        <div>
          <strong>
            <span className="brand-name-dark">Day</span>
            <span className="brand-name-blue">Flow</span>
          </strong>
          <span>{userLabel}</span>
        </div>
      </div>

      <nav className="nav-list">
        {navItems.map((item) => (
          <button
            className={activeView === item.label ? "nav-item active" : "nav-item"}
            key={item.label}
            onClick={() => onChangeView(item.label)}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="area-switcher">
        <p className="eyebrow">Bloques</p>
        <button
          className={activeArea === "all" ? "area-chip active" : "area-chip"}
          onClick={() => onAreaChange("all")}
        >
          Todos
        </button>
        {areas.map((area) => (
          <div className="area-row" key={area.id}>
            <button
              className={activeArea === area.id ? "area-chip active" : "area-chip"}
              onClick={() => onAreaChange(area.id)}
            >
              <span className="area-dot" style={{ background: area.color }} />
              <span>{area.name}</span>
            </button>
            <button
              className="delete-area-button"
              type="button"
              aria-label={`Eliminar bloque ${area.name}`}
              title={`Eliminar bloque ${area.name}`}
              onClick={() => onDeleteArea(area.id)}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
        <form
          className="sidebar-create-block"
          onSubmit={(event) => {
            event.preventDefault();
            onAddArea();
          }}
        >
          <input
            value={newAreaName}
            onChange={(event) => onNewAreaName(event.target.value)}
            placeholder="Nuevo bloque"
            aria-label="Nombre del nuevo bloque"
          />
          <button className="icon-button" type="submit" aria-label="Crear bloque">
            <Plus size={17} />
          </button>
        </form>
      </div>

      <div className="sidebar-footer">
        <button
          className={activeView === "Ajustes" ? "nav-item active" : "nav-item"}
          onClick={() => onChangeView("Ajustes")}
        >
          <Settings size={18} />
          <span>Ajustes</span>
        </button>
        <button className="nav-item logout-button" onClick={onLogout}>
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  );
}
