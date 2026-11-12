import { BusFront, LayoutDashboard, LogOut, ShieldCheck, UsersRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { signOut as signOutSupabase } from "../../ui/assets/face-auth.js";

const menus = [
  { name: "Overview", icon: LayoutDashboard, path: "/admin" },
  { name: "Buses", icon: BusFront, path: "/buses" },
  { name: "Drivers", icon: UsersRound, path: "/drivers" },
];

export default function Sidebar() {
  const location = useLocation();

  async function signOut() {
    try {
      await signOutSupabase();
      for (const key of Object.keys(sessionStorage)) {
        if (key.startsWith("intellibus.demo.")) sessionStorage.removeItem(key);
      }
      window.location.assign("/");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Sign out failed.");
    }
  }

  return (
    <aside className="admin-sidebar">
      <a className="admin-brand" href="/" aria-label="IntelliBus home">
        <span className="admin-brand-mark"><BusFront size={19} /></span>
        <span>Intelli<span>Bus</span></span>
      </a>
      <p className="admin-sidebar-caption">TRANSPORT OPERATIONS</p>
      <nav className="admin-nav" aria-label="Admin navigation">
        {menus.map(({ name, icon: Icon, path }) => (
          <Link
            aria-current={location.pathname === path ? "page" : undefined}
            className="admin-nav-link"
            key={path}
            to={path}
          >
            <Icon size={17} strokeWidth={1.8} />
            <span>{name}</span>
          </Link>
        ))}
        <a className="admin-nav-link" href="/ui/face-verification.html?role=admin&amp;mode=manage">
          <ShieldCheck size={17} strokeWidth={1.8} />
          <span>Face verification</span>
        </a>
        <button className="admin-nav-link admin-logout" type="button" onClick={signOut}>
          <LogOut size={17} strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </nav>
      <div className="admin-sidebar-bottom">
        <span className="admin-sidebar-status" aria-hidden="true" />
        <span>Verified admin</span>
        <a href="/" aria-label="Return to IntelliBus home">↗</a>
      </div>
    </aside>
  );
}
