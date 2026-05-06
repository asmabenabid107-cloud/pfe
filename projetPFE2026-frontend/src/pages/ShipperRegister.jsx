import { useState } from "react";
import { useNavigate } from "react-router-dom";

import ThemeToggleButton from "../components/ThemeToggleButton.jsx";
import { api } from "../api/client.js";
import PasswordInput from "./PasswordInput";

const inputStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "var(--surface-panel-soft)",
  color: "var(--text-primary)",
  padding: "12px 12px",
  outline: "none",
};

export default function ShipperRegister() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+216 ");
  const [phone2, setPhone2] = useState("+216 ");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [gender, setGender] = useState("feminin");
  const [ouvrirColisParDefaut, setOuvrirColisParDefaut] = useState("non");
  const [password, setPassword] = useState("");
  const [errorPhone1, setErrorPhone1] = useState(false);
  const [errorPhone2, setErrorPhone2] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();

    if (loading) return;

    if (errorPhone1) {
      setMsg("Numero principal invalide");
      return;
    }

    if (errorPhone2) {
      setMsg("Deuxieme numero invalide");
      return;
    }

    setMsg("");
    setLoading(true);

    try {
      await api.post("/auth/shipper/register", {
        full_name: name,
        email,
        phone,
        phone2: phone2.replace(/\s/g, "") === "+216" ? null : phone2,
        city,
        address,
        gender,
        ouvrir_colis_par_defaut: ouvrirColisParDefaut,
        password,
      });

      navigate("/expediteur/login", {
        state: { msg: "Il faut attendre la confirmation de l admin." },
      });
    } catch (err) {
      const data = err?.response?.data;

      if (Array.isArray(data?.detail)) {
        setMsg(data.detail[0].msg);
      } else if (typeof data?.detail === "string") {
        setMsg(data.detail);
      } else {
        setMsg("Erreur d inscription");
      }
    } finally {
      setLoading(false);
    }
  }

  function formatPhone(value, setPhoneError, required = true) {
    let chiffres = value.replace(/\D/g, "");

    if (!chiffres.startsWith("216")) {
      chiffres = `216${chiffres}`;
    }

    let localNumber = chiffres.slice(3, 11);

    if (localNumber.length <= 2) {
      localNumber = localNumber;
    } else if (localNumber.length <= 5) {
      localNumber = `${localNumber.slice(0, 2)} ${localNumber.slice(2)}`;
    } else {
      localNumber = `${localNumber.slice(0, 2)} ${localNumber.slice(2, 5)} ${localNumber.slice(5, 8)}`;
    }

    const formatted = `+216 ${localNumber}`.trim();
    const digitCount = localNumber.replace(/\s/g, "").length;
    setPhoneError(required ? digitCount !== 8 : digitCount > 0 && digitCount !== 8);
    return formatted;
  }

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(560px, 92vw)",
          background: "var(--auth-panel-bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Inscription Expediteur</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
              Cree ton compte. Le bon de livraison pourra reutiliser ton adresse expediteur.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <ThemeToggleButton compact />
            <button
              onClick={() => navigate("/")}
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border-soft)",
                color: "var(--text-primary)",
                borderRadius: 12,
                padding: "10px 12px",
                cursor: "pointer",
                fontWeight: 700,
                height: 42,
              }}
              type="button"
            >
              Accueil
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Nom</div>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nom complet"
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email</div>
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="expediteur@mz.com"
              type="email"
              required
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Ville / point de depart</div>
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ex: Sousse"
              disabled={loading}
              style={inputStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Adresse expediteur</div>
            <textarea
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Adresse a afficher sur le bon de livraison"
              disabled={loading}
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>Genre</div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="gender"
                  value="feminin"
                  checked={gender === "feminin"}
                  onChange={(event) => setGender(event.target.value)}
                  disabled={loading}
                />
                Feminin
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="gender"
                  value="masculin"
                  checked={gender === "masculin"}
                  onChange={(event) => setGender(event.target.value)}
                  disabled={loading}
                />
                Masculin
              </label>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>
              Ouvrir le colis avant paiement
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="ouvrir_colis_par_defaut"
                  value="oui"
                  checked={ouvrirColisParDefaut === "oui"}
                  onChange={(event) => setOuvrirColisParDefaut(event.target.value)}
                  disabled={loading}
                />
                Oui
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                <input
                  type="radio"
                  name="ouvrir_colis_par_defaut"
                  value="non"
                  checked={ouvrirColisParDefaut === "non"}
                  onChange={(event) => setOuvrirColisParDefaut(event.target.value)}
                  disabled={loading}
                />
                Non
              </label>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Telephone principal</div>
            <input
              className={`authInput ${errorPhone1 ? "inputError" : ""}`}
              value={phone}
              onChange={(event) => setPhone(formatPhone(event.target.value, setErrorPhone1))}
              inputMode="numeric"
              autoComplete="tel"
              required
              disabled={loading}
              style={{
                ...inputStyle,
                border: errorPhone1 ? "1px solid red" : inputStyle.border,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Telephone 2 (optionnel)</div>
            <input
              className={`authInput ${errorPhone2 ? "inputError" : ""}`}
              value={phone2}
              onChange={(event) => setPhone2(formatPhone(event.target.value, setErrorPhone2, false))}
              inputMode="numeric"
              autoComplete="tel"
              disabled={loading}
              style={{
                ...inputStyle,
                border: errorPhone2 ? "1px solid red" : inputStyle.border,
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Mot de passe</div>
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--accent-border)",
              background: "var(--accent-bg)",
              color: "var(--text-primary)",
              padding: "12px 14px",
              cursor: "pointer",
              fontWeight: 800,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Creation..." : "Creer un compte"}
          </button>

          {msg && (
            <div
              style={{
                borderRadius: 12,
                border: "1px solid var(--danger-border)",
                background: "var(--surface-panel-soft)",
                padding: "10px 12px",
                fontSize: 13,
              }}
            >
              {msg}
            </div>
          )}

          <button
            type="button"
            onClick={() => navigate("/expediteur/login")}
            disabled={loading || errorPhone1 || errorPhone2}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border-soft)",
              background: "var(--surface-card)",
              color: "var(--text-primary)",
              padding: "12px 14px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            J ai deja un compte
          </button>
        </form>
      </div>
    </div>
  );
}
