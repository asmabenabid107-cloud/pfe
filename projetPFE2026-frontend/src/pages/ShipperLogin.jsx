import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { api } from "../api/client.js";
import PasswordInput from "./PasswordInput";
import ThemeToggleButton from "../components/ThemeToggleButton.jsx";

export default function ShipperLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const infoMsg = useMemo(() => location.state?.msg || "", [location.state]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setErr("");
    setLoading(true);

    try {
      const res = await api.post("/auth/shipper/login", { email, password });

      localStorage.setItem("shipper_access_token", res.data.access_token);

      navigate("/expediteur/dashboard");
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;

      if (status === 403) setErr(detail || "Compte en attente de confirmation admin");
      else setErr(detail || "Email ou mot de passe incorrect");
    } finally {
      setLoading(false);
    }
  }

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
            <div style={{ fontSize: 22, fontWeight: 800 }}>Connexion Expéditeur</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
              Accès à votre espace expéditeur MZ Logistic.
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

        {infoMsg && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid rgba(0,200,255,.35)",
              background: "var(--surface-panel-soft)",
              padding: "10px 12px",
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {infoMsg}
          </div>
        )}

        {err && (
          <div
            style={{
              borderRadius: 12,
              border: "1px solid var(--danger-border)",
              background: "var(--surface-panel-soft)",
              padding: "10px 12px",
              fontSize: 13,
              marginTop: 12,
            }}
          >
            {err}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="expediteur@mz.com"
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--surface-panel-soft)",
                color: "var(--text-primary)",
                padding: "12px 12px",
                outline: "none",
              }}
              required
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ fontSize: 12, opacity: 0.75 }}>Mot de passe</div>
              <Link
                to="/forgot-password"
                style={{
                  fontSize: 12,
                  color: "var(--accent-soft)",
                  textDecoration: "none",
                  opacity: 0.85,
                }}
              >
                Mot de passe oublié ?
              </Link>
            </div>

            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
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
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: 800,
              marginTop: 4,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>

          <div style={{ marginTop: 6, fontSize: 13, opacity: 0.9 }}>
            Pas encore de compte ? <Link to="/expediteur/register">Créer un compte</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
