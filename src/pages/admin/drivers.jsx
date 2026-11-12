import { UsersRound } from "lucide-react";
import Sidebar from "../../components/sidebar";

export default function Drivers() {
  return (
    <div className="admin-layout">
      <Sidebar />
      <main className="admin-main">
        <header className="admin-topbar">
          <div className="admin-heading">
            <p className="admin-eyebrow">TRANSPORT OPERATIONS</p>
            <h1>Driver directory</h1>
            <p>School, college, and company driver workspaces remain separate.</p>
          </div>
          <span className="admin-preview-badge">DATA SOURCE NOT CONNECTED</span>
        </header>
        <section className="admin-panel" aria-labelledby="driver-directory-title">
          <div className="admin-panel-heading">
            <h2 id="driver-directory-title">Driver records</h2>
            <p>Driver assignments and account records require an authorized directory service.</p>
          </div>
          <div className="admin-empty-state">
            <UsersRound size={25} strokeWidth={1.6} />
            <h3>No driver records available</h3>
            <p>Nothing is simulated here. Connect a driver data source to review separate school/college and company assignments.</p>
          </div>
        </section>
        <p className="admin-footer">Driver sign-in is protected by Supabase Auth and face verification; assignment services are not configured in this frontend preview.</p>
      </main>
    </div>
  );
}
