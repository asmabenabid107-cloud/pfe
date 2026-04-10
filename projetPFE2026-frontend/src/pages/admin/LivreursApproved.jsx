import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../../api/client.js";
import {
  COURIER_STATUS_OPTIONS,
  REGION_OPTIONS,
  getCourierStatusMeta,
} from "../../constants/courierOptions.js";

const fieldStyle = {
  width: "100%",
  borderRadius: 12,
  border: "1px solid var(--border-soft)",
  background: "var(--surface-card)",
  color: "var(--text-primary)",
  padding: "12px 14px",
  outline: "none",
};

function formatContractDate(value) {
  if (!value) return "Non definie";

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("fr-TN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export default function LivreursApproved() {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [editMode, setEditMode] = useState(null);
  const [editForm, setEditForm] = useState({
    assigned_region: REGION_OPTIONS[0],
    courier_status: "active",
    contract_end_date: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  async function load() {
    setMsg("");
    setLoading(true);
    try {
      const res = await api.get("/admin/couriers/approved");
      setItems(res.data || []);
    } catch (err) {
      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;
      if (status === 401) setMsg("Session expiree. Reconnecte-toi en admin.");
      else if (status === 403) setMsg("Acces refuse: tu n'es pas admin.");
      else setMsg(detail || err?.message || "Erreur chargement des livreurs approuves.");
    } finally {
      setLoading(false);
    }
  }

  function openRegionModal(courier) {
    setEditTarget(courier);
    setEditMode("region");
    setEditForm({
      assigned_region: courier.assigned_region || REGION_OPTIONS[0],
      courier_status: courier.manual_courier_status || courier.courier_status || "active",
      contract_end_date: courier.contract_end_date || "",
    });
  }

  function openStatusModal(courier) {
    setEditTarget(courier);
    setEditMode("status");
    setEditForm({
      assigned_region: courier.assigned_region || REGION_OPTIONS[0],
      courier_status: courier.manual_courier_status || courier.courier_status || "active",
      contract_end_date: courier.contract_end_date || "",
    });
  }

  function closeEditModal() {
    if (savingEdit) return;
    setEditTarget(null);
    setEditMode(null);
  }

  async function saveCourierChanges() {
    if (!editTarget || !editMode) return;

    setSavingEdit(true);
    setMsg("");
    try {
      const payload =
        editMode === "region"
          ? { assigned_region: editForm.assigned_region }
          : {
              courier_status: editForm.courier_status,
              contract_end_date: editForm.contract_end_date || null,
            };

      await api.patch(`/admin/couriers/${editTarget.id}`, {
        ...payload,
      });
      setEditTarget(null);
      setEditMode(null);
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.message || "Erreur mise a jour.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function remove(id) {
    if (!confirm("Supprimer ce livreur ?")) return;
    setMsg("");
    try {
      await api.delete(`/admin/couriers/${id}`);
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.detail || err?.message || "Erreur suppression.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 18 }}>
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
            "radial-gradient(900px 280px at 85% -30%, rgba(44,203,118,.20), transparent 60%), rgba(255,255,255,.04)",
        }}
      >
        <div>
          <div style={{ fontSize: 20, fontWeight: 950, letterSpacing: 0.2 }}>
            Livreurs approuves
          </div>
          <div style={{ opacity: 0.78, fontSize: 13, marginTop: 4 }}>
            Gere la region separement du statut et de la fin de contrat.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/admin/livreurs")}
            type="button"
            style={{
              borderRadius: 14,
              padding: "10px 14px",
              fontWeight: 900,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-card)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Retour demandes
          </button>

          <button
            onClick={load}
            disabled={loading}
            type="button"
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
          >
            {loading ? "Chargement..." : "Rafraichir"}
          </button>
        </div>
      </div>

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
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        {loading ? (
          <div style={{ opacity: 0.85 }}>Chargement...</div>
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
            Aucun livreur approuve.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((u) => {
              const statusMeta = getCourierStatusMeta(u.courier_status || "active");
              const accessLabel =
                (u.courier_status || "active") === "active"
                  ? "Compte accessible"
                  : (u.courier_status || "active") === "temporary_leave"
                    ? "Compte en pause"
                    : "Compte bloque";

              return (
                <div
                  key={u.id}
                  style={{
                    borderRadius: 18,
                    border: "1px solid var(--border-soft)",
                    background: "linear-gradient(180deg, var(--surface-card), var(--surface-inset))",
                    padding: 14,
                    boxShadow: "var(--shadow-soft)",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 950, fontSize: 16 }}>{u.name}</div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: `1px solid ${statusMeta.border}`,
                          background: statusMeta.bg,
                          color: statusMeta.color,
                        }}
                      >
                        {statusMeta.label}
                      </span>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 900,
                          padding: "6px 10px",
                          borderRadius: 999,
                          border: "1px solid var(--accent-border)",
                          background: "var(--accent-bg)",
                          color: "#9bc0ff",
                        }}
                      >
                        {u.assigned_region || "Region non assignee"}
                      </span>
                    </div>

                    <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>{u.email}</div>
                      <div style={{ opacity: 0.85, fontSize: 13 }}>{u.phone}</div>
                      <div style={{ opacity: 0.72, fontSize: 12 }}>
                        Fin de contrat: {formatContractDate(u.contract_end_date)}
                      </div>
                      <div style={{ opacity: 0.64, fontSize: 12 }}>{accessLabel}</div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      onClick={() => openRegionModal(u)}
                      style={{
                        borderRadius: 14,
                        border: "1px solid rgba(78,205,196,.35)",
                        background: "rgba(78,205,196,.12)",
                        color: "var(--text-primary)",
                        padding: "10px 14px",
                        fontWeight: 950,
                        cursor: "pointer",
                        minWidth: 140,
                      }}
                    >
                      Modifier region
                    </button>

                    <button
                      onClick={() => openStatusModal(u)}
                      style={{
                        borderRadius: 14,
                        border: "1px solid var(--accent-border)",
                        background: "var(--accent-bg)",
                        color: "var(--text-primary)",
                        padding: "10px 14px",
                        fontWeight: 950,
                        cursor: "pointer",
                        minWidth: 180,
                      }}
                    >
                      Statut et contrat
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
              );
            })}
          </div>
        )}
      </div>

      {editTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.72)",
            display: "grid",
            placeItems: "center",
            padding: 20,
            zIndex: 100,
          }}
        >
            <div
              style={{
                width: "min(560px, 92vw)",
              background: "var(--auth-panel-bg)",
              border: "1px solid var(--border-soft)",
              borderRadius: 18,
              padding: 18,
              }}
            >
            <div style={{ fontSize: 20, fontWeight: 900 }}>
              {editMode === "region" ? "Modifier la region" : "Modifier statut et contrat"}
            </div>
            <div style={{ marginTop: 6, opacity: 0.74, fontSize: 13 }}>
              {editMode === "region" ? (
                <>
                  Mets a jour la region assignee de <strong>{editTarget.name}</strong>.
                </>
              ) : (
                <>
                  Mets a jour le statut et la fin de contrat de <strong>{editTarget.name}</strong>.
                </>
              )}
            </div>

            <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
              {editMode === "region" ? (
                <div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Region assignee</div>
                  <select
                    value={editForm.assigned_region}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, assigned_region: e.target.value }))
                    }
                    style={fieldStyle}
                  >
                    {REGION_OPTIONS.map((region) => (
                      <option key={region} value={region} style={{ background: "var(--auth-panel-bg)" }}>
                        {region}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Statut du livreur</div>
                    <select
                      value={editForm.courier_status}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, courier_status: e.target.value }))
                      }
                      style={fieldStyle}
                    >
                      {COURIER_STATUS_OPTIONS.map((status) => (
                        <option
                          key={status.value}
                          value={status.value}
                          style={{ background: "var(--auth-panel-bg)" }}
                        >
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>Fin de contrat</div>
                    <input
                      type="date"
                      value={editForm.contract_end_date}
                      onChange={(e) =>
                        setEditForm((prev) => ({ ...prev, contract_end_date: e.target.value }))
                      }
                      style={fieldStyle}
                    />
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.6 }}>
                      Si la date est depassee, le statut passe automatiquement a Contrat termine.
                    </div>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 18, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={closeEditModal}
                style={{
                  borderRadius: 12,
                  padding: "10px 14px",
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface-card)",
                  color: "var(--text-primary)",
                  cursor: savingEdit ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  opacity: savingEdit ? 0.6 : 1,
                }}
              >
                Annuler
              </button>

              <button
                type="button"
                disabled={savingEdit}
                onClick={saveCourierChanges}
                style={{
                  borderRadius: 12,
                  padding: "10px 14px",
                  border: "1px solid var(--accent-border)",
                  background: "var(--accent-bg)",
                  color: "var(--text-primary)",
                  cursor: savingEdit ? "not-allowed" : "pointer",
                  fontWeight: 800,
                  opacity: savingEdit ? 0.7 : 1,
                }}
              >
                {savingEdit ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

