import { Activity, BusFront, MapPinned, UsersRound } from "lucide-react";
import Sidebar from "../../components/sidebar";
import IndiaMap from "../../components/IndiaMap";

const metrics = [
  { title: "Fleet overview", icon: BusFront },
  { title: "Driver directory", icon: UsersRound },
  { title: "Route information", icon: MapPinned },
  { title: "Operations status", icon: Activity },
];

export default function Dashboard() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-heading">
            <p className="admin-eyebrow">INTELLIBUS · BATCH B2324</p>
            <h1>Transport overview</h1>
            <p>Manage the moving parts of your transport operation.</p>
          </div>
          <span className="admin-preview-badge">DATA SOURCE NOT CONNECTED</span>
        </header>

        <section className="admin-metric-grid" aria-label="Transport data availability">
          {metrics.map(({ title, icon: Icon }) => (
            <article className="admin-metric" key={title}>
              <div className="admin-metric-top">
                <span className="admin-metric-label">{title}</span>
                <span className="admin-metric-icon"><Icon size={17} /></span>
              </div>
              <strong className="admin-metric-value">—</strong>
              <span className="admin-metric-detail">Connect an authorized data source</span>
            </article>
          ))}
        </section>

        <section className="admin-panel" aria-labelledby="admin-map-title">
          <div className="admin-panel-heading">
            <h2 id="admin-map-title">Fleet activity</h2>
            <p>Live vehicle positions appear here when an authorized GPS and route service is connected.</p>
          </div>
          <div className="admin-map-content">
            <IndiaMap />
            <div className="admin-map-empty-state">
              <MapPinned size={20} strokeWidth={1.6} />
              <p>No fleet feed or assigned routes are configured. No vehicle position is being simulated.</p>
            </div>
          </div>
        </section>

        <p className="admin-footer">Admin interface preview · Fleet, route, and driver data require a connected backend.</p>
      </main>
    </div>
  );
}
