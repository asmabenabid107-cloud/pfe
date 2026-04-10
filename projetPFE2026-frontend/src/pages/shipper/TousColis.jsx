import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import colisService from "../../api/colisService";
import ThemeToggleButton from "../../components/ThemeToggleButton.jsx";

const STATUS_LABELS = {
  en_attente: { label: "En attente", color: "var(--warning)", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.35)"  },
  en_transit:  { label: "En transit", color: "var(--accent-soft)", bg: "rgba(110,168,255,0.15)", border: "rgba(110,168,255,0.35)" },
  livré:       { label: "Livré",      color: "var(--success)", bg: "rgba(44,203,118,0.15)",  border: "rgba(44,203,118,0.35)"  },
  annulé:      { label: "Annulé",     color: "var(--danger)", bg: "rgba(255,95,95,0.15)",   border: "rgba(255,95,95,0.35)"   },
  retour:      { label: "Retour",      color: "var(--violet)", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)" },
};

export default function TousColis() {
  const navigate = useNavigate();
  const [colisList, setColisList]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState("");
  const [filterStatut, setFilterStatut] = useState("tous");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const data = await colisService.getAll();
      setColisList(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await colisService.delete(id);
      setColisList((prev) => prev.filter((c) => c.id !== id));
      setDeleteConfirm(null);
    } catch {
      alert("Erreur suppression");
    }
  };

  const filtered = colisList.filter((c) => {
    const matchStatut = filterStatut === "tous" || c.statut === filterStatut;
    const matchSearch = search === "" ||
      c.numero_suivi?.toLowerCase().includes(search.toLowerCase()) ||
      c.nom_destinataire?.toLowerCase().includes(search.toLowerCase()) ||
      c.adresse_livraison?.toLowerCase().includes(search.toLowerCase());
    return matchStatut && matchSearch;
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "system-ui, Arial, sans-serif" }}>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--header-bg)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", padding: "14px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7aa2ff", boxShadow: "0 0 0 6px rgba(122,162,255,0.15)" }} />
          <span style={{ fontWeight: 900 }}>🚚 MZ Logistic</span>
          <span style={{ opacity: 0.4, margin: "0 4px" }}>|</span>
          <span style={{ opacity: 0.7, fontSize: "0.9rem" }}>Mes colis</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ThemeToggleButton compact />
          <button onClick={() => navigate("/expediteur/colis/nouveau")}
            style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 12, padding: "10px 18px", cursor: "pointer", fontWeight: 800 }}>
            + Nouveau colis
          </button>
          <button onClick={() => navigate("/expediteur/dashboard")}
            style={{ background: "var(--surface-card)", border: "1px solid var(--border-soft)", color: "var(--text-primary)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
            ← Retour
          </button>
        </div>
      </header>

      <div style={{ padding: "24px 28px" }}>

        {/* TITRE */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 900 }}>📦 Mes colis</h1>
          <p style={{ margin: 0, opacity: 0.6, fontSize: "0.88rem" }}>
            {loading ? "Chargement..." : `${colisList.length} colis au total`}
          </p>
        </div>

        {/* FILTRES */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Rechercher par numéro, nom, adresse..."
            style={{
              flex: 1, minWidth: 240,
              borderRadius: 12, border: "1px solid var(--border-strong)",
              background: "var(--surface-panel-soft)", color: "var(--text-primary)",
              padding: "10px 14px", outline: "none", fontSize: "0.9rem",
            }}
          />
          {["tous", "en_attente", "en_transit", "livré", "annulé", "retour"].map((s) => {
            const info = s === "tous"
              ? { label: "Tous", color: "var(--accent-soft)", bg: "rgba(110,168,255,0.15)", border: "rgba(110,168,255,0.35)" }
              : STATUS_LABELS[s];
            const active = filterStatut === s;
            return (
              <button key={s} onClick={() => setFilterStatut(s)} style={{
                padding: "9px 16px", borderRadius: 12, cursor: "pointer", fontWeight: 700, fontSize: "0.82rem",
                background: active ? info.bg : "rgba(255,255,255,.04)",
                border: active ? `1px solid ${info.border}` : "1px solid rgba(255,255,255,.10)",
                color: active ? info.color : "var(--text-muted)",
              }}>
                {info.label}
                {s !== "tous" && (
                  <span style={{ marginLeft: 6, opacity: 0.7 }}>
                    ({colisList.filter(c => c.statut === s).length})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* LISTE */}
        {loading ? (
          <p style={{ textAlign: "center", opacity: 0.6, paddingTop: 60 }}>Chargement...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60, opacity: 0.6 }}>
            <div style={{ fontSize: "3rem" }}>🔍</div>
            <p>Aucun colis trouvé</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 14 }}>
            {filtered.map((colis) => (
              <ColisCard
                key={colis.id}
                colis={colis}
                onEdit={() => navigate(`/expediteur/colis/${colis.id}/modifier`)}
                onDelete={() => setDeleteConfirm(colis.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* MODAL SUPPRESSION */}
      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay-bg)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--auth-panel-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 32, textAlign: "center", maxWidth: 360, width: "90%" }}>
            <div style={{ fontSize: "3rem" }}>🗑️</div>
            <h3 style={{ margin: "12px 0 8px", color: "var(--text-primary)" }}>Supprimer ce colis ?</h3>
            <p style={{ opacity: 0.7, marginBottom: 24 }}>Cette action est irréversible.</p>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, padding: 12, border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700 }}>
                Annuler
              </button>
              <button onClick={() => handleDelete(deleteConfirm)} style={{ flex: 1, padding: 12, border: "1px solid var(--danger-border)", borderRadius: 10, background: "rgba(255,95,95,.15)", color: "var(--danger)", cursor: "pointer", fontWeight: 700 }}>
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColisCard({ colis, onEdit, onDelete }) {
  const status = STATUS_LABELS[colis.statut] || { label: colis.statut, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" };
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--border-soft)", background: "var(--surface-panel-soft)", overflow: "hidden" }}>

      {/* Header carte */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-deep)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <span style={{ fontFamily: "monospace", color: "var(--accent-soft)", fontSize: "0.85rem", fontWeight: 700 }}>
          #{colis.numero_suivi}
        </span>
        <span style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
          {status.label}
        </span>
      </div>

      {/* Corps */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: "0.7rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Destinataire</div>
          <div style={{ fontWeight: 700 }}>{colis.nom_destinataire}</div>
          <div style={{ fontSize: "0.82rem", opacity: 0.7 }}>{colis.telephone_destinataire}</div>
          {colis.email_destinataire && (
            <div style={{ fontSize: "0.8rem", opacity: 0.6 }}>{colis.email_destinataire}</div>
          )}
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Adresse</div>
          <div style={{ fontSize: "0.88rem", opacity: 0.9 }}>{colis.adresse_livraison}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, background: "var(--surface-inset-strong)", borderRadius: 10, padding: 12 }}>
          <div>
            <div style={{ fontSize: "0.68rem", opacity: 0.5, marginBottom: 3 }}>Poids</div>
            <div style={{ fontWeight: 800, fontSize: "0.9rem" }}>{colis.poids} kg</div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", opacity: 0.5, marginBottom: 3 }}>Prix</div>
            <div style={{ fontWeight: 800, color: "var(--success)", fontSize: "0.9rem" }}>{colis.prix} DT</div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", opacity: 0.5, marginBottom: 3 }}>Date</div>
            <div style={{ fontWeight: 700, fontSize: "0.82rem", opacity: 0.8 }}>
              {colis.created_at ? new Date(colis.created_at).toLocaleDateString("fr-TN") : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", borderTop: "1px solid var(--border-subtle)" }}>
        <button onClick={onEdit} style={{ flex: 1, border: "none", padding: 12, background: "var(--accent-bg-soft)", color: "var(--accent-soft)", cursor: "pointer", fontWeight: 700, borderRight: "1px solid var(--border-subtle)" }}>
          ✏️ Modifier
        </button>
        <button onClick={onDelete} style={{ flex: 1, border: "none", padding: 12, background: "var(--danger-bg)", color: "var(--danger)", cursor: "pointer", fontWeight: 700 }}>
          🗑️ Supprimer
        </button>
      </div>
    </div>
  );
}
