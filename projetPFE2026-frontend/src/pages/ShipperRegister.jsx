import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import PasswordInput from "./PasswordInput";
import ThemeToggleButton from "../components/ThemeToggleButton.jsx";

export default function ShipperRegister() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+216 ");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();

    if (loading) return;

    if (error) {
      setMsg("Numéro invalide");
      return;
    }

    setMsg("");
    setLoading(true);

    try {
      await api.post("/auth/shipper/register", {
        full_name: name,
        email,
        phone,
        password,
      });

      navigate("/expediteur/login", {
        state: { msg: "Il faut attendre la confirmation de l’admin." },
      });
    } catch (err) {
      const data = err?.response?.data;

      if (Array.isArray(data?.detail)) {
        setMsg(data.detail[0].msg);
      } else if (typeof data?.detail === "string") {
        setMsg(data.detail);
      } else {
        setMsg("Erreur d’inscription");
      }
    } finally {
      setLoading(false);
    }
  }

  const formatPhone = (value) => {
    let chiffres = value.replace(/\D/g, "");

    if (!chiffres.startsWith("216")) {
      chiffres = "216" + chiffres;
    }

    let localNumber = chiffres.slice(3, 11);

    if (localNumber.length <= 2) {
      localNumber = localNumber;
    } else if (localNumber.length <= 5) {
      localNumber = `${localNumber.slice(0, 2)} ${localNumber.slice(2)}`;
    } else {
      localNumber = `${localNumber.slice(0, 2)} ${localNumber.slice(2, 5)} ${localNumber.slice(5, 8)}`;
    }

    const format = `+216 ${localNumber}`.trim();

    setError(localNumber.replace(/\s/g, "").length !== 8);

    return format;
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "min(520px, 92vw)",
          background: "var(--auth-panel-bg)",
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          padding: 18,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Inscription Expéditeur</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
              Crée ton compte — il sera validé par l’admin.
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
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom complet"
              required
              disabled={loading}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--surface-panel-soft)",
                color: "var(--text-primary)",
                padding: "12px 12px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="expediteur@mz.com"
              type="email"
              required
              disabled={loading}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--surface-panel-soft)",
                color: "var(--text-primary)",
                padding: "12px 12px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Téléphone</div>
            <input
              className={`authInput ${error ? "inputError" : ""}`}
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              inputMode="numeric"
              autoComplete="tel"
              required
              disabled={loading}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--surface-panel-soft)",
                color: "var(--text-primary)",
                padding: "12px 12px",
                outline: "none",
              }}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Mot de passe</div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            {loading ? "Création..." : "Créer un compte"}
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
            disabled={loading || error}
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
            J’ai déjà un compte
          </button>
        </form>
      </div>
    </div>
  );
}
