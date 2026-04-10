import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import colisService from "../../api/colisService";
import { api } from "../../api/client";
import ThemeToggleButton from "../../components/ThemeToggleButton.jsx";

const STATUS_LABELS = {
  en_attente: { label: "En attente", color: "var(--warning)", bg: "rgba(245,158,11,0.15)",  border: "rgba(245,158,11,0.35)"  },
  retour:      { label: "Retour",      color: "var(--violet)", bg: "rgba(167,139,250,0.15)", border: "rgba(167,139,250,0.35)" },
  en_transit:  { label: "En transit", color: "var(--accent-soft)", bg: "rgba(110,168,255,0.15)", border: "rgba(110,168,255,0.35)" },
  livré:       { label: "Livré",      color: "var(--success)", bg: "rgba(44,203,118,0.15)",  border: "rgba(44,203,118,0.35)"  },
  annulé:      { label: "Annulé",     color: "var(--danger)", bg: "rgba(255,95,95,0.15)",   border: "rgba(255,95,95,0.35)"   },
};

const inputStyle = {
  width: "100%", borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-card)",
  color: "var(--text-primary)", padding: "11px 14px",
  outline: "none", fontSize: "0.95rem", boxSizing: "border-box",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [colisList, setColisList]         = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeStatut, setActiveStatut]   = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Profil
  const [showProfil, setShowProfil]       = useState(false);
  const [profil, setProfil]               = useState(null);
  const [profilEdit, setProfilEdit]       = useState({ phone: "", email: "" });
  const [profilErrors, setProfilErrors]   = useState({});
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilSuccess, setProfilSuccess] = useState(false);

  useEffect(() => { loadColis(); }, []);

  const loadColis = async () => {
    try {
      setLoading(true);
      const data = await colisService.getAll();
      const list = Array.isArray(data) ? data : [];
      setColisList(list);

      // ── Système notifications 48h ──
      const EXPIRE_MS = 48 * 60 * 60 * 1000; // 48 heures
      const now = Date.now();

      // Charger les notifs stockées { id, seenAt }
      let stored = [];
      try { stored = JSON.parse(localStorage.getItem("notifs_seen") || "[]"); } catch {}

      // Purger celles expirées (> 48h)
      stored = stored.filter(n => now - n.seenAt < EXPIRE_MS);
      localStorage.setItem("notifs_seen", JSON.stringify(stored));

      const seenIds = stored.map(n => n.id);

      // Colis avec admin_note pas encore vus (ou vus mais < 48h → déjà filtrés)
      const newNotifs = list.filter(c => c.admin_note && !seenIds.includes(c.id));
      setNotifications(newNotifs);
    } catch (err) {
      console.error("Erreur:", err);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotif = (id) => {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem("notifs_seen") || "[]"); } catch {}
    stored.push({ id, seenAt: Date.now() });
    localStorage.setItem("notifs_seen", JSON.stringify(stored));
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const dismissAllNotifs = () => {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem("notifs_seen") || "[]"); } catch {}
    const now = Date.now();
    notifications.forEach(n => stored.push({ id: n.id, seenAt: now }));
    localStorage.setItem("notifs_seen", JSON.stringify(stored));
    setNotifications([]);
  };

  const openProfil = async () => {
    setShowProfil(true);
    setProfilSuccess(false);
    setProfilErrors({});
    try {
      const { data } = await api.get("/auth/me");
      setProfil(data);
      setProfilEdit({ phone: data.phone || "", email: data.email || "" });
    } catch { setProfil(null); }
  };

  const handleProfilChange = (e) => {
    const { name, value } = e.target;
    setProfilEdit((prev) => ({ ...prev, [name]: value }));
    if (profilErrors[name]) setProfilErrors((prev) => ({ ...prev, [name]: null }));
  };

  const handleProfilSave = async () => {
    const e = {};
    if (!profilEdit.email.trim()) e.email = "Email requis";
    if (Object.keys(e).length > 0) { setProfilErrors(e); return; }
    setProfilLoading(true);
    try {
      const { data } = await api.patch("/auth/me", { phone: profilEdit.phone, email: profilEdit.email });
      setProfil(data);
      setProfilSuccess(true);
      setTimeout(() => setProfilSuccess(false), 3000);
    } catch (err) {
      alert(err.response?.data?.detail || "Erreur serveur");
    } finally {
      setProfilLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("shipper_access_token");
    navigate("/expediteur/login");
  };

  const handleStatClick = (statut) => {
    setActiveStatut((prev) => prev === statut ? null : statut);
  };

  const filteredColis = activeStatut
    ? colisList.filter(c => c.statut === activeStatut)
    : [];

  const stats = [
    { label: "Total colis", value: colisList.length,                                        color: "var(--accent-soft)", bg: "rgba(110,168,255,0.10)", statut: null,         clickable: false },
    { label: "En attente",  value: colisList.filter(c => c.statut === "en_attente").length, color: "var(--warning)", bg: "rgba(245,158,11,0.10)",  statut: "en_attente", clickable: true  },
    { label: "En transit",  value: colisList.filter(c => c.statut === "en_transit").length, color: "var(--accent-soft)", bg: "rgba(110,168,255,0.10)", statut: "en_transit", clickable: true  },
    { label: "Livrés",      value: colisList.filter(c => c.statut === "livré").length,      color: "var(--success)", bg: "rgba(44,203,118,0.10)",  statut: "livré",      clickable: true  },
    { label: "Retour",      value: colisList.filter(c => c.statut === "retour").length,     color: "var(--violet)", bg: "rgba(167,139,250,0.10)", statut: "retour",     clickable: true  },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "system-ui, Arial, sans-serif" }}>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--header-bg)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", padding: "14px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7aa2ff", boxShadow: "0 0 0 6px rgba(122,162,255,0.15)" }} />
          <span style={{ fontWeight: 900, fontSize: "1.1rem" }}>🚚 MZ Logistic</span>
          <span style={{ opacity: 0.4, margin: "0 4px" }}>|</span>
          <span style={{ opacity: 0.7, fontSize: "0.9rem" }}>Tableau de bord</span>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <ThemeToggleButton compact />
          <button onClick={openProfil} style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-card)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
            👤 Mon Profil
          </button>
          <button onClick={handleLogout} style={{ background: "rgba(255,95,95,.15)", border: "1px solid var(--danger-border)", color: "var(--danger)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
            ⏻ Déconnexion
          </button>
        </div>
      </header>

      {/* NOTIFICATIONS ADMIN */}
      {notifications.length > 0 && (
        <div style={{ padding: "16px 28px 0" }}>
          <div style={{ marginBottom: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: "1.1rem" }}>🔔</span>
              <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--warning)" }}>
                {notifications.length} notification{notifications.length > 1 ? "s" : ""} de l'admin
              </span>
              <span style={{ fontSize: "0.72rem", opacity: 0.45, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.25)", color: "var(--warning)", padding: "1px 8px", borderRadius: 8 }}>
                expire après 48h
              </span>
            </div>
            <button onClick={dismissAllNotifs} style={{ background: "none", border: "none", color: "var(--text-soft)", cursor: "pointer", fontSize: "0.78rem", textDecoration: "underline" }}>
              Tout marquer comme lu
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.map(n => {
              const accepted = n.admin_note === "accepté";

              // Calcul temps restant
              let stored = [];
              try { stored = JSON.parse(localStorage.getItem("notifs_seen") || "[]"); } catch {}
              const entry    = stored.find(s => s.id === n.id);
              const seenAt   = entry?.seenAt;
              const EXPIRE   = 48 * 60 * 60 * 1000;
              const remaining = seenAt ? Math.max(0, EXPIRE - (Date.now() - seenAt)) : EXPIRE;
              const hoursLeft = Math.floor(remaining / (60 * 60 * 1000));
              const minsLeft  = Math.floor((remaining % (60 * 60 * 1000)) / 60000);

              return (
                <div key={n.id} style={{
                  display: "flex", alignItems: "flex-start", gap: 14,
                  borderRadius: 14, padding: "14px 18px",
                  background: accepted ? "rgba(44,203,118,.07)" : "rgba(255,95,95,.07)",
                  border: `1px solid ${accepted ? "rgba(44,203,118,.35)" : "rgba(255,95,95,.35)"}`,
                }}>
                  <span style={{ fontSize: "1.6rem", marginTop: 2 }}>{accepted ? "✅" : "❌"}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: "0.95rem", color: accepted ? "#2ccb76" : "#ff5f5f", marginBottom: 4 }}>
                      Votre colis a été {accepted ? "accepté ✓" : "refusé ✗"} par l'admin
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ fontSize: "0.85rem" }}>
                        <span style={{ opacity: 0.6 }}>Destinataire : </span>
                        <strong>{n.nom_destinataire}</strong>
                      </div>
                      <div style={{ fontSize: "0.85rem" }}>
                        <span style={{ opacity: 0.6 }}>N° suivi : </span>
                        <span style={{ fontFamily: "monospace", color: "var(--accent-soft)", fontWeight: 700, fontSize: "0.9rem" }}>#{n.numero_suivi}</span>
                      </div>
                      {accepted ? (
                        <div style={{ marginTop: 4, fontSize: "0.8rem", color: "var(--success)", opacity: 0.8 }}>
                          ✓ Ce colis est confirmé et sera pris en charge par un livreur
                        </div>
                      ) : (
                        <div style={{ marginTop: 4, fontSize: "0.8rem", color: "var(--danger)", opacity: 0.8 }}>
                          ✗ Ce colis a été annulé — contactez l'admin pour plus d'info
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <button onClick={() => dismissNotif(n.id)} style={{ background: "none", border: "none", color: "var(--text-soft)", cursor: "pointer", fontSize: "1.1rem", padding: 0 }}>✕</button>
                    <div style={{ fontSize: "0.68rem", opacity: 0.45, textAlign: "right", whiteSpace: "nowrap" }}>
                      ⏱ expire dans {hoursLeft > 0 ? `${hoursLeft}h ${minsLeft}m` : `${minsLeft}m`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STATS — cliquables */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, padding: "24px 28px 0" }}>
        {stats.map((s) => {
          const isActive = activeStatut === s.statut && s.clickable;
          return (
            <div key={s.label} onClick={() => s.clickable && handleStatClick(s.statut)}
              style={{
                background: isActive ? s.bg : "rgba(255,255,255,.04)",
                border: isActive ? `2px solid ${s.color}` : "1px solid rgba(255,255,255,.08)",
                borderRadius: 14, padding: "18px 20px", textAlign: "center",
                cursor: s.clickable ? "pointer" : "default",
                transition: "all 0.2s ease",
                transform: isActive ? "translateY(-2px)" : "none",
                boxShadow: isActive ? `0 4px 20px ${s.color}33` : "none",
              }}>
              <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.82rem", opacity: 0.75, marginTop: 4 }}>{s.label}</div>
              {s.clickable && (
                <div style={{ fontSize: "0.68rem", opacity: 0.5, marginTop: 5 }}>
                  {isActive ? "▲ fermer" : "▼ voir"}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CONTENU PRINCIPAL */}
      <main style={{ padding: "24px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 900 }}>
              {activeStatut ? `Colis — ${STATUS_LABELS[activeStatut]?.label}` : "Mes Colis"}
            </h2>
            {activeStatut && (
              <p style={{ margin: "3px 0 0", opacity: 0.5, fontSize: "0.8rem" }}>
                {filteredColis.length} colis • cliquez sur le statut pour fermer
              </p>
            )}
          </div>
          <button onClick={() => navigate("/expediteur/colis/nouveau")}
            style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 12, padding: "10px 20px", cursor: "pointer", fontWeight: 800 }}>
            + Nouveau colis
          </button>
        </div>

        {/* Cartes filtrées ou zone vide */}
        {activeStatut ? (
          filteredColis.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px", opacity: 0.6 }}>
              <div style={{ fontSize: "2.5rem" }}>📭</div>
              <p>Aucun colis avec ce statut</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 14 }}>
              {filteredColis.map((colis) => (
                <ColisCardLecture key={colis.id} colis={colis} />
              ))}
            </div>
          )
        ) : (
          <div style={{ borderRadius: 14, border: "1px dashed rgba(255,255,255,.12)", background: "var(--surface-panel-faint)", padding: "60px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 14 }}>📦</div>
            <p style={{ margin: "0 0 24px", opacity: 0.6, fontSize: "0.95rem" }}>
              Gérez vos colis depuis les boutons ci-dessus
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/expediteur/colis/tous")}
                style={{ background: "var(--surface-card)", border: "1px solid var(--border-strong)", color: "var(--text-primary)", borderRadius: 12, padding: "12px 24px", cursor: "pointer", fontWeight: 700 }}>
                🗂️ Voir tous les colis ({loading ? "..." : colisList.length})
              </button>
              <button onClick={() => navigate("/expediteur/colis/nouveau")}
                style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--text-primary)", borderRadius: 12, padding: "12px 24px", cursor: "pointer", fontWeight: 800 }}>
                + Créer un nouveau colis
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL PROFIL */}
      {showProfil && (
        <div style={{ position: "fixed", inset: 0, background: "var(--overlay-bg)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div style={{ background: "var(--auth-panel-bg)", border: "1px solid var(--border-soft)", borderRadius: 16, padding: 28, width: "90%", maxWidth: 440 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "rgba(110,168,255,.2)", border: "1px solid rgba(110,168,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.3rem" }}>👤</div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: "1rem" }}>Mon Profil</div>
                  <div style={{ opacity: 0.6, fontSize: "0.8rem" }}>Informations de votre compte</div>
                </div>
              </div>
              <button onClick={() => setShowProfil(false)} style={{ background: "none", border: "none", color: "var(--text-primary)", fontSize: "1.4rem", cursor: "pointer", opacity: 0.6 }}>✕</button>
            </div>

            {profil === null ? (
              <p style={{ textAlign: "center", opacity: 0.6 }}>Chargement...</p>
            ) : (
              <>
                <div style={{ background: "var(--surface-panel-soft)", border: "1px solid var(--border-subtle)", borderRadius: 12, padding: 14, marginBottom: 18, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    { label: "Nom",    value: profil.name },
                    { label: "Rôle",   value: profil.role,   color: "var(--accent-soft)" },
                    { label: "Statut", value: profil.is_active ? "✅ Actif" : "❌ Inactif", color: profil.is_active ? "#2ccb76" : "#ff5f5f" },
                  ].map((row, i) => (
                    <div key={i}>
                      {i > 0 && <div style={{ borderTop: "1px solid var(--border-subtle)", marginBottom: 10 }} />}
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ opacity: 0.6, fontSize: "0.82rem" }}>{row.label}</span>
                        <span style={{ fontWeight: 700, color: row.color || "#e8eefc", textTransform: "capitalize" }}>{row.value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>📧 Email *</div>
                    <input name="email" type="email" value={profilEdit.email} onChange={handleProfilChange}
                      style={{ ...inputStyle, borderColor: profilErrors.email ? "rgba(255,95,95,.5)" : "rgba(255,255,255,.14)" }} />
                    {profilErrors.email && <span style={{ color: "var(--danger)", fontSize: "0.78rem" }}>{profilErrors.email}</span>}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>📱 Téléphone</div>
                    <input name="phone" value={profilEdit.phone} onChange={handleProfilChange}
                      placeholder="+216 XX XXX XXX" style={inputStyle} />
                  </div>
                </div>

                {profilSuccess && (
                  <div style={{ marginTop: 12, background: "var(--success-bg)", border: "1px solid var(--success-border)", color: "var(--success)", padding: "10px 14px", borderRadius: 10, fontSize: "0.88rem", fontWeight: 700 }}>
                    ✅ Profil mis à jour avec succès
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
                  <button onClick={() => setShowProfil(false)} style={{ flex: 1, padding: 12, border: "1px solid var(--border-strong)", borderRadius: 10, background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700 }}>
                    Fermer
                  </button>
                  <button onClick={handleProfilSave} disabled={profilLoading} style={{ flex: 1, padding: 12, border: "1px solid var(--accent-border)", borderRadius: 10, background: "var(--accent-bg)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 800, opacity: profilLoading ? 0.7 : 1 }}>
                    {profilLoading ? "Enregistrement..." : "💾 Enregistrer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Carte lecture seule — pas de boutons modifier/supprimer
function ColisCardLecture({ colis }) {
  const status = STATUS_LABELS[colis.statut] || { label: colis.statut, color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.3)" };
  return (
    <div style={{ borderRadius: 14, border: "1px solid var(--border-soft)", background: "var(--surface-panel-soft)", overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--surface-deep)", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
        <span style={{ fontFamily: "monospace", color: "var(--accent-soft)", fontSize: "0.85rem", fontWeight: 700 }}>
          #{colis.numero_suivi}
        </span>
        <span style={{ background: status.bg, border: `1px solid ${status.border}`, color: status.color, padding: "3px 10px", borderRadius: 20, fontSize: "0.75rem", fontWeight: 700 }}>
          {status.label}
        </span>
      </div>
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div>
          <div style={{ fontSize: "0.7rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Destinataire</div>
          <div style={{ fontWeight: 700 }}>{colis.nom_destinataire}</div>
          <div style={{ fontSize: "0.82rem", opacity: 0.7 }}>{colis.telephone_destinataire}</div>
        </div>
        <div>
          <div style={{ fontSize: "0.7rem", opacity: 0.5, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>Adresse</div>
          <div style={{ fontSize: "0.88rem", opacity: 0.9 }}>{colis.adresse_livraison}</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, background: "var(--surface-inset-strong)", borderRadius: 10, padding: 12 }}>
          <div>
            <div style={{ fontSize: "0.68rem", opacity: 0.5, marginBottom: 3 }}>Poids</div>
            <div style={{ fontWeight: 800 }}>{colis.poids} kg</div>
          </div>
          <div>
            <div style={{ fontSize: "0.68rem", opacity: 0.5, marginBottom: 3 }}>Prix</div>
            <div style={{ fontWeight: 800, color: "var(--success)" }}>{colis.prix} DT</div>
          </div>
        </div>
      </div>
    </div>
  );
}

