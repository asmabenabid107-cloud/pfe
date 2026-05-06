import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import ThemeToggleButton from "../../components/ThemeToggleButton.jsx";

const navStyle = (isActive) => ({
  padding: "10px 12px",
  borderRadius: 12,
  border: `1px solid ${isActive ? "var(--accent-border)" : "transparent"}`,
  background: isActive ? "var(--accent-bg)" : "var(--surface-panel-faint)",
  color: "var(--text-primary)",
  textDecoration: "none",
  display: "block",
  fontSize: "0.9rem",
});

function MenuBadge({ color }) {
  return (
    <span
      style={{
        width: 10,
        height: 10,
        borderRadius: 3,
        background: color,
        display: "inline-block",
        boxShadow: `0 0 0 1px ${color}33`,
      }}
    />
  );
}

function IconGlyph({ kind }) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  if (kind === "dashboard") {
    return (
      <svg {...commonProps}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="11" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="18" width="7" height="3" rx="1.5" />
      </svg>
    );
  }

  if (kind === "shippers") {
    return (
      <svg {...commonProps}>
        <path d="M12 13c2.76 0 5-2.24 5-5S14.76 3 12 3 7 5.24 7 8s2.24 5 5 5Z" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </svg>
    );
  }

  if (kind === "couriers") {
    return (
      <svg {...commonProps}>
        <path d="M3 8h11v8H3z" />
        <path d="M14 11h3l3 3v2h-6z" />
        <circle cx="8" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
      </svg>
    );
  }

  if (kind === "vehicles") {
    return (
      <svg {...commonProps}>
        <path d="M3 11h12l3 3v4H3z" />
        <path d="M6 11V8h6" />
        <circle cx="8" cy="18" r="2" />
        <circle cx="16" cy="18" r="2" />
      </svg>
    );
  }

  if (kind === "map") {
    return (
      <svg {...commonProps}>
        <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2Z" />
        <path d="m9 4 6 2" />
        <path d="M9 4v14" />
        <path d="M15 6v14" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M4 6h11l2 3h3v9H4z" />
      <path d="M4 6V4h6" />
    </svg>
  );
}

function MenuGlyph({ kind, tint }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 20,
        display: "inline-flex",
        justifyContent: "center",
        color: tint,
        filter: `drop-shadow(0 0 8px ${tint}33)`,
      }}
    >
      <IconGlyph kind={kind} />
    </span>
  );
}

function PrimaryNavItem({ to, label, kind, tint }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        ...navStyle(isActive),
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontWeight: 700,
      })}
    >
      <MenuGlyph kind={kind} tint={tint} />
      <span>{label}</span>
    </NavLink>
  );
}

function MenuGroup({ title, active, items, accent, kind }) {
  const [open, setOpen] = useState(active);
  const expanded = active || open;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 12px",
          borderRadius: 12,
          cursor: "pointer",
          border: active
            ? "1px solid var(--accent-border)"
            : "1px solid transparent",
          background: active
            ? "var(--accent-bg)"
            : "var(--surface-panel-faint)",
          color: "var(--text-primary)",
          fontSize: "0.9rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MenuGlyph kind={kind} tint={accent} />
          <span style={{ fontWeight: 800 }}>{title}</span>
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            opacity: 0.7,
            transition: "transform 0.2s",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            display: "inline-block",
          }}
        >
          ▼
        </span>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 4,
            marginLeft: 12,
            display: "flex",
            flexDirection: "column",
            gap: 3,
            borderLeft: "2px solid var(--border-subtle)",
            paddingLeft: 10,
          }}
        >
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                ...navStyle(isActive),
                padding: "8px 12px",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                gap: 10,
              })}
            >
              <MenuBadge color={item.color} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const colisActive = location.pathname.startsWith("/admin/colis");
  const livreursActive = location.pathname.startsWith("/admin/livreurs");
  const planningActive = location.pathname.startsWith("/admin/planification");
  const vehiclesActive = location.pathname.startsWith("/admin/vehicules");

  function logout() {
    localStorage.removeItem("admin_access_token");
    navigate("/admin/login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "280px 1fr",
      }}
    >
      <aside
        style={{
          background: "var(--sidebar-bg)",
          borderRight: "1px solid var(--border-subtle)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            padding: 12,
            borderRadius: 14,
            border: "1px solid var(--border-subtle)",
            background: "var(--surface-panel-faint)",
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
              background: "var(--accent-bg)",
              border: "1px solid var(--accent-border)",
              color: "var(--text-primary)",
            }}
          >
            MZ
          </div>
          <div>
            <div style={{ fontWeight: 900, color: "var(--text-primary)" }}>
              MZ Logistic
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.75,
                color: "var(--text-primary)",
              }}
            >
              Espace Admin
            </div>
          </div>
        </div>

        <nav
          style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}
        >
          <PrimaryNavItem
            to="/admin/dashboard"
            label="Dashboard"
            kind="dashboard"
            tint="#8cb4ff"
          />

          <PrimaryNavItem
            to="/admin/expediteurs"
            label="Expediteurs"
            kind="shippers"
            tint="#ffd36b"
          />

          <PrimaryNavItem
            to="/admin/planification"
            label="Planification"
            kind="map"
            tint={planningActive ? "#6ee7b7" : "#8de7cf"}
          />

          <MenuGroup
            title="Livreurs"
            active={livreursActive}
            accent="#4ecdc4"
            kind="couriers"
            items={[
              {
                to: "/admin/livreurs",
                label: "Demandes",
                color: "#4ecdc4",
                end: true,
              },
              {
                to: "/admin/livreurs/approuves",
                label: "Approuves",
                color: "var(--success)",
              },
              {
                to: "/admin/livreurs/conges",
                label: "Conges livreurs",
                color: "var(--warning)",
              },
            ]}
          />

          <MenuGroup
            title="Colis"
            active={colisActive}
            accent="#f6c453"
            kind="parcels"
            items={[
              {
                to: "/admin/colis",
                label: "Tous les colis",
                color: "#f6c453",
                end: true,
              },
              {
                to: "/admin/colis/confirmes",
                label: "Confirmes",
                color: "var(--success)",
              },
              {
                to: "/admin/colis/refuses",
                label: "Refuses",
                color: "var(--danger)",
              },
            ]}
          />

          <PrimaryNavItem
            to="/admin/vehicules"
            label="Vehicules"
            kind="vehicles"
            tint={vehiclesActive ? "#ff9966" : "#ffb483"}
          />
        </nav>

        <ThemeToggleButton
          style={{ width: "100%", justifyContent: "center" }}
        />

        <button
          type="button"
          onClick={logout}
          style={{
            width: "100%",
            borderRadius: 12,
            border: "1px solid var(--danger-border)",
            background: "var(--danger-bg)",
            color: "var(--text-primary)",
            padding: "10px 12px",
            cursor: "pointer",
            fontWeight: 800,
          }}
        >
          Se deconnecter
        </button>
      </aside>

      <main
        style={{
          padding: 22,
          background: "var(--page-bg)",
          color: "var(--text-primary)",
          minHeight: "100vh",
          minWidth: 0,
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}

