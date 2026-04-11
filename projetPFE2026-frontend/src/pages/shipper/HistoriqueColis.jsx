import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import colisService from "../../api/colisService";
import ThemeToggleButton from "../../components/ThemeToggleButton.jsx";

const STATUS_LABELS = {
  en_attente: { label: "En attente",  color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.35)",  icon: "⏳" },
  en_transit:  { label: "En transit",  color: "#7aa2ff", bg: "rgba(110,168,255,0.15)", border: "rgba(110,168,255,0.35)", icon: "🚚" },
  livré:       { label: "Livré",       color: "#2ccb76", bg: "rgba(44,203,118,0.15)",  border: "rgba(44,203,118,0.35)",  icon: "✅" },
  annulé:      { label: "Annulé",      color: "#ff5f5f", bg: "rgba(255,95,95,0.15)",   border: "rgba(255,95,95,0.35)",   icon: "❌" },
  retour:      { label: "Retour",      color: "#a78bfa", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)", icon: "↩️" },
};

// Formate une date ISO → "12/04/2025 à 14:32"
function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d)) return null;
  const date = d.toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
  return `${date} à ${time}`;
}

export default function HistoriqueColis() {
  const navigate = useNavigate();
  const [colisList, setColisList]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [selected, setSelected]     = useState(null); // colis ouvert dans le drawer

  useEffect(() => {
    colisService.getAll()
      .then(data => setColisList(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = colisList.filter(c =>
    search === "" ||
    c.numero_suivi?.toLowerCase().includes(search.toLowerCase()) ||
    c.nom_destinataire?.toLowerCase().includes(search.toLowerCase())
  );

  // Construit la timeline à partir des champs du colis
  function buildTimeline(colis) {
  const events = [];

  // 1. Création toujours présente
  if (colis.created_at) {
    events.push({
      label: "Colis créé",
      date:  formatDate(colis.created_at),
      icon:  "📦",
      color: "#7aa2ff",
    });
  }

  // 2. Confirmation/Refus admin — utilise updated_at si pas de champ dédié
  if (colis.admin_note === "accepté") {
    events.push({
      label: "Confirmé par l'admin",
      date:  formatDate(colis.confirmed_at || colis.admin_note_at || colis.updated_at),
      icon:  "✅",
      color: "#2ccb76",
    });
  }

  if (colis.admin_note === "refusé") {
    events.push({
      label: "Refusé par l'admin",
      date:  formatDate(colis.refused_at || colis.admin_note_at || colis.updated_at),
      icon:  "❌",
      color: "#ff5f5f",
    });
  }

  // 3. Historique statuts si backend envoie history[]
  const history = Array.isArray(colis.history) ? colis.history : [];
  history.forEach(h => {
    const s = STATUS_LABELS[h.statut] || { label: h.statut, color: "#94a3b8", icon: "📌" };
    events.push({
      label: `Statut → ${s.label}`,
      date:  formatDate(h.date || h.created_at || h.updated_at),
      icon:  s.icon,
      color: s.color,
    });
  });

  // 4. Si pas d'historique → statut actuel avec updated_at
  if (history.length === 0 && colis.statut && colis.statut !== "en_attente") {
    const s = STATUS_LABELS[colis.statut] || { label: colis.statut, color: "#94a3b8", icon: "📌" };
    events.push({
      label: `Statut actuel → ${s.label}`,
      date:  formatDate(colis.updated_at),
      icon:  s.icon,
      color: s.color,
    });
  }

  return events;
}

  const status = selected ? (STATUS_LABELS[selected.statut] || { label: selected.statut, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", icon: "📌" }) : null;

  return (
<     div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)" }}>

    {/* HEADER */}
<header style={{
  position: "sticky", top: 0, zIndex: 30,
  display: "flex", alignItems: "center", justifyContent: "space-between",
  background: "var(--bg-secondary)",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  backdropFilter: "blur(10px)",
  padding: "14px 28px",
}}>
  {/* Gauche — logo */}
  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
    <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7aa2ff", boxShadow: "0 0 0 6px rgba(122,162,255,0.15)" }} />
    <span style={{ fontWeight: 900 }}>🚚 MZ Logistic</span>
    <span style={{ opacity: 0.4, margin: "0 4px" }}>|</span>
    <span style={{ opacity: 0.7, fontSize: "0.9rem" }}>Historique des colis</span>
  </div>

  {/* Droite — Retour + Toggle ensemble */}
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <button type="button" onClick={() => navigate("/expediteur/dashboard")}
      style={{ background: "var(--bg-card)", border: "1px solid var(--border-color)", color: "var(--text-primary)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
      ← Retour
    </button>
    <ThemeToggleButton compact />
  </div>
</header>

      <div style={{ padding: "24px 28px" }}>

        {/* TITRE */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 900 }}>🕓 Historique des colis</h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: "0.88rem" }}>
            {loading ? "Chargement..." : `${colisList.length} colis • cliquez sur un numéro de suivi pour voir les détails`}
          </p>
        </div>

        {/* RECHERCHE */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="🔍 Rechercher par numéro de suivi ou nom..."
          style={{
            width: "100%", maxWidth: 480,
            borderRadius: 12, border: "1px solid rgba(255,255,255,.14)",
            background: "rgba(255,255,255,.04)", color: "#e8eefc",
            padding: "10px 14px", outline: "none", fontSize: "0.9rem",
            boxSizing: "border-box", marginBottom: 20,
          }}
        />

        {/* LISTE */}
        {loading ? (
          <p style={{ textAlign: "center", opacity: 0.6, paddingTop: 60 }}>Chargement...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60, opacity: 0.6 }}>
            <div style={{ fontSize: "3rem" }}>🔍</div>
            <p>Aucun colis trouvé</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(colis => {
              const s = STATUS_LABELS[colis.statut] || { label: colis.statut, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)", icon: "📌" };
              const isOpen = selected?.id === colis.id;
              return (
                <div key={colis.id}
                  onClick={() => setSelected(isOpen ? null : colis)}
                  style={{
                    borderRadius: 14,
                    border: isOpen ? `1px solid rgba(122,162,255,0.4)` : "1px solid rgba(255,255,255,.08)",
                    background: isOpen ? "rgba(110,168,255,.06)" : "rgba(255,255,255,.03)",
                    padding: "14px 18px",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 14,
                  }}>

                  {/* Gauche */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* Numéro suivi — cliquable visuellement */}
                    <div style={{
                      fontFamily: "monospace", fontWeight: 900, fontSize: "0.95rem",
                      color: "#7aa2ff",
                      background: "rgba(110,168,255,.10)",
                      border: "1px solid rgba(110,168,255,.25)",
                      borderRadius: 8, padding: "4px 12px",
                      letterSpacing: "0.04em",
                    }}>
                      #{colis.numero_suivi}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.92rem" }}>{colis.nom_destinataire}</div>
                      <div style={{ fontSize: "0.78rem", opacity: 0.5, marginTop: 2 }}>{colis.adresse_livraison}</div>
                    </div>
                  </div>

                  {/* Droite */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{
                      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
                      padding: "4px 12px", borderRadius: 20, fontSize: "0.78rem", fontWeight: 700,
                    }}>
                      {s.icon} {s.label}
                    </span>
                    <div style={{ fontSize: "0.78rem", opacity: 0.4 }}>
                      {formatDate(colis.created_at) || "—"}
                    </div>
                    <div style={{
                      fontSize: "0.75rem", opacity: 0.45,
                      transition: "transform 0.2s",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                    }}>▼</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DRAWER DÉTAILS */}
      {selected && status && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setSelected(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
          />

          {/* Panel */}
          <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0,
            width: "min(480px, 95vw)",
            background: "var(--bg-secondary)",
            borderLeft: "1px solid rgba(255,255,255,.12)",
            zIndex: 50,
            overflowY: "auto",
            padding: 28,
            boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
          }}>

            {/* Header drawer */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "monospace", color: "#7aa2ff", fontWeight: 900, fontSize: "1.05rem", marginBottom: 6 }}>
                  #{selected.numero_suivi}
                </div>
                <span style={{
                  background: status.bg, border: `1px solid ${status.border}`, color: status.color,
                  padding: "4px 14px", borderRadius: 20, fontSize: "0.82rem", fontWeight: 700,
                }}>
                  {status.icon} {status.label}
                </span>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: "none", border: "none", color: "rgba(232,238,252,0.5)", fontSize: "1.5rem", cursor: "pointer", padding: 0, lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Infos destinataire */}
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.03)", padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: "0.7rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Destinataire</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  { k: "Nom",       v: selected.nom_destinataire },
                  { k: "Téléphone", v: selected.telephone_destinataire },
                  { k: "Email",     v: selected.email_destinataire || "—" },
                  { k: "Adresse",   v: selected.adresse_livraison },
                  { k: "Poids",     v: `${selected.poids} kg` },
                  { k: "Prix",      v: `${selected.prix} DT`, color: "#2ccb76" },
                ].map(({ k, v, color }) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ opacity: 0.5, fontSize: "0.82rem" }}>{k}</span>
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: color || "#e8eefc", textAlign: "right", maxWidth: "65%" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TIMELINE */}
            <div>
              <div style={{ fontSize: "0.7rem", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
                📅 Historique & Timeline
              </div>

              {(() => {
                const timeline = buildTimeline(selected);
                if (timeline.length === 0) {
                  return <p style={{ opacity: 0.5, fontSize: "0.85rem" }}>Aucun événement enregistré.</p>;
                }
                return (
                  <div style={{ position: "relative" }}>
                    {/* Ligne verticale */}
                    <div style={{
                      position: "absolute", left: 15, top: 20, bottom: 20,
                      width: 2, background: "rgba(255,255,255,.08)", borderRadius: 2,
                    }} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      {timeline.map((event, i) => (
                        <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: i < timeline.length - 1 ? 20 : 0 }}>

                          {/* Dot */}
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                            background: `${event.color}22`,
                            border: `2px solid ${event.color}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: "0.9rem", zIndex: 1,
                          }}>
                            {event.icon}
                          </div>

                          {/* Contenu */}
                          <div style={{
                            flex: 1,
                            borderRadius: 10,
                            border: `1px solid ${event.color}33`,
                            background: `${event.color}0a`,
                            padding: "10px 14px",
                          }}>
                            <div style={{ fontWeight: 800, fontSize: "0.9rem", color: event.color }}>
                              {event.label}
                            </div>
                            <div style={{ fontSize: "0.78rem", opacity: 0.6, marginTop: 4 }}>
                              {event.date || <span style={{ fontStyle: "italic", opacity: 0.4 }}>Date non disponible</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>
        </>
      )}
    </div>
  );
}