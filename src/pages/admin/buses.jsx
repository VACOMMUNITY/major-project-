import { BusFront } from "lucide-react";
import Sidebar from "../../components/sidebar";

export default function Buses() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-heading">
            <p className="admin-eyebrow">FLEET MANAGEMENT</p>
            <h1>Bus directory</h1>
            <p>Review vehicle assignments and service status.</p>
          </div>
          <span className="admin-preview-badge">DATA SOURCE NOT CONNECTED</span>
        </header>
        <section className="admin-panel" aria-labelledby="bus-directory-title">
          <div className="admin-panel-heading">
            <h2 id="bus-directory-title">Registered buses</h2>
            <p>Bus records will appear here when the fleet data service is connected.</p>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th scope="col">BUS NUMBER</th><th scope="col">DRIVER</th><th scope="col">ROUTE</th><th scope="col">STATUS</th></tr>
              </thead>
              <tbody>
                <tr><td className="admin-table-empty" colSpan="4">
                  <div className="admin-empty-state">
                    <BusFront size={24} strokeWidth={1.6} />
                    <h3>No bus records available</h3>
                    <p>This workspace has no connected bus data. Vehicle assignments and status will not be shown until a fleet service is configured.</p>
                  </div>
                </td></tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className="admin-footer">No vehicle records are stored in this frontend preview.</p>
      </main>
    </div>
  );
}
