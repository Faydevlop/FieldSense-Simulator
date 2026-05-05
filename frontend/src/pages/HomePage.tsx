import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="sim-shell app-frame home-frame">
      <section className="home-hero">
        <p className="home-hero__eyebrow">Home</p>
        <h2>Go check your plant simulation</h2>
        <p>
          Track daily growth, tune water and sunlight levels, and watch how your plant responds over time.
        </p>
        <Link className="btn btn-primary home-hero__cta" to="/simulate">
          Open Simulation
        </Link>
      </section>

      <section className="home-grid">
        <article className="home-tile">
          <h3>Run Daily Scenarios</h3>
          <p>Test low, medium, and high care levels and compare results day by day.</p>
        </article>
        <article className="home-tile">
          <h3>See Visual Growth Stages</h3>
          <p>Healthy, stressed, and dead states shift with stage-specific plant images.</p>
        </article>
        <article className="home-tile">
          <h3>Review Observation Logs</h3>
          <p>Read a timeline of growth deltas, condition snapshots, and applied state notes.</p>
        </article>
      </section>
    </div>
  );
}
