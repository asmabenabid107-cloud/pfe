import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client.js";

export default function Expediteurs() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  async function load() {
    setMsg("");
    setLoading(true);

    try {
      const res = await api.get("/admin/shippers/pending");
      setItems(res.data || []);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (status === 401) setMsg("Session expirée. Reconnecte-toi en admin.");
      else if (status === 403) setMsg("Accès refusé: tu n'es pas admin.");
      else setMsg(detail || err?.message || "Erreur chargement des demandes.");
    } finally {
      setLoading(false);
    }
  }

  async function approve(id) {
    setMsg("");
    try {
      await api.post(`/admin/shippers/${id}/approve`);
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.message || "Erreur approbation.");
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer cet expéditeur ?")) return;
    setMsg("");
    try {
      await api.delete(`/admin/shippers/${id}`);
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.message || "Erreur suppression.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 18 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: 12,
          flexWrap: "wrap",
          padding: 14,
          borderRadius: 18,
          border: "1px solid var(--border-soft)",
          background:
            "radial-gradient(900px 280px at 85% -30%, rgba(45,91,255,.25), transparent 60%), rgba(255,255,255,.04)",
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: 0.2 }}>
            Demandes expéditeurs
          </div>
          <div style={{ opacity: 0.78, fontSize: 13, marginTop: 4 }}>
            Liste des comptes en attente d’approbation.
          </div>
        </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
  <button
    onClick={() => navigate("/admin/expediteurs/approuves")}
    style={{
      borderRadius: 14,
      padding: "10px 14px",
      fontWeight: 900,
      border: "1px solid var(--success-border)",
      background: "var(--success-bg)",
      color: "var(--text-primary)",
      cursor: "pointer",
    }}
    type="button"
  >
    Voir approuvés
  </button>

  <button
    onClick={load}
    disabled={loading}
    style={{
      borderRadius: 14,
      padding: "10px 14px",
      fontWeight: 900,
      border: "1px solid var(--border-strong)",
      background: "var(--surface-card)",
      color: "var(--text-primary)",
      cursor: loading ? "not-allowed" : "pointer",
      opacity: loading ? 0.7 : 1,
    }}
    type="button"
  >
    {loading ? "Chargement..." : "Rafraîchir"}
  </button>
</div>
      </div>

      {/* Error message */}
      {msg && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 16,
            border: "1px solid var(--danger-border)",
            background: "var(--danger-bg)",
          }}
        >
          <div style={{ fontWeight: 800 }}>{msg}</div>

          {(msg.includes("Reconnecte") || msg.includes("Session expirée")) && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => {
                  localStorage.removeItem("admin_access_token");
                  navigate("/admin/login");
                }}
                style={{
                  borderRadius: 12,
                  padding: "10px 12px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-card)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                Aller au login admin
              </button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ display: "grid", gap: 10 }}>
            {new Array(4).fill(0).map((_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 18,
                  border: "1px solid var(--border-soft)",
                  background: "var(--surface-panel-soft)",
                  padding: 14,
                }}
              >
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ height: 12, width: 220, borderRadius: 999, background: "rgba(255,255,255,.10)" }} />
                  <div style={{ height: 10, width: 260, borderRadius: 999, background: "rgba(255,255,255,.08)" }} />
                  <div style={{ height: 10, width: 180, borderRadius: 999, background: "rgba(255,255,255,.08)" }} />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div
            style={{
              padding: 16,
              borderRadius: 18,
              border: "1px solid var(--border-soft)",
              background: "var(--surface-panel-soft)",
              opacity: 0.9,
            }}
          >
            Aucune demande en attente.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((u) => (
              <div
                key={u.id}
                style={{
                  borderRadius: 18,
                  border: "1px solid var(--border-soft)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.18))",
                  padding: 14,
                  boxShadow: "var(--shadow-soft)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                {/* Left */}
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ fontWeight: 950, fontSize: 16 }}>{u.name}</div>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid var(--border-strong)",
                        background: "var(--surface-card)",
                        opacity: 0.92,
                      }}
                    >
                      En attente
                    </span>
                  </div>

                  <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.9 }}>
                      <span style={{ opacity: 0.75, width: 64, fontSize: 12 }}>Email</span>
                      <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis" }}>{u.email}</span>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", opacity: 0.9 }}>
                      <span style={{ opacity: 0.75, width: 64, fontSize: 12 }}>Tél</span>
                      <span style={{ fontSize: 13 }}>{u.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Right actions */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => approve(u.id)}
                    style={{
                      borderRadius: 14,
                      border: "1px solid var(--success-border)",
                      background: "var(--success-bg)",
                      color: "var(--text-primary)",
                      padding: "10px 14px",
                      fontWeight: 950,
                      cursor: "pointer",
                      minWidth: 120,
                    }}
                  >
                    Confirmer
                  </button>

                  <button
                    onClick={() => remove(u.id)}
                    style={{
                      borderRadius: 14,
                      border: "1px solid var(--danger-border)",
                      background: "rgba(255,95,95,.12)",
                      color: "var(--text-primary)",
                      padding: "10px 14px",
                      fontWeight: 950,
                      cursor: "pointer",
                      minWidth: 120,
                    }}
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

