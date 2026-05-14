import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import PasswordInput from "./PasswordInput";
import ThemeToggleButton from "../components/ThemeToggleButton.jsx";

export default function AdminLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.from || "/admin/dashboard";

  const [email, setEmail] = useState("admin@mz.com");
  const [password, setPassword] = useState("admin12345");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (loading) return;

    setMsg("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("admin_access_token", res.data.access_token);
      navigate(returnTo, { replace: true });
    } catch (err) {
      const detail = err?.response?.data?.detail;
      const fallback = err?.message || "Erreur de connexion admin";
      setMsg(detail || fallback);
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
            <div style={{ fontSize: 22, fontWeight: 800 }}>Connexion Admin</div>
            <div style={{ opacity: 0.75, fontSize: 13, marginTop: 4 }}>
              Acces au tableau de bord MZ Logistic.
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
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Email</div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@mz.com"
              disabled={loading}
              style={fieldStyle}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Mot de passe</div>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: "1 1 180px",
                borderRadius: 12,
                border: "1px solid var(--accent-border)",
                background: "var(--accent-bg)",
                color: "var(--text-primary)",
                padding: "12px 14px",
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 800,
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/expediteur/register")}
              style={{
                flex: "1 1 220px",
                borderRadius: 12,
                border: "1px solid var(--border-soft)",
                background: "var(--surface-card)",
                color: "var(--text-primary)",
                padding: "12px 14px",
                fontWeight: 700,
              }}
            >
              Creer un compte expediteur
            </button>
          </div>

          <button
            type="button"
            onClick={() => navigate("/expediteur/login")}
            style={{
              width: "100%",
              borderRadius: 12,
              border: "1px solid var(--border-soft)",
              background: "var(--surface-panel-soft)",
              color: "var(--text-primary)",
              padding: "12px 14px",
              fontWeight: 700,
            }}
          >
            Connexion expediteur
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
        </form>
      </div>
    </div>
  );
}

const fieldStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "var(--surface-panel-soft)",
  color: "var(--text-primary)",
  padding: "12px 12px",
  outline: "none",
};
