import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

const STATUS_STYLES = {
  en_attente: { label: "En attente", color: "var(--warning)", bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.35)" },
  en_transit: { label: "En transit", color: "var(--accent-soft)", bg: "rgba(110,168,255,0.15)", border: "rgba(110,168,255,0.35)" },
  livré: { label: "Livré", color: "var(--success)", bg: "rgba(44,203,118,0.15)", border: "rgba(44,203,118,0.35)" },
  annulé: { label: "Annulé", color: "var(--danger)", bg: "rgba(255,95,95,0.15)", border: "rgba(255,95,95,0.35)" },
  retour: { label: "Retour", color: "var(--violet)", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)" },
};

const TABS = [
  { key: "pending", label: "En attente validation" },
  { key: "confirmes", label: "Confirmés" },
  { key: "refuses", label: "Refusés" },
  { key: "all", label: "Tous" },
];

export default function AdminColis() {
  const [colisList, setColisList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    loadColis();
  }, []);

  const loadColis = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/colis");
      setColisList(Array.isArray(data) ? data : data?.items || []);
    } catch {
      showToast("Erreur chargement colis", "error");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleApprove = async (id, numero) => {
    setActionLoading(id + "_approve");
    try {
      await api.post(`/admin/colis/${id}/approve`);
      setColisList((prev) => prev.map((c) => (c.id === id ? { ...c, admin_note: "accepté" } : c)));
      setExpanded(null);
      setActiveTab("confirmes");
      showToast(`Colis ${numero} confirmé`);
    } catch {
      showToast("Erreur lors de la confirmation", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id, numero) => {
    setActionLoading(id + "_reject");
    try {
      await api.post(`/admin/colis/${id}/reject`);
      setColisList((prev) => prev.map((c) => (c.id === id ? { ...c, statut: "annulé", admin_note: "refusé" } : c)));
      setExpanded(null);
      setActiveTab("refuses");
      showToast(`Colis ${numero} refusé`, "error");
    } catch {
      showToast("Erreur lors du refus", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const toggleExpand = (id) => setExpanded((prev) => (prev === id ? null : id));

  const filtered = colisList.filter((c) => {
    let matchTab = false;
    if (activeTab === "all") matchTab = true;
    if (activeTab === "pending") matchTab = c.statut === "en_attente" && !c.admin_note;
    if (activeTab === "confirmes") matchTab = c.admin_note === "accepté";
    if (activeTab === "refuses") matchTab = c.admin_note === "refusé";

    const s = search.toLowerCase();
    const matchSearch =
      !search ||
      c.numero_suivi?.toLowerCase().includes(s) ||
      c.nom_destinataire?.toLowerCase().includes(s) ||
      c.adresse_livraison?.toLowerCase().includes(s);

    return matchTab && matchSearch;
  });

  const countBy = (key) => {
    if (key === "all") return colisList.length;
    if (key === "pending") return colisList.filter((c) => c.statut === "en_attente" && !c.admin_note).length;
    if (key === "confirmes") return colisList.filter((c) => c.admin_note === "accepté").length;
    if (key === "refuses") return colisList.filter((c) => c.admin_note === "refusé").length;
    return 0;
  };

  const pendingCount = countBy("pending");

  return (
    <div style={{ padding: "24px 28px", fontFamily: "system-ui, Arial, sans-serif", color: "var(--text-primary)", minHeight: "100vh" }}>
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            zIndex: 999,
            background: toast.type === "error" ? "rgba(255,95,95,.15)" : "rgba(44,203,118,.15)",
            border: `1px solid ${toast.type === "error" ? "rgba(255,95,95,.4)" : "rgba(44,203,118,.4)"}`,
            color: toast.type === "error" ? "#ff5f5f" : "#2ccb76",
            borderRadius: 12,
            padding: "12px 20px",
            fontWeight: 700,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900 }}>Gestion des colis</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: "0.85rem" }}>
            {loading ? "Chargement..." : `${colisList.length} colis au total`}
          </p>
        </div>
        <button
          onClick={loadColis}
          style={{
            background: "var(--accent-bg)",
            border: "1px solid var(--accent-border)",
            color: "var(--accent-soft)",
            borderRadius: 10,
            padding: "10px 18px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Rafraîchir
        </button>
      </div>

      {pendingCount > 0 && (
        <div
          style={{
            marginBottom: 20,
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(245,158,11,0.10)",
            border: "1px solid rgba(245,158,11,0.4)",
            color: "var(--warning)",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {pendingCount} colis en attente de confirmation
          <button
            onClick={() => setActiveTab("pending")}
            style={{
              marginLeft: "auto",
              background: "rgba(245,158,11,.2)",
              border: "1px solid rgba(245,158,11,.4)",
              color: "var(--warning)",
              borderRadius: 8,
              padding: "6px 14px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "0.82rem",
            }}
          >
            Voir
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const count = countBy(tab.key);
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.82rem",
                background: active ? "rgba(110,168,255,.2)" : "rgba(255,255,255,.04)",
                border: active ? "1px solid rgba(110,168,255,.5)" : "1px solid rgba(255,255,255,.10)",
                color: active ? "#7aa2ff" : "rgba(232,238,252,0.6)",
              }}
            >
              {tab.label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rechercher par numéro, nom, adresse..."
        style={{
          width: "100%",
          maxWidth: 500,
          borderRadius: 10,
          border: "1px solid var(--border-strong)",
          background: "var(--surface-panel-soft)",
          color: "var(--text-primary)",
          padding: "10px 14px",
          outline: "none",
          fontSize: "0.9rem",
          marginBottom: 20,
          boxSizing: "border-box",
        }}
      />

      {loading ? (
        <p style={{ opacity: 0.6, textAlign: "center", paddingTop: 40 }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60, opacity: 0.5 }}>
          <p>Aucun colis trouvé</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((colis) => {
            const st = STATUS_STYLES[colis.statut] || STATUS_STYLES.en_attente;
            const canValidate = !colis.admin_note && colis.statut === "en_attente";
            const isOpen = expanded === colis.id;

            return (
              <div
                key={colis.id}
                style={{
                  borderRadius: 14,
                  border: canValidate ? "1px solid rgba(245,158,11,.35)" : "1px solid rgba(255,255,255,.08)",
                  background: canValidate ? "rgba(245,158,11,.03)" : "rgba(255,255,255,.03)",
                  overflow: "hidden",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", flexWrap: "wrap" }}>
                  <button
                    onClick={() => toggleExpand(colis.id)}
                    style={{ background: "none", border: "none", color: "var(--accent-soft)", cursor: "pointer", fontSize: "1rem", padding: 0, minWidth: 20 }}
                  >
                    {isOpen ? "▼" : "▶"}
                  </button>

                  <div style={{ minWidth: 170 }}>
                    <div style={{ fontFamily: "monospace", color: "var(--accent-soft)", fontWeight: 800, fontSize: "0.88rem" }}>
                      #{colis.numero_suivi}
                    </div>
                    <span
                      style={{
                        background: st.bg,
                        border: `1px solid ${st.border}`,
                        color: st.color,
                        padding: "2px 9px",
                        borderRadius: 20,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        marginTop: 4,
                        display: "inline-block",
                      }}
                    >
                      {st.label}
                    </span>
                  </div>

                  <div style={{ flex: 1, minWidth: 130 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{colis.nom_destinataire}</div>
                    <div style={{ opacity: 0.6, fontSize: "0.78rem" }}>{colis.telephone_destinataire}</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 130, opacity: 0.75, fontSize: "0.83rem" }}>
                    {colis.adresse_livraison}
                  </div>

                  {canValidate && (
                    <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                      <button
                        onClick={() => handleApprove(colis.id, colis.numero_suivi)}
                        disabled={actionLoading !== null}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          background: "rgba(44,203,118,.15)",
                          border: "1px solid rgba(44,203,118,.4)",
                          color: "var(--success)",
                          opacity: actionLoading === colis.id + "_approve" ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === colis.id + "_approve" ? "..." : "Confirmer"}
                      </button>

                      <button
                        onClick={() => handleReject(colis.id, colis.numero_suivi)}
                        disabled={actionLoading !== null}
                        style={{
                          padding: "8px 16px",
                          borderRadius: 8,
                          cursor: "pointer",
                          fontWeight: 800,
                          fontSize: "0.82rem",
                          background: "rgba(255,95,95,.15)",
                          border: "1px solid rgba(255,95,95,.4)",
                          color: "var(--danger)",
                          opacity: actionLoading === colis.id + "_reject" ? 0.6 : 1,
                        }}
                      >
                        {actionLoading === colis.id + "_reject" ? "..." : "Refuser"}
                      </button>
                    </div>
                  )}

                  {colis.admin_note && (
                    <div
                      style={{
                        marginLeft: "auto",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: colis.admin_note === "accepté" ? "#2ccb76" : "#ff5f5f",
                      }}
                    >
                      {colis.admin_note}
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 20px", background: "var(--surface-inset-strong)" }}>
                    <div style={{ opacity: 0.85, fontSize: "0.9rem" }}>
                      Poids: {colis.poids} kg | Prix: {colis.prix} DT
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
