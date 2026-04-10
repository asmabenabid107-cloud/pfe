import { useEffect, useState } from "react";
import { api } from "../../api/client.js";

const STATUS_STYLES = {
  en_attente: { label: "En attente", color: "var(--warning)", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.35)"  },
  en_transit: { label: "En transit", color: "var(--accent-soft)", bg: "rgba(110,168,255,0.15)", border: "rgba(110,168,255,0.35)" },
  livré:      { label: "Livré",      color: "var(--success)", bg: "rgba(44,203,118,0.15)",  border: "rgba(44,203,118,0.35)"  },
  annulé:     { label: "Annulé",     color: "var(--danger)", bg: "rgba(255,95,95,0.15)",   border: "rgba(255,95,95,0.35)"   },
  retour:     { label: "Retour",     color: "var(--violet)", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)" },
};

export default function ColisConfirmes() {
  const [colisList, setColisList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [expanded, setExpanded]   = useState(null);

  useEffect(() => { loadColis(); }, []);

  const loadColis = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/admin/colis");
      const all = Array.isArray(data) ? data : data?.items || [];
      setColisList(all.filter(c => c.admin_note === "accepté"));
    } catch {
      console.error("Erreur chargement");
    } finally { setLoading(false); }
  };

  const filtered = colisList.filter(c =>
    !search ||
    c.numero_suivi?.toLowerCase().includes(search.toLowerCase()) ||
    c.nom_destinataire?.toLowerCase().includes(search.toLowerCase()) ||
    c.adresse_livraison?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleExpand = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <div style={{ padding: "24px 28px", fontFamily: "system-ui, Arial, sans-serif", color: "var(--text-primary)" }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900 }}>✅ Colis confirmés</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: "0.85rem" }}>
            {loading ? "Chargement..." : `${colisList.length} colis confirmés`}
          </p>
        </div>
        <button onClick={loadColis} style={{ background: "rgba(44,203,118,.15)", border: "1px solid var(--success-border)", color: "var(--success)", borderRadius: 10, padding: "10px 18px", cursor: "pointer", fontWeight: 700 }}>
          🔄 Rafraîchir
        </button>
      </div>

      {/* Stat card */}
      <div style={{ marginBottom: 20, padding: "16px 20px", borderRadius: 14, background: "rgba(44,203,118,.08)", border: "1px solid rgba(44,203,118,.25)", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ fontSize: "2.5rem", fontWeight: 900, color: "var(--success)" }}>{colisList.length}</div>
        <div>
          <div style={{ fontWeight: 800, color: "var(--success)" }}>Colis acceptés par l'admin</div>
          <div style={{ opacity: 0.6, fontSize: "0.82rem" }}>Ces colis ont été validés et sont en cours de traitement</div>
        </div>
      </div>

      {/* SEARCH */}
      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher par numéro, nom, adresse..."
        style={{ width: "100%", maxWidth: 500, borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-panel-soft)", color: "var(--text-primary)", padding: "10px 14px", outline: "none", fontSize: "0.9rem", marginBottom: 20, boxSizing: "border-box" }}
      />

      {/* LISTE */}
      {loading ? (
        <p style={{ opacity: 0.6, textAlign: "center", paddingTop: 40 }}>Chargement...</p>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", paddingTop: 60, opacity: 0.5 }}>
          <div style={{ fontSize: "2.5rem" }}>📭</div>
          <p>Aucun colis confirmé trouvé</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(colis => {
            const st       = STATUS_STYLES[colis.statut] || STATUS_STYLES.en_attente;
            const isOpen   = expanded === colis.id;
            const produits = Array.isArray(colis.produits) ? colis.produits : [];
            return (
              <div key={colis.id} style={{ borderRadius: 14, border: "1px solid rgba(44,203,118,.2)", background: "rgba(44,203,118,.03)", overflow: "hidden" }}>

                {/* Ligne principale */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", flexWrap: "wrap" }}>
                  <button onClick={() => toggleExpand(colis.id)} style={{ background: "none", border: "none", color: "var(--success)", cursor: "pointer", fontSize: "1rem", padding: 0, minWidth: 20 }}>
                    {isOpen ? "▼" : "▶"}
                  </button>
                  <div style={{ minWidth: 170 }}>
                    <div style={{ fontFamily: "monospace", color: "var(--accent-soft)", fontWeight: 800, fontSize: "0.88rem" }}>#{colis.numero_suivi}</div>
                    <span style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color, padding: "2px 9px", borderRadius: 20, fontSize: "0.7rem", fontWeight: 700, marginTop: 4, display: "inline-block" }}>{st.label}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 130 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.88rem" }}>{colis.nom_destinataire}</div>
                    <div style={{ opacity: 0.6, fontSize: "0.78rem" }}>{colis.telephone_destinataire}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 130, opacity: 0.75, fontSize: "0.83rem" }}>📍 {colis.adresse_livraison}</div>
                  <div style={{ display: "flex", gap: 14, fontSize: "0.83rem" }}>
                    <div><span style={{ opacity: 0.5 }}>Poids </span><strong>{colis.poids} kg</strong></div>
                    <div><span style={{ opacity: 0.5 }}>Prix </span><strong style={{ color: "var(--success)" }}>{colis.prix} DT</strong></div>
                    {produits.length > 0 && <div><span style={{ opacity: 0.5 }}>Produits </span><strong style={{ color: "var(--violet)" }}>{produits.length}</strong></div>}
                  </div>
                  <div style={{ marginLeft: "auto", background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "var(--success)", padding: "4px 12px", borderRadius: 8, fontSize: "0.78rem", fontWeight: 700 }}>
                    ✅ Confirmé
                  </div>
                </div>

                {/* Détails expandable */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid var(--border-subtle)", padding: "16px 20px", background: "var(--surface-inset-strong)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 16 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.82rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>👤 Destinataire</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.88rem" }}>
                          <div><span style={{ opacity: 0.5 }}>Nom : </span><strong>{colis.nom_destinataire}</strong></div>
                          <div><span style={{ opacity: 0.5 }}>Tél : </span><span style={{ fontFamily: "monospace" }}>{colis.telephone_destinataire}</span></div>
                          {colis.email_destinataire && <div><span style={{ opacity: 0.5 }}>Email : </span>{colis.email_destinataire}</div>}
                          <div><span style={{ opacity: 0.5 }}>Adresse : </span>{colis.adresse_livraison}</div>
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.82rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>📦 Détails</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: "0.88rem" }}>
                          <div><span style={{ opacity: 0.5 }}>N° suivi : </span><span style={{ fontFamily: "monospace", color: "var(--accent-soft)" }}>#{colis.numero_suivi}</span></div>
                          <div><span style={{ opacity: 0.5 }}>Poids : </span><strong>{colis.poids} kg</strong></div>
                          <div><span style={{ opacity: 0.5 }}>Prix : </span><strong style={{ color: "var(--success)" }}>{colis.prix} DT</strong></div>
                          {colis.prix_free && <div><span style={{ opacity: 0.5 }}>Remise : </span><strong style={{ color: "var(--danger)" }}>−{colis.prix_free} DT</strong></div>}
                          <div><span style={{ opacity: 0.5 }}>Créé le : </span>{colis.created_at ? new Date(colis.created_at).toLocaleString("fr-TN") : "—"}</div>
                        </div>
                      </div>
                    </div>
                    {produits.length > 0 && (
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "0.82rem", opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>🛍️ Produits ({produits.length})</div>
                        <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border-subtle)" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", background: "var(--surface-card)", padding: "8px 14px" }}>
                            {["Produit","Taille","Qté","Prix/u","Total"].map((h,i) => (
                              <div key={i} style={{ fontSize: "0.7rem", opacity: 0.5, textTransform: "uppercase", fontWeight: 700 }}>{h}</div>
                            ))}
                          </div>
                          {produits.map((p, i) => (
                            <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.06)", background: i%2===0?"transparent":"rgba(255,255,255,.02)" }}>
                              <div style={{ fontWeight: 700 }}>{p.nom}</div>
                              <div style={{ opacity: 0.8 }}>{p.taille||"—"}</div>
                              <div style={{ opacity: 0.8 }}>×{p.quantite}</div>
                              <div style={{ opacity: 0.8 }}>{Number(p.prix).toFixed(2)} DT</div>
                              <div style={{ fontWeight: 800, color: "var(--accent-soft)" }}>{((Number(p.quantite)||0)*(Number(p.prix)||0)).toFixed(2)} DT</div>
                            </div>
                          ))}
                          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,.12)", background: "var(--surface-deep)" }}>
                            <div style={{ gridColumn:"1/5", fontWeight: 700, opacity: 0.7, fontSize: "0.85rem" }}>Sous-total</div>
                            <div style={{ fontWeight: 900, color: "var(--success)" }}>{produits.reduce((s,p)=>s+(Number(p.quantite)||0)*(Number(p.prix)||0),0).toFixed(2)} DT</div>
                          </div>
                        </div>
                      </div>
                    )}
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
