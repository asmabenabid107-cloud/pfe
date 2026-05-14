import { useEffect, useState } from "react";
import tourneeService from "../../api/tourneeService";

const STATUS_META = {
  proposed: {
    label: "Proposée",
    bg: "rgba(245,158,11,0.15)",
    color: "var(--warning)",
    border: "rgba(245,158,11,0.35)",
  },
  accepted: {
    label: "Acceptée",
    bg: "var(--success-bg)",
    color: "var(--success)",
    border: "var(--success-border)",
  },
  refused: {
    label: "Refusée",
    bg: "var(--danger-bg)",
    color: "var(--danger)",
    border: "var(--danger-border)",
  },
};

const styles = {
  detailCard: {
    padding: 12,
    borderRadius: 14,
    border: "1px solid var(--border-subtle)",
    background: "var(--surface-panel-faint)",
  },

  detailLabel: {
    fontSize: 12,
    color: "var(--text-secondary)",
    marginBottom: 8,
  },

  parcoursContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "8px",
    maxHeight: "340px",
    overflowY: "auto",
    paddingRight: "6px",
  },

  parcoursRow: {
    display: "grid",
    gridTemplateColumns: "38px 1fr",
    gap: "10px",
    alignItems: "start",
  },

  stepNumber: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "#dfe8ff",
    color: "#1e2a4a",
    fontWeight: 900,
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #b9c8ff",
    flexShrink: 0,
  },

  stepCard: {
    width: "100%",
    background: "#f8faff",
    border: "1px solid #d9e2f2",
    borderRadius: "14px",
    padding: "12px 14px",
    boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
  },

  stepAddress: {
    fontSize: "15px",
    fontWeight: 850,
    color: "#1f2a44",
    lineHeight: 1.45,
    textAlign: "left",
  },

  stepDetails: {
    marginTop: "7px",
    display: "inline-block",
    fontSize: "12px",
    fontWeight: 800,
    color: "#4b5b7a",
    background: "#eef3ff",
    padding: "5px 9px",
    borderRadius: "999px",
  },

  emptyParcours: {
    fontSize: "15px",
    color: "#6b7280",
    padding: "12px 0",
  },
};

const parseParcours = (parcoursText = "") => {
  if (!parcoursText) return [];

  return parcoursText
    .split("->")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item, index) => {
      const match = item.match(/^(.*?)(\((.*?)\))?$/);

      return {
        id: index + 1,
        adresse: match?.[1]?.trim() || item,
        details: match?.[3]?.trim() || "",
      };
    });
};

export default function RoutePlanner() {
  const [tournees, setTournees] = useState([]);
  const [restantsText, setRestantsText] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedTournee, setSelectedTournee] = useState(null);
  const [msg, setMsg] = useState("");

  const parcoursSteps = parseParcours(selectedTournee?.parcours_text || "");

  
  const loadTournees = async () => {
  try {
    const data = await tourneeService.getAll();
    setTournees(data || []);

    const restantsData = await tourneeService.getRestants();

    const lines = (restantsData || []).map(
      (group) => `RESTANTS ${group.region}: ${group.count} colis non affectés`
    );

    setRestantsText(lines.join("\n"));
  } catch (err) {
    console.error(err);
    setMsg("Erreur chargement des tournées.");
  }
};

  useEffect(() => {
    loadTournees();
  }, []);

  const handleGenerate = async () => {
  try {
    setMsg("");
    setRestantsText("");
    setSelectedTournee(null);
    setTournees([]);
    setLoading(true);

    const res = await tourneeService.generateAI();

    setMsg(`${res.count || 0} tournée(s) générée(s).`);

    await loadTournees();
  } catch (err) {
    console.error(err);
    setMsg("Erreur génération IA.");
    setRestantsText("");
  } finally {
    setLoading(false);
  }
};

  const handleAccept = async (id) => {
    await tourneeService.accept(id);
    setSelectedTournee(null);
    await loadTournees();
  };

  const handleRefuse = async (id) => {
    await tourneeService.refuse(id);
    setSelectedTournee(null);
    await loadTournees();
  };

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
            "radial-gradient(900px 280px at 85% -30%, rgba(45,91,255,.25), transparent 60%), rgba(255,255,255,.04)",
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 950 }}>
            Génération IA des tournées
          </div>
          <div style={{ opacity: 0.78, fontSize: 13, marginTop: 4 }}>
            Générer, consulter puis accepter ou refuser les tournées proposées.
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{
            borderRadius: 14,
            padding: "10px 16px",
            fontWeight: 900,
            border: "1px solid var(--accent-border)",
            background: "var(--accent-bg)",
            color: "var(--text-primary)",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "Génération..." : "Générer tournées IA"}
        </button>
      </div>

      {msg && (
        <div
          style={{
            marginBottom: 14,
            padding: 12,
            borderRadius: 16,
            border: "1px solid var(--border-soft)",
            background: "var(--surface-panel-soft)",
            fontWeight: 800,
          }}
        >
          {msg}
        </div>
      )}
 

      {tournees.length === 0 ? (
        <div
          style={{
            padding: 18,
            borderRadius: 18,
            border: "1px solid var(--border-soft)",
            background: "var(--surface-panel-soft)",
            opacity: 0.9,
          }}
        >
          Aucune tournée proposée.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))",
            gap: 14,
          }}
        >
          {tournees.map((t) => {
            const status = STATUS_META[t.status] || STATUS_META.proposed;

            return (
              <button
                key={t.id}
                onClick={() => setSelectedTournee(t)}
                style={{
                  background: "var(--surface-panel-faint)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: 16,
                  padding: 18,
                  boxShadow: "var(--shadow-soft)",
                  textAlign: "left",
                  cursor: "pointer",
                  color: "var(--text-primary)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                    marginBottom: 12,
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontFamily: "monospace",
                      color: "var(--text-secondary)",
                    }}
                  >
                    TOUR-{String(t.id).padStart(3, "0")}
                  </span>

                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: status.bg,
                      color: status.color,
                      border: `1px solid ${status.border}`,
                      fontWeight: 800,
                    }}
                  >
                    {status.label}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 900,
                    marginBottom: 8,
                  }}
                >
                  {t.nom}
                </div>

                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  {t.nombre_colis} colis • {t.poids_total} kg • {t.distance_km} km
                </div>
              </button>
            );
          })}
        </div>
      )}
      {tournees.length > 0 && restantsText && (
  <div
    style={{
      marginTop: 18,
      padding: 16,
      borderRadius: 18,
      border: "1px solid rgba(245,158,11,0.35)",
      background: "rgba(245,158,11,0.08)",
    }}
  >
    <div style={{ fontSize: 18, fontWeight: 950, marginBottom: 10 }}>
      Colis restants non affectés
    </div>

    <textarea
      readOnly
      value={`${restantsText}\nRESULTATS FINAL: ${tournees.length}`}
      style={{
        width: "100%",
        minHeight: 180,
        resize: "vertical",
        borderRadius: 14,
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-panel-faint)",
        color: "var(--text-primary)",
        padding: 12,
        fontWeight: 800,
        lineHeight: 1.6,
        fontFamily: "monospace",
        outline: "none",
      }}
    />
  </div>
)}

      {selectedTournee && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "var(--overlay-bg)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 18,
          }}
        >
          <div
            style={{
              background: "var(--sidebar-bg)",
              borderRadius: 22,
              padding: 28,
              width: "min(760px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid var(--border-soft)",
              boxShadow: "var(--shadow-strong)",
              color: "var(--text-primary)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 950 }}>
                  {selectedTournee.nom}
                </h2>
                <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>
                  Détails de la tournée proposée par IA
                </p>
              </div>

              <button
                onClick={() => setSelectedTournee(null)}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  border: "1px solid var(--border-soft)",
                  background: "var(--surface-panel-faint)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: 20, display: "grid", gap: 12 }}>
              <Info label="Livreur" value={selectedTournee.livreur_name} />
              <Info
                label="Véhicule"
                value={`${selectedTournee.vehicle_name} | Capacité: ${selectedTournee.vehicle_capacity} kg`}
              />
              <Info label="Nombre colis" value={selectedTournee.nombre_colis} />
              <Info label="Poids total" value={`${selectedTournee.poids_total} kg`} />
              <Info label="Distance" value={`${selectedTournee.distance_km} km`} />
<div
  style={{
    marginBottom: -5,
    color: "#4b5563",
    fontSize: 13,
    fontWeight: 400,
  }}
>
  Point de Départ et  d'Arrivée : Dépôt Kairouan AFH 4 . 
  
</div>


            
<div style={styles.detailCard}>
  <div style={styles.detailLabel}>Parcours</div>

  {parcoursSteps.length > 0 ? (
    <div style={styles.parcoursContainer}>
      {parcoursSteps.map((step, index) => (
        <div key={step.id} style={styles.parcoursRow}>
          <div style={styles.stepNumber}>{step.id}</div>

          <div style={styles.stepCard}>
            <div style={styles.stepAddress}>{step.adresse}</div>

            {step.details ? (
              <div style={styles.stepDetails}>{step.details}</div>
            ) : null}
          </div>

          {index < parcoursSteps.length - 1 && (
            <div style={styles.stepArrow}>↓</div>
          )}
        </div>
      ))}
    </div>
  ) : (
    <div style={styles.emptyParcours}>Aucun parcours disponible.</div>
  )}
</div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
              {selectedTournee.status !== "accepted" && (
                <button
                  onClick={() => handleAccept(selectedTournee.id)}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--success-border)",
                    background: "var(--success-bg)",
                    color: "var(--success)",
                    padding: "10px 18px",
                    fontWeight: 950,
                    cursor: "pointer",
                    minWidth: 130,
                  }}
                >
                  Accepter
                </button>
              )}

              {selectedTournee.status !== "refused" && (
                <button
                  onClick={() => handleRefuse(selectedTournee.id)}
                  style={{
                    borderRadius: 14,
                    border: "1px solid var(--danger-border)",
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "10px 18px",
                    fontWeight: 950,
                    cursor: "pointer",
                    minWidth: 130,
                  }}
                >
                  Refuser
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 14,
        border: "1px solid var(--border-subtle)",
        background: "var(--surface-panel-faint)",
      }}
    >
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontWeight: 800, lineHeight: 1.5 }}>{value || "-"}</div>
    </div>
  );
}