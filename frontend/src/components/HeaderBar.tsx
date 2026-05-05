import { NavLink } from "react-router-dom";

export function HeaderBar() {
  return (
    <header className="app-header">
      <div className="sim-shell">
        <div className="topbar">
          <div className="topbar-main">
            <div className="profile-block">
              <span className="avatar">FS</span>
              <div>
                <p className="welcome-copy">Welcome back</p>
                <h1>FieldSense</h1>
              </div>
            </div>

            <nav className="top-nav" aria-label="Primary navigation">
              <NavLink to="/" end className={({ isActive }) => (isActive ? "is-active" : "")}>
                Home
              </NavLink>
              <NavLink to="/simulate" className={({ isActive }) => (isActive ? "is-active" : "")}>
                Simulation
              </NavLink>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
