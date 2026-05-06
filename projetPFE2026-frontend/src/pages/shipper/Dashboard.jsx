import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import colisService from "../../api/colisService";
import { api } from "../../api/client";
import "../../Dashboard.css";


// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_META = {
  en_attente: { label:"En attente", color:"#b45309", bg:"#fffbeb", border:"#fde68a" },
  en_transit:  { label:"En transit",  color:"#2563eb", bg:"#eff6ff", border:"#bfdbfe" },
  livre:       { label:"Livrés",      color:"#15803d", bg:"#f0fdf4", border:"#bbf7d0" },
  retour:      { label:"Retour",      color:"#6d28d9", bg:"#f5f3ff", border:"#ddd6fe" },
};

const STAT_CONFIG = [
  { key:"total",      label:"Total colis", noClick:true,  colorVal:"#2563eb", bgIco:"#eff6ff" },
  { key:"en_attente", label:"En attente",  noClick:false, colorVal:"#b45309", bgIco:"#fffbeb" },
  { key:"en_transit", label:"En transit",  noClick:false, colorVal:"#2563eb", bgIco:"#eff6ff" },
  { key:"livre",      label:"Livrés",      noClick:false, colorVal:"#15803d", bgIco:"#f0fdf4" },
  { key:"retour",     label:"Retour",      noClick:false, colorVal:"#6d28d9", bgIco:"#f5f3ff" },
];

function normalizeStatus(v) {
  const r = String(v||"").toLowerCase();
  if (r.includes("attente")) return "en_attente";
  if (r.includes("transit")) return "en_transit";
  if (r.includes("livr"))    return "livre";
  if (r.includes("retour"))  return "retour";
  return r;
}

function notifRemaining(expiresAt) {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (isNaN(ms) || ms <= 0) return "Expirée";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Stat SVG icons ───────────────────────────────────────────────────────────
function StatIcon({ k, color }) {
  if (k === "total") return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="10" rx="1.5" stroke={color} strokeWidth="1.5"/><path d="M5 4V3a3 3 0 016 0v1" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
  if (k === "en_attente") return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke={color} strokeWidth="1.5"/><path d="M8 5v3.5l2 2" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>;
  if (k === "en_transit") return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="5" width="10" height="7" rx="1" stroke={color} strokeWidth="1.4"/><path d="M11 7h2.5l1.5 2v2h-4V7z" stroke={color} strokeWidth="1.4" strokeLinejoin="round"/><circle cx="4" cy="13" r="1.2" fill={color}/><circle cx="12" cy="13" r="1.2" fill={color}/></svg>;
  if (k === "livre") return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2.5 8.5l3.5 3.5 7-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8h8a3 3 0 010 6H7" stroke={color} strokeWidth="1.5" strokeLinecap="round"/><path d="M6 5L3 8l3 3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

// ─── Colis card ───────────────────────────────────────────────────────────────
function ColisCard({ colis }) {
  const key = normalizeStatus(colis.statut);
  const m =
    STATUS_META[key] || {
      label: colis.statut,
      color: "#94a3b8",
      bg: "rgba(148,163,184,0.10)",
      border: "rgba(148,163,184,0.30)",
    };

  const date = colis.created_at
    ? new Date(colis.created_at).toLocaleDateString("fr-TN")
    : "-";

  const prix = Number(colis.prix);
  const prixText = Number.isFinite(prix) ? `${prix.toFixed(3)} DT` : "0.000 DT";

  return (
    <div className="dash-cc">
      <div className="dash-cc-top">
        <span className="dash-cc-num">#{colis.numero_suivi}</span>
        <span
          className="dash-pill"
          style={{
            color: m.color,
            background: m.bg,
            borderColor: m.border,
          }}
        >
          {m.label}
        </span>
      </div>

      <div className="dash-cc-body">
        <div className="dash-cc-lbl">DESTINATAIRE</div>
        <div className="dash-cc-name">{colis.nom_destinataire}</div>
        <div className="dash-cc-sub">{colis.telephone_destinataire}</div>
        {colis.email_destinataire && (
          <div className="dash-cc-sub">{colis.email_destinataire}</div>
        )}

        <div className="dash-cc-lbl">ADRESSE</div>
        <div className="dash-cc-address">{colis.adresse_livraison}</div>

        <div className="dash-cc-foot">
          <div>
            <div className="dash-cc-ml">Poids</div>
            <div className="dash-cc-mv">{colis.poids} kg</div>
          </div>

          <div>
            <div className="dash-cc-ml">Prix</div>
            <div className="dash-cc-mv price">{prixText}</div>
          </div>

          <div>
            <div className="dash-cc-ml">Date</div>
            <div className="dash-cc-mv date">{date}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();

  const [colisList,     setColisList]     = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeStatut,  setActiveStatut]  = useState(null);
  const [user, setUser] = useState(null);

  const [showProfil,    setShowProfil]    = useState(false);
  const [profil,        setProfil]        = useState(null);
  const [profilEdit,    setProfilEdit]    = useState({ phone:"", email:"" });
  const [profilErrors,  setProfilErrors]  = useState({});
  const [profilLoading, setProfilLoading] = useState(false);
  const [profilSuccess, setProfilSuccess] = useState(false);



  async function loadUser() {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data || null);
    } catch (err) {
      if (err?.response?.status !== 401) console.error(err);
      setUser(null);
    }
  }

  useEffect(() => {
    loadDashboard();
    loadUser();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const [colisData, notifData] = await Promise.all([
        colisService.getAll(),
        colisService.getNotifications(),
      ]);
      setColisList(Array.isArray(colisData) ? colisData : []);
      setNotifications(Array.isArray(notifData) ? notifData : []);
    } catch(e) {
      if (e?.response?.status !== 401) console.error(e);
    }
    finally { setLoading(false); }
  }

  async function dismissNotif(id) {
    try { await colisService.markNotificationRead(id); setNotifications(p => p.filter(n => n.id !== id)); }
    catch(e) { console.error(e); }
  }

  async function dismissAll() {
    try { await colisService.markAllNotificationsRead(); setNotifications([]); }
    catch(e) { console.error(e); }
  }

  async function openNotification(notif) {
    try { await colisService.markNotificationRead(notif.id); setNotifications(p => p.filter(n => n.id !== notif.id)); }
    catch(e) { console.error(e); }
    navigate("/expediteur/colis/tous");
  }

  async function openProfil() {
    setShowProfil(true); setProfilSuccess(false); setProfilErrors({});
    try {
      const { data } = await api.get("/auth/me");
      setProfil(data);
      setProfilEdit({ phone: data.phone||"", email:data.email||"" });
    } catch(e) { console.error(e); setProfil(null); }
  }

  function handleProfilChange(e) {
    const { name, value } = e.target;
    setProfilEdit(p => ({ ...p, [name]: value }));
    if (profilErrors[name]) setProfilErrors(p => ({ ...p, [name]: null }));
  }

  async function handleProfilSave() {
    if (!profilEdit.email.trim()) { setProfilErrors({ email:"Email requis" }); return; }
    setProfilLoading(true);
    try {
      const { data } = await api.patch("/auth/me", { phone:profilEdit.phone, email:profilEdit.email });
      setProfil(data);
      setUser(data);
      setProfilEdit({ phone:data.phone||"", email:data.email||"" });
      setProfilSuccess(true);
      setTimeout(() => setProfilSuccess(false), 3000);
    } catch(e) { alert(e.response?.data?.detail || "Erreur serveur"); }
    finally { setProfilLoading(false); }
  }

  function handleLogout() {
    localStorage.removeItem("shipper_access_token");
    navigate("/expediteur/login");
  }

  const counts = useMemo(() => ({
    total:      colisList.length,
    en_attente: colisList.filter(c => normalizeStatus(c.statut) === "en_attente").length,
    en_transit: colisList.filter(c => normalizeStatus(c.statut) === "en_transit").length,
    livre:      colisList.filter(c => normalizeStatus(c.statut) === "livre").length,
    retour:     colisList.filter(c => normalizeStatus(c.statut) === "retour").length,
  }), [colisList]);

  const filteredColis = useMemo(() => {
    if (!activeStatut) return [];
    return colisList.filter(c => normalizeStatus(c.statut) === activeStatut);
  }, [activeStatut, colisList]);

  const showingNotifs = activeStatut === null;
  const userName = user?.name || "Expéditeur";

  const nom = user?.name || "Expéditeur";

const civilite =
  user?.gender === "female" || user?.gender === "feminin"
    ? "Madame"
    : user?.gender === "male" || user?.gender === "masculin"
    ? "Monsieur"
    : "";

  const welcomeText = user ? `${civilite} ${nom}` : "Expéditeur";

  return (
    <div className="dash-root">
      <div className="dash-shell">

        {/* Sidebar */}
        <aside className="dash-sidebar">
          <div className="dash-sb-logo">
            <div className="dash-sb-dot" />
            <span className="dash-sb-name">MZ Logistic</span>
          </div>
          <nav className="dash-sb-nav">
            <div className="dash-sb-sec">Principal</div>
            <button className="dash-sb-link active">
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              Tableau de bord
            </button>
            <div className="dash-sb-sec">Colis</div>
            <button className="dash-sb-link" onClick={() => navigate("/expediteur/colis/nouveau")}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Nouveau colis
            </button>
            <button className="dash-sb-link" onClick={() => navigate("/expediteur/colis/tous")}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="3" width="13" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              Liste colis
            </button>
            <button className="dash-sb-link" onClick={() => navigate("/expediteur/colis/historique")}>
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5l2 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
              Historique
            </button>
          </nav>
          <div className="dash-sb-bottom">
            <div className="dash-sb-user">
              <div className="dash-sb-avatar">{userName?.split(" ").map(n => n[0]).join("").toUpperCase()}</div>
              <div>
                <div className="dash-sb-uname">{userName}</div>
                <div className="dash-sb-urole">Expéditeur</div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <div className="dash-main">
          <div className="dash-topbar">
            <span className="dash-topbar-title">Tableau de bord</span>
            <div className="dash-topbar-right">
              <button className="dash-btn" onClick={openProfil}>Mon profil</button>
              <button className="dash-btn dash-btn-danger" onClick={handleLogout}>Déconnexion</button>
            </div>
          </div>

          <div className="dash-page">

            {/* Hero */}
            <div className="dash-hero">
              <div className="dash-hero-greeting">Espace expéditeur</div>
              <div className="dash-hero-title">Bienvenue, {welcomeText} 👋</div>
              <div className="dash-hero-sub">Gérez vos colis et suivez les statuts en temps réel.</div>
            </div>

            {/* Stats */}
            <div className="dash-stats">
              {STAT_CONFIG.map(s => {
                const isActive = activeStatut === s.key;
                const m = STATUS_META[s.key];
                return (
                  <div
                    key={s.key}
                    className={`dash-sc${s.noClick ? " no-click" : ""}${isActive ? " active" : ""}`}
                    style={isActive ? { borderColor:m?.border, background:m?.bg } : {}}
                    onClick={() => { if (s.noClick) return; setActiveStatut(p => p === s.key ? null : s.key); }}
                  >
                    <div className="dash-sc-ico" style={{ background:s.bgIco }}>
                      <StatIcon k={s.key} color={s.colorVal} />
                    </div>
                    <div className="dash-sc-val" style={{ color:s.colorVal }}>
                      {loading ? "—" : counts[s.key]}
                    </div>
                    <div className="dash-sc-lbl">{s.label}</div>
                    {!s.noClick && <div className="dash-sc-hint">{isActive ? "Fermer" : "Voir"}</div>}
                  </div>
                );
              })}
            </div>

            {/* Notifications / Colis panel */}
            <div className="dash-notif-panel">
              <div className="dash-notif-head">
                <div>
                  <div className="dash-notif-title">
                    {showingNotifs ? "Notifications" : `Colis — ${STATUS_META[activeStatut]?.label}`}
                  </div>
                  <div className="dash-notif-sub">
                    {showingNotifs ? (
                      <>
                        <span>{notifications.length > 0 ? `${notifications.length} message${notifications.length > 1 ? "s" : ""} de l'administration` : "Aucune nouvelle notification"}</span>
                        {notifications.length > 0 && <span className="dash-notif-tag">expire après 48h</span>}
                      </>
                    ) : (
                      <span>{filteredColis.length} colis trouvés</span>
                    )}
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {showingNotifs && notifications.length > 0 && (
                    <button className="dash-dismiss-all" onClick={dismissAll}>Tout marquer comme lu</button>
                  )}
                  {!showingNotifs && (
                    <button className="dash-clear-btn" onClick={() => setActiveStatut(null)}>✕ Fermer</button>
                  )}
                </div>
              </div>

              {showingNotifs ? (
                notifications.length === 0 ? (
                  <div className="dash-empty">
                    <div className="dash-empty-ico">🔔</div>
                    <div className="dash-empty-txt">Aucune notification</div>
                  </div>
                ) : (
                  notifications.map(n => {
                    const ok = n.kind === "approved";
                    return (
                      <div key={n.id} className={`dash-notif-item ${ok ? "ok" : "ko"}`} onClick={() => openNotification(n)}>
                        <div className={`dash-notif-ico ${ok ? "ok" : "ko"}`}>{ok ? "✓" : "✕"}</div>
                        <div style={{ flex:1 }}>
                          <div className={`dash-notif-name ${ok ? "ok" : "ko"}`}>{n.title}</div>
                          <div className="dash-notif-row">Destinataire : <b>{n.nom_destinataire}</b></div>
                          <div className="dash-notif-track">#{n.numero_suivi}</div>
                          <div className="dash-notif-note">
                            {n.note || (ok ? "Le colis a été confirmé par l'administration." : "Le colis a été refusé par l'administration.")}
                          </div>
                        </div>
                        <div className="dash-notif-side">
                          <button className="dash-notif-x" onClick={e => { e.stopPropagation(); dismissNotif(n.id); }}>×</button>
                          <span className="dash-notif-expire">expire dans {notifRemaining(n.expires_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )
              ) : (
                filteredColis.length === 0 ? (
                  <div className="dash-empty">
                    <div className="dash-empty-ico">📭</div>
                    <div className="dash-empty-txt">Aucun colis avec ce statut</div>
                  </div>
                ) : (
                  <div className="dash-colis-grid">
                    {filteredColis.map(c => <ColisCard key={c.id} colis={c} />)}
                  </div>
                )
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {showProfil && (
        <div className="dash-overlay" onClick={() => setShowProfil(false)}>
          <div className="dash-modal" onClick={e => e.stopPropagation()}>
            <div className="dash-modal-head">
              <div>
                <div className="dash-modal-title">Mon profil</div>
                <div className="dash-modal-sub">Compte expéditeur</div>
              </div>
              <button className="dash-modal-close" onClick={() => setShowProfil(false)}>×</button>
            </div>
            {profil === null ? (
              <p style={{ textAlign:"center", color:"#9ca3af", fontSize:12 }}>Chargement...</p>
            ) : (
              <>
                <div className="dash-info-block">
                  <div className="dash-info-row"><span className="dash-ir-key">Nom</span><span className="dash-ir-val">{profil.name}</span></div>
                  <div className="dash-info-row"><span className="dash-ir-key">Rôle</span><span className="dash-ir-val" style={{ color:"#2563eb" }}>{profil.role}</span></div>
                  <div className="dash-info-row"><span className="dash-ir-key">Statut</span><span className="dash-ir-val" style={{ color: profil.is_active ? "#15803d" : "#dc2626" }}>{profil.is_active ? "Actif" : "Inactif"}</span></div>
                </div>
                <div className="dash-field-lbl">Email *</div>
                <input name="email" type="email" value={profilEdit.email} onChange={handleProfilChange} className="dash-field" style={profilErrors.email ? { borderColor:"#fca5a5" } : {}} />
                {profilErrors.email && <div style={{ color:"#dc2626", fontSize:11, marginTop:-8, marginBottom:8 }}>{profilErrors.email}</div>}
                <div className="dash-field-lbl">Téléphone</div>
                <input name="phone" value={profilEdit.phone} onChange={handleProfilChange} placeholder="+216 XX XXX XXX" className="dash-field" />
                {profilSuccess && <div className="dash-success-bar">Profil mis à jour avec succès.</div>}
                <div className="dash-modal-btns">
                  <button className="dash-mbtn dash-mbtn-cancel" onClick={() => setShowProfil(false)}>Fermer</button>
                  <button className="dash-mbtn dash-mbtn-save" onClick={handleProfilSave} disabled={profilLoading}>
                    {profilLoading ? "Enregistrement..." : "Enregistrer"}
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
