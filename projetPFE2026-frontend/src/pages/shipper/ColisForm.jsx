import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import colisService from "../../api/colisService";
import ThemeToggleButton from "../../components/ThemeToggleButton.jsx";

// ── Tarif livraison selon poids ────────────────────────────────────
// 0–1 kg → 7 DT | 1–3 kg → 10 DT | 3–5 kg → 14 DT | 5–10 kg → 18 DT | >10 kg → 18 + 1.5/kg sup
function calculerPrix(poids) {
  const p = Number(poids);
  if (!p || p <= 0) return "";
  if (p <= 1)  return "7.00";
  if (p <= 3)  return "10.00";
  if (p <= 5)  return "14.00";
  if (p <= 10) return "18.00";
  return (18 + (p - 10) * 1.5).toFixed(2);
}

// ── Formatage téléphone XX XXX XXX ───────────────────────────────
function formatPhone(digits) {
  const d = digits.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 5) return d.slice(0, 2) + " " + d.slice(2);
  return d.slice(0, 2) + " " + d.slice(2, 5) + " " + d.slice(5);
}
function digitsOnly(v) { return v.replace(/\D/g, "").slice(0, 8); }

// ── Validations ──────────────────────────────────────────────────
function validateEmail(email) {
  if (!email) return null; // optionnel
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return re.test(email) ? null : "Format email invalide (ex: nom@domaine.com)";
}

function validateNom(nom) {
  if (!nom.trim()) return "Nom requis";
  if (/\d/.test(nom)) return "Le nom ne doit pas contenir de chiffres";
  if (/[^a-zA-ZÀ-ÿ\s\-']/.test(nom)) return "Caractères spéciaux non autorisés";
  if (nom.trim().length < 3) return "Minimum 3 caractères";
  return null;
}

function validatePhone(phone) {
  const d = digitsOnly(phone);
  if (!d) return "Téléphone requis";
  if (d.length !== 8) return `${d.length}/8 chiffres saisis`;
  return null;
}

function validatePhone2(phone) {
  if (!phone || digitsOnly(phone).length === 0) return null; // optionnel
  const d = digitsOnly(phone);
  if (d.length !== 8) return `${d.length}/8 chiffres saisis`;
  return null;
}

const STATUTS = {
  en_attente: { label: "En attente", bg: "rgba(245,158,11,0.15)",  color: "var(--warning)", border: "rgba(245,158,11,0.35)"  },
  en_transit: { label: "En transit", bg: "rgba(110,168,255,0.15)", color: "var(--accent-soft)", border: "rgba(110,168,255,0.35)" },
  livré:      { label: "Livré",      bg: "rgba(44,203,118,0.15)",  color: "var(--success)", border: "rgba(44,203,118,0.35)"  },
  annulé:     { label: "Annulé",     bg: "rgba(255,95,95,0.15)",   color: "var(--danger)", border: "rgba(255,95,95,0.35)"   },
  retour:     { label: "Retour",     bg: "rgba(167,139,250,0.15)", color: "var(--violet)", border: "rgba(167,139,250,0.35)" },
};

const TAILLES = ["XS", "S", "M", "L", "XL", "XXL", "Unique"];

const INITIAL_FORM = {
  adresse_livraison:  "",
  nom_destinataire:   "",
  telephone1:         "",
  telephone2:         "",
  email_destinataire: "",
  poids:              "",
  statut:             "en_attente",
  prix:               "",
  prix_free:          "",
  appliquerRemise:    false,  // ← choix libre de l'expéditeur
};

const inputStyle = {
  width: "100%", borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-panel-soft)",
  color: "var(--text-primary)", padding: "12px 12px",
  outline: "none", fontSize: "0.95rem", boxSizing: "border-box",
};
const labelStyle   = { fontSize: 12, opacity: 0.75, marginBottom: 6, display: "block" };
const sectionStyle = { borderRadius: 14, border: "1px solid var(--border-soft)", background: "var(--surface-panel-soft)", padding: 20 };

function errStyle(hasErr) { return { ...inputStyle, borderColor: hasErr ? "rgba(255,95,95,.55)" : "rgba(255,255,255,.14)" }; }
function ErrMsg({ msg }) { return msg ? <div style={{ fontSize: 12, marginTop: 4, color: "var(--danger)" }}>⚠ {msg}</div> : null; }

let pid = 0;
function newProduct() { return { _id: ++pid, nom: "", quantite: 1, prix: "", taille: "Unique" }; }

export default function ColisForm() {
  const navigate = useNavigate();
  const { id }   = useParams();
  const isEdit   = Boolean(id);

  const [form, setForm]               = useState(INITIAL_FORM);
  const [products, setProducts]       = useState([newProduct()]);
  const [errors, setErrors]           = useState({});
  const [loading, setLoading]         = useState(false);
  const [fetchLoading, setFetchLoading] = useState(isEdit);

  // ── Calculs ──────────────────────────────────────────────────────
  const totalProduits = products.reduce((s, p) => s + (Number(p.quantite)||0) * (Number(p.prix)||0), 0);
  const SEUIL         = 100;
  const remiseOk      = totalProduits >= SEUIL;
  const prixFree      = (remiseOk && form.appliquerRemise) ? (Number(form.prix_free) || 0) : 0;
  const prixFinal     = Math.max(0, totalProduits - prixFree);

  // Prix livraison auto selon poids
  useEffect(() => {
    if (!isEdit) {
      const auto = calculerPrix(form.poids);
      setForm(prev => ({ ...prev, prix: auto }));
    }
  }, [form.poids]);

  // Prix total = prix livraison + produits - remise
  const prixLivraison = Number(form.prix) || 0;
  const prixTotalFinal = Math.max(0, prixLivraison + totalProduits - prixFree);

  // ── Chargement edit ──────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit) return;
    colisService.getOne(id)
      .then(data => {
        const parts = (data.telephone_destinataire || "").split(" / ");
        setForm({
          adresse_livraison:  data.adresse_livraison  || "",
          nom_destinataire:   data.nom_destinataire   || "",
          telephone1:         formatPhone(digitsOnly(parts[0] || "")),
          telephone2:         formatPhone(digitsOnly(parts[1] || "")),
          email_destinataire: data.email_destinataire || "",
          poids:              data.poids  ?? "",
          statut:             data.statut || "en_attente",
          prix:               data.prix   ?? "",
          prix_free:          data.prix_free ?? "",
        });
        if (data.produits?.length)
          setProducts(data.produits.map(p => ({ ...p, _id: ++pid })));
      })
      .catch(() => { alert("Colis introuvable"); navigate("/expediteur/dashboard"); })
      .finally(() => setFetchLoading(false));
  }, [id]);

  // ── Validation live ──────────────────────────────────────────────
  const liveValidate = (name, value) => {
    switch (name) {
      case "nom_destinataire":   return validateNom(value);
      case "telephone1":         return validatePhone(value);
      case "telephone2":         return validatePhone2(value);
      case "email_destinataire": return validateEmail(value);
      case "adresse_livraison":  return value.trim() ? null : "Adresse requise";
      case "poids":              return (!value || Number(value) <= 0) ? "Poids invalide" : null;
      default:                   return null;
    }
  };

  // ── Handlers ─────────────────────────────────────────────────────
  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "telephone1" || name === "telephone2") {
      value = formatPhone(digitsOnly(value));
    }
    if (name === "prix_free" && Number(value) > totalProduits) return;

    setForm(prev => ({ ...prev, [name]: value }));

    // Validation live
    const err = liveValidate(name, value);
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleProduct = (pid, field, value) => {
    setProducts(prev => prev.map(p => p._id === pid ? { ...p, [field]: value } : p));
    if (errors[`p_${pid}_${field}`]) setErrors(prev => ({ ...prev, [`p_${pid}_${field}`]: null }));
  };

  const addProduct    = () => setProducts(prev => [...prev, newProduct()]);
  const removeProduct = (pid) => { if (products.length > 1) setProducts(prev => prev.filter(p => p._id !== pid)); };

  // ── Validation submit ────────────────────────────────────────────
  const validate = () => {
    const e = {};

    const nomErr   = validateNom(form.nom_destinataire);
    if (nomErr) e.nom_destinataire = nomErr;

    if (!form.adresse_livraison.trim()) e.adresse_livraison = "Adresse requise";

    const tel1Err = validatePhone(form.telephone1);
    if (tel1Err) e.telephone1 = tel1Err;

    const tel2Err = validatePhone2(form.telephone2);
    if (tel2Err) e.telephone2 = tel2Err;

    const emailErr = validateEmail(form.email_destinataire);
    if (emailErr) e.email_destinataire = emailErr;

    if (!form.poids || Number(form.poids) <= 0) e.poids = "Poids invalide";

    products.forEach(p => {
      if (!p.nom.trim())                         e[`p_${p._id}_nom`]      = "Nom requis";
      if (!p.quantite || Number(p.quantite) < 1) e[`p_${p._id}_quantite`] = "≥ 1";
      if (p.prix === "" || Number(p.prix) < 0)   e[`p_${p._id}_prix`]     = "Prix invalide";
    });

    return e;
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const payload = {
        adresse_livraison:      form.adresse_livraison,
        nom_destinataire:       form.nom_destinataire,
        telephone_destinataire: digitsOnly(form.telephone1) + (digitsOnly(form.telephone2) ? ` / ${digitsOnly(form.telephone2)}` : ""),
        email_destinataire:     form.email_destinataire || null,
        poids:                  Number(form.poids),
        statut:                 form.statut,
        prix:                   prixTotalFinal,
        prix_free:              prixFree || null,
        produits:               products.map(({ _id, ...r }) => ({ nom: r.nom, quantite: Number(r.quantite), prix: Number(r.prix), taille: r.taille })),
      };
      if (isEdit) { await colisService.update(id, payload); navigate("/expediteur/dashboard"); }
      else        { await colisService.create(payload);     navigate("/expediteur/colis/tous"); }
    } catch (err) {
      alert(err?.response?.data?.detail || `Erreur (${err?.response?.status || "?"})`);
    } finally { setLoading(false); }
  };

  if (fetchLoading) return <p style={{ textAlign: "center", marginTop: 60, color: "var(--text-primary)" }}>Chargement...</p>;

  const si = STATUTS[form.statut] || STATUTS.en_attente;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page-bg)", color: "var(--text-primary)", fontFamily: "system-ui, Arial, sans-serif", paddingBottom: 40 }}>

      {/* HEADER */}
      <header style={{ position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--header-bg)", borderBottom: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)", padding: "14px 28px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#7aa2ff", boxShadow: "0 0 0 6px rgba(122,162,255,0.15)" }} />
          <span style={{ fontWeight: 900 }}>🚚 MZ Logistic</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <ThemeToggleButton compact />
          <button type="button" onClick={() => navigate("/expediteur/dashboard")}
            style={{ background: "var(--surface-card)", border: "1px solid var(--border-soft)", color: "var(--text-primary)", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>
            ← Retour
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 16px" }}>

        <div style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 900 }}>{isEdit ? "✏️ Modifier le colis" : "📦 Nouveau colis"}</h1>
          <p style={{ margin: "4px 0 0", opacity: 0.6, fontSize: "0.9rem" }}>{isEdit ? "Modifiez les informations" : "Remplissez les informations du colis"}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── DESTINATAIRE ── */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 800, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.07)" }}>👤 Coordonnées du destinataire</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

              <div>
                <label style={labelStyle}>Nom complet *</label>
                <input name="nom_destinataire" value={form.nom_destinataire} onChange={handleChange}
                  placeholder="Ex: Mohamed Ali"
                  style={errStyle(errors.nom_destinataire)} />
                <ErrMsg msg={errors.nom_destinataire} />
                {!errors.nom_destinataire && form.nom_destinataire.trim().length >= 3 && (
                  <div style={{ fontSize: 11, color: "var(--success)", marginTop: 3 }}>✓ Nom valide</div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Email <span style={{ opacity: 0.5 }}>(optionnel)</span></label>
                <input name="email_destinataire" value={form.email_destinataire} onChange={handleChange}
                  type="text" placeholder="nom@domaine.com"
                  style={errStyle(errors.email_destinataire)} />
                <ErrMsg msg={errors.email_destinataire} />
                {!errors.email_destinataire && form.email_destinataire && (
                  <div style={{ fontSize: 11, color: "var(--success)", marginTop: 3 }}>✓ Email valide</div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Téléphone 1 * <span style={{ opacity: 0.4, fontWeight: 400 }}>format: XX XXX XXX</span></label>
                <div style={{ position: "relative" }}>
                  <input name="telephone1" value={form.telephone1} onChange={handleChange}
                    placeholder="XX XXX XXX" inputMode="numeric"
                    style={{ ...errStyle(errors.telephone1), paddingRight: 50, letterSpacing: "0.08em" }} />
                  <span style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    fontSize: "0.72rem", opacity: 0.5, fontFamily: "monospace"
                  }}>
                    {digitsOnly(form.telephone1).length}/8
                  </span>
                </div>
                <ErrMsg msg={errors.telephone1} />
                {!errors.telephone1 && digitsOnly(form.telephone1).length === 8 && (
                  <div style={{ fontSize: 11, color: "var(--success)", marginTop: 3 }}>✓ Numéro valide</div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Téléphone 2 <span style={{ opacity: 0.4, fontWeight: 400 }}>optionnel · XX XXX XXX</span></label>
                <div style={{ position: "relative" }}>
                  <input name="telephone2" value={form.telephone2} onChange={handleChange}
                    placeholder="XX XXX XXX" inputMode="numeric"
                    style={{ ...errStyle(errors.telephone2), paddingRight: 50, letterSpacing: "0.08em" }} />
                  {form.telephone2 && (
                    <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: "0.72rem", opacity: 0.5, fontFamily: "monospace" }}>
                      {digitsOnly(form.telephone2).length}/8
                    </span>
                  )}
                </div>
                <ErrMsg msg={errors.telephone2} />
                {!errors.telephone2 && digitsOnly(form.telephone2).length === 8 && (
                  <div style={{ fontSize: 11, color: "var(--success)", marginTop: 3 }}>✓ Numéro valide</div>
                )}
              </div>
            </div>
          </div>

          {/* ── ADRESSE ── */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 800, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.07)" }}>📍 Adresse de livraison</div>
            <label style={labelStyle}>Adresse complète *</label>
            <textarea name="adresse_livraison" value={form.adresse_livraison} onChange={handleChange}
              placeholder="Ex: 12 Rue des Roses, Tunis Centre" rows={3}
              style={{ ...errStyle(errors.adresse_livraison), resize: "vertical" }} />
            <ErrMsg msg={errors.adresse_livraison} />
          </div>

          {/* ── PRODUITS ── */}
          <div style={sectionStyle}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.07)" }}>
              <div style={{ fontWeight: 800 }}>🛍️ Produits</div>
              <button type="button" onClick={addProduct}
                style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", color: "var(--accent-soft)", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 700, fontSize: "0.82rem" }}>
                + Ajouter produit
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 100px 36px", gap: 8, padding: "0 4px 6px", borderBottom: "1px solid rgba(255,255,255,.06)", marginBottom: 8 }}>
              {["Nom produit", "Qté", "Prix/u (DT)", "Taille", ""].map((h, i) => (
                <div key={i} style={{ fontSize: "0.7rem", opacity: 0.45, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {products.map(p => (
                <div key={p._id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 100px 100px 36px", gap: 8, alignItems: "start", background: "rgba(0,0,0,.15)", borderRadius: 10, padding: 10 }}>
                  <div>
                    <input value={p.nom} onChange={e => handleProduct(p._id, "nom", e.target.value)} placeholder="Ex: T-shirt"
                      style={{ ...inputStyle, padding: "9px 10px", borderColor: errors[`p_${p._id}_nom`] ? "rgba(255,95,95,.55)" : "rgba(255,255,255,.14)" }} />
                    {errors[`p_${p._id}_nom`] && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>⚠ {errors[`p_${p._id}_nom`]}</div>}
                  </div>
                  <div>
                    <input type="number" min="1" value={p.quantite} onChange={e => handleProduct(p._id, "quantite", e.target.value)}
                      style={{ ...inputStyle, padding: "9px 8px", textAlign: "center", borderColor: errors[`p_${p._id}_quantite`] ? "rgba(255,95,95,.55)" : "rgba(255,255,255,.14)" }} />
                    {errors[`p_${p._id}_quantite`] && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>⚠ {errors[`p_${p._id}_quantite`]}</div>}
                  </div>
                  <div>
                    <input type="number" min="0" step="0.1" value={p.prix} placeholder="0"
                      onChange={e => handleProduct(p._id, "prix", e.target.value)}
                      style={{ ...inputStyle, padding: "9px 8px", borderColor: errors[`p_${p._id}_prix`] ? "rgba(255,95,95,.55)" : "rgba(255,255,255,.14)" }} />
                    {errors[`p_${p._id}_prix`] && <div style={{ fontSize: 11, color: "var(--danger)", marginTop: 2 }}>⚠ {errors[`p_${p._id}_prix`]}</div>}
                  </div>
                  <select value={p.taille} onChange={e => handleProduct(p._id, "taille", e.target.value)}
                    style={{ ...inputStyle, padding: "9px 6px", cursor: "pointer" }}>
                    {TAILLES.map(t => <option key={t} value={t} style={{ background: "var(--auth-panel-bg)" }}>{t}</option>)}
                  </select>
                  <button type="button" onClick={() => removeProduct(p._id)} disabled={products.length === 1}
                    style={{ background: "rgba(255,95,95,.12)", border: "1px solid rgba(255,95,95,.25)", color: "var(--danger)", borderRadius: 8, padding: "9px 0", cursor: products.length === 1 ? "not-allowed" : "pointer", opacity: products.length === 1 ? 0.35 : 1, fontWeight: 700, width: "100%" }}>
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, padding: "10px 14px", background: "var(--surface-inset-strong)", borderRadius: 10, alignItems: "center", gap: 8 }}>
              <span style={{ opacity: 0.6, fontSize: "0.88rem" }}>Sous-total produits :</span>
              <strong style={{ color: "var(--accent-soft)", fontSize: "1.05rem" }}>{totalProduits.toFixed(2)} DT</strong>
              {remiseOk && <span style={{ background: "rgba(44,203,118,.15)", border: "1px solid var(--success-border)", color: "var(--success)", padding: "2px 8px", borderRadius: 8, fontSize: "0.72rem", fontWeight: 700 }}>🎉 Remise disponible !</span>}
            </div>
          </div>

          {/* ── DÉTAILS COLIS ── */}
          <div style={sectionStyle}>
            <div style={{ fontWeight: 800, marginBottom: 16, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,.07)" }}>📦 Détails du colis</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14 }}>

              {/* Poids */}
              <div>
                <label style={labelStyle}>Poids (kg) *</label>
                <input name="poids" value={form.poids} onChange={handleChange}
                  type="number" placeholder="0.5" step="0.1" min="0.1"
                  style={errStyle(errors.poids)} />
                <ErrMsg msg={errors.poids} />
              </div>

              {/* Prix livraison auto */}
              <div>
                <label style={labelStyle}>
                  Frais livraison (DT)
                  <span style={{ marginLeft: 6, fontSize: "0.65rem", opacity: 0.5, fontWeight: 400 }}>calculé auto</span>
                </label>
                <div style={{ ...inputStyle, background: "var(--accent-bg-soft)", border: "1px solid rgba(110,168,255,.25)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--accent-soft)", fontWeight: 800 }}>{form.prix || "—"}</span>
                  <span style={{ fontSize: "0.65rem", opacity: 0.5 }}>DT</span>
                </div>
                {form.poids && (
                  <div style={{ fontSize: "0.7rem", opacity: 0.5, marginTop: 4 }}>
                    {Number(form.poids) <= 1 ? "≤1 kg" : Number(form.poids) <= 3 ? "1–3 kg" : Number(form.poids) <= 5 ? "3–5 kg" : Number(form.poids) <= 10 ? "5–10 kg" : ">10 kg"} → {form.prix} DT
                  </div>
                )}
              </div>

              {/* Prix free remise — optionnelle */}
              <div>
                <label style={labelStyle}>
                  Remise (DT)
                  {remiseOk
                    ? <span style={{ marginLeft: 6, background: "rgba(44,203,118,.15)", border: "1px solid rgba(44,203,118,.3)", color: "var(--success)", padding: "1px 7px", borderRadius: 8, fontSize: "0.66rem", fontWeight: 700 }}>✓ Éligible</span>
                    : <span style={{ marginLeft: 6, opacity: 0.4, fontSize: "0.68rem" }}>≥ {SEUIL} DT requis</span>
                  }
                </label>

                {/* Toggle appliquer remise */}
                {remiseOk && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, cursor: "pointer" }}>
                    <div
                      onClick={() => {
                        setForm(prev => ({ ...prev, appliquerRemise: !prev.appliquerRemise, prix_free: !prev.appliquerRemise ? prev.prix_free : "" }));
                      }}
                      style={{
                        width: 36, height: 20, borderRadius: 10, position: "relative", transition: "background 0.2s",
                        background: form.appliquerRemise ? "rgba(44,203,118,.6)" : "rgba(255,255,255,.15)",
                        border: form.appliquerRemise ? "1px solid rgba(44,203,118,.8)" : "1px solid rgba(255,255,255,.2)",
                        cursor: "pointer", flexShrink: 0,
                      }}>
                      <div style={{
                        position: "absolute", top: 2, left: form.appliquerRemise ? 18 : 2,
                        width: 14, height: 14, borderRadius: "50%", background: "white", transition: "left 0.2s",
                      }} />
                    </div>
                    <span style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                      {form.appliquerRemise ? "Remise activée" : "Appliquer une remise ?"}
                    </span>
                  </label>
                )}

                <input name="prix_free" value={form.prix_free} onChange={handleChange}
                  type="number" placeholder="0" min="0" max={totalProduits}
                  disabled={!remiseOk || !form.appliquerRemise}
                  style={{
                    ...inputStyle,
                    opacity: (remiseOk && form.appliquerRemise) ? 1 : 0.35,
                    cursor: (remiseOk && form.appliquerRemise) ? "text" : "not-allowed",
                    borderColor: (remiseOk && form.appliquerRemise) ? "rgba(44,203,118,.4)" : "rgba(255,255,255,.10)",
                    background: (remiseOk && form.appliquerRemise) ? "rgba(44,203,118,.06)" : "rgba(255,255,255,.02)",
                  }} />
                {remiseOk && form.appliquerRemise && prixFree > 0 && (
                  <span style={{ fontSize: "0.7rem", color: "var(--success)", marginTop: 4, display: "block" }}>−{prixFree.toFixed(2)} DT appliqué</span>
                )}
                {!remiseOk && (
                  <span style={{ fontSize: "0.7rem", opacity: 0.4, marginTop: 4, display: "block" }}>Atteignez {SEUIL} DT en produits</span>
                )}
              </div>

              {/* Statut */}
              <div>
                <label style={labelStyle}>Statut</label>
                <div style={{ ...inputStyle, background: si.bg, border: `1px solid ${si.border}`, display: "flex", alignItems: "center" }}>
                  <span style={{ color: si.color, fontWeight: 800, fontSize: "0.85rem" }}>{si.label}</span>
                </div>
                <span style={{ fontSize: "0.7rem", opacity: 0.45, marginTop: 4, display: "block" }}>🔒 Géré par le livreur</span>
              </div>
            </div>

            {/* Récap total final */}
            <div style={{ marginTop: 14, padding: "14px 18px", borderRadius: 12, background: "var(--surface-deep)", border: "1px solid var(--border-subtle)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", opacity: 0.5, marginBottom: 4 }}>Produits</div>
                <div style={{ fontWeight: 800, color: "var(--accent-soft)" }}>{totalProduits.toFixed(2)} DT</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", opacity: 0.5, marginBottom: 4 }}>+ Livraison</div>
                <div style={{ fontWeight: 800, color: "var(--warning)" }}>{prixLivraison.toFixed(2)} DT</div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "0.7rem", opacity: 0.5, marginBottom: 4 }}>− Remise</div>
                <div style={{ fontWeight: 800, color: "var(--danger)" }}>{prixFree.toFixed(2)} DT</div>
              </div>
              <div style={{ textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.08)", paddingLeft: 12 }}>
                <div style={{ fontSize: "0.7rem", opacity: 0.5, marginBottom: 4 }}>= Total</div>
                <div style={{ fontWeight: 900, fontSize: "1.1rem", color: "var(--success)" }}>{prixTotalFinal.toFixed(2)} DT</div>
              </div>
            </div>
          </div>

          {/* ── ACTIONS ── */}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={() => navigate("/expediteur/dashboard")}
              style={{ padding: "12px 24px", border: "1px solid var(--border-strong)", borderRadius: 12, background: "var(--surface-card)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 700 }}>
              Annuler
            </button>
            <button type="submit" disabled={loading}
              style={{ padding: "12px 28px", border: "1px solid var(--accent-border)", borderRadius: 12, background: "var(--accent-bg)", color: "var(--text-primary)", cursor: "pointer", fontWeight: 800, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Enregistrement..." : isEdit ? "✓ Enregistrer les modifications" : "✓ Créer le colis"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ── Constante exposée pour les tests ─────────────────────────────
export { calculerPrix, formatPhone, digitsOnly, validateEmail, validateNom, validatePhone };
