import {
  ArrowDownRight,
  ArrowRight,
  BusFront,
  BriefcaseBusiness,
  GraduationCap,
  MapPinned,
  Navigation,
  ShieldCheck,
  TicketCheck,
  UsersRound,
} from "lucide-react";
import "./Home.css";

const portals = [
  {
    title: "Engineering Driver",
    description: "Campus routes and student pickup operations.",
    role: "engineering-driver",
    icon: BusFront,
    tone: "blue",
  },
  {
    title: "Junior College Driver",
    description: "College routes and student attendance tools.",
    role: "junior-driver",
    icon: BusFront,
    tone: "cyan",
  },
  {
    title: "Engineering Student",
    description: "Your campus transport and journey information.",
    role: "engineering-student",
    icon: GraduationCap,
    tone: "violet",
  },
  {
    title: "Junior College Student",
    description: "College transport details in one place.",
    role: "junior-student",
    icon: GraduationCap,
    tone: "teal",
  },
  {
    title: "Employee",
    description: "Company shuttle and employee trip records.",
    role: "employee",
    icon: BriefcaseBusiness,
    tone: "amber",
  },
  {
    title: "Parent",
    description: "Access authorized student journey updates.",
    role: "parent",
    icon: UsersRound,
    tone: "rose",
  },
];

const features = [
  {
    title: "Route-aware journeys",
    description:
      "Keep route details and pickup sequences easy to find across each role-specific portal.",
    icon: MapPinned,
    label: "ROUTE INFORMATION",
  },
  {
    title: "Digital transport access",
    description:
      "A dedicated space for passenger transport details and pass information.",
    icon: TicketCheck,
    label: "PASSENGER PORTALS",
  },
  {
    title: "Separate by design",
    description:
      "Student and company transport experiences stay distinct, with dedicated records and workflows.",
    icon: ShieldCheck,
    label: "ROLE-BASED WORKSPACES",
  },
];

function MobilityPreview() {
  return (
    <div className="mobility-preview" aria-label="Illustrative transport route preview">
      <div className="preview-topline">
        <span className="preview-overline">THE INTELLIBUS NETWORK</span>
        <span className="preview-mode"><span /> ROUTE PREVIEW</span>
      </div>
      <div className="preview-map">
        <div className="map-grid" />
        <svg
          className="route-art"
          viewBox="0 0 520 340"
          role="img"
          aria-label="Illustrative route connecting three stops"
        >
          <path className="route-halo" d="M92 250 C125 218 143 185 190 190 S247 233 286 199 329 126 378 144 414 130 438 94" />
          <path className="route-path" d="M92 250 C125 218 143 185 190 190 S247 233 286 199 329 126 378 144 414 130 438 94" />
          <circle className="route-stop route-stop-start" cx="92" cy="250" r="8" />
          <circle className="route-stop" cx="190" cy="190" r="7" />
          <circle className="route-stop" cx="286" cy="199" r="7" />
          <circle className="route-stop route-stop-end" cx="438" cy="94" r="8" />
          <g className="route-bus" transform="translate(321 154)">
            <rect x="-18" y="-13" width="36" height="26" rx="8" />
            <path d="M-11 -7h22v8h-22z" />
            <circle cx="-10" cy="12" r="3" />
            <circle cx="10" cy="12" r="3" />
          </g>
        </svg>
        <div className="map-label map-label-start"><span className="map-label-dot" /> Campus gate</div>
        <div className="map-label map-label-mid"><span className="map-label-dot" /> Pickup point</div>
        <div className="map-label map-label-end"><span className="map-label-dot" /> City connection</div>
        <div className="map-compass" aria-hidden="true"><Navigation size={14} /></div>
      </div>
      <div className="preview-bottomline">
        <div>
          <span className="preview-caption">A clearer view of every journey</span>
          <span className="preview-disclaimer">Illustrative graphic · not live GPS data</span>
        </div>
        <div className="preview-stops">        <span>04</span> ROUTE STOPS</div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="intellibus-home">
      <header className="home-header">
        <a className="home-brand" href="/" aria-label="IntelliBus home">
          <span className="home-brand-mark"><BusFront size={21} strokeWidth={2.2} /></span>
          <span>Intelli<span>Bus</span></span>
        </a>
        <div className="home-header-meta">
          <span className="batch-badge">BATCH B2324</span>
          <span className="header-divider" />
          <span className="system-label"><i /> Smart Transportation System</span>
        </div>
        <nav className="home-nav" aria-label="Main navigation">
          <a href="#portals">Portals</a>
          <a href="#platform">Platform</a>
          <a className="nav-admin-link" href="/admin">Admin access <ArrowRight size={14} /></a>
        </nav>
      </header>

      <main>
        <section className="home-hero">
          <div className="hero-glow" aria-hidden="true" />
          <div className="hero-copy">
            <p className="hero-eyebrow"><span className="eyebrow-line" /> SMART MOBILITY, CONNECTED</p>
            <h1>Intelligent Mobility.<br /><span>Safer Journeys.</span></h1>
            <p className="hero-description">
              A connected transport experience for campuses and workplaces.
              Find routes, manage digital transport access, and keep journey
              information organized in one place.
            </p>
            <div className="hero-actions">
              <a className="hero-primary" href="#portals">Explore transport services <ArrowRight size={17} /></a>
              <a className="hero-secondary" href="#platform">Discover the platform <ArrowDownRight size={16} /></a>
            </div>
            <div className="hero-trust-row">
              <span><ShieldCheck size={15} /> Role-specific workspaces</span>
              <span><MapPinned size={15} /> Route-focused journeys</span>
            </div>
          </div>
          <MobilityPreview />
          <div className="hero-index" aria-hidden="true"><span>01</span> / MOBILITY OVERVIEW</div>
        </section>

        <section className="portal-section" id="portals" aria-labelledby="portals-title">
          <div className="section-topline">
            <div>
              <p className="section-kicker">YOUR INTELLIBUS WORKSPACE</p>
              <h2 id="portals-title">The right journey starts here.</h2>
            </div>
            <p className="section-intro">Choose your role to continue to its dedicated sign-in.</p>
          </div>
          <div className="portal-grid">
            {portals.map(({ title, description, role, icon: Icon, tone }, index) => (
              <a
                className="portal-card"
                href={`/ui/login.html?role=${role}`}
                key={role}
              >
                <div className="portal-card-top">
                  <span className={`portal-icon portal-icon-${tone}`}><Icon size={20} strokeWidth={1.8} /></span>
                  <span className="portal-number">0{index + 1}</span>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
                <span className="portal-action">Continue to sign in <ArrowRight size={15} /></span>
              </a>
            ))}
          </div>
        </section>

        <section className="platform-section" id="platform" aria-labelledby="platform-title">
          <div className="platform-heading">
            <p className="section-kicker">BUILT AROUND EVERY JOURNEY</p>
            <h2 id="platform-title">One system. <span>Distinct experiences.</span></h2>
            <p>Purposeful tools bring transport information closer to the people who need it.</p>
          </div>
          <div className="feature-grid">
            {features.map(({ title, description, icon: Icon, label }, index) => (
              <article className="feature-card" key={title}>
                <div className="feature-card-top">
                  <span className="feature-icon"><Icon size={19} strokeWidth={1.8} /></span>
                  <span>0{index + 1}</span>
                </div>
                <p className="feature-label">{label}</p>
                <h3>{title}</h3>
                <p className="feature-description">{description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <a className="home-brand footer-brand" href="/" aria-label="IntelliBus home">
          <span className="home-brand-mark"><BusFront size={18} strokeWidth={2.2} /></span>
          <span>Intelli<span>Bus</span></span>
        </a>
        <p>Smart Transportation System <span>·</span> Batch B2324</p>
        <div className="footer-links"><a href="#portals">Access portals</a><a href="/admin">Admin</a></div>
      </footer>
    </div>
  );
}
