import { useEffect, useState } from "react";
import {
  getVehicles, createVehicle, updateVehicle, deleteVehicle
} from "../../api/vehicleService";

const STATUS_META = {
  actif:       { label: "Actif",          bg: "var(--success-bg)",  color: "var(--success)"  },
  inactif:     { label: "Inactif",        bg: "var(--danger-bg)",   color: "var(--danger)"   },
  maintenance: { label: "En maintenance", bg: "var(--warning-bg)",  color: "var(--warning)"  },
};

const EMPTY_FORM = { matricule: "", status: "actif", min_length: 20, max_length: 40 };

export default function Vehicules() {
  const [vehicles, setVehicles] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(EMPTY_FORM);
  const [error,    setError]    = useState("");
  const [saving,   setSaving]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getVehicles();
      setVehicles(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setError("");
    setModal(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({
      matricule:  v.matricule,
      status:     v.status,
      min_length: v.min_length ?? 20,
      max_length: v.max_length ?? 40,
    });
    setError("");
    setModal(true);
  };

  const handleSubmit = async () => {
    const minL = form.min_length ?? 20;
    const maxL = form.max_length ?? 40;
    if (form.matricule.length < minL || form.matricule.length > maxL) {
      setError(`Le matricule doit avoir entre ${minL} et ${maxL} caractères.`);
      return;
    }
    setSaving(true);
    try {
      editing
        ? await updateVehicle(editing.id, form)
        : await createVehicle(form);
      setModal(false);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || "Erreur serveur");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Supprimer ce véhicule ?")) return;
    await deleteVehicle(id);
    load();
  };

  const matLen  = form.matricule.length;
  const minL    = form.min_length ?? 20;
  const maxL    = form.max_length ?? 40;
  const matOk   = matLen >= minL && matLen <= maxL;

  return (
    <div>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
        <div>
          <h1 style={{ fontSize:"1.4rem", fontWeight:900, color:"var(--text-primary)", margin:0 }}>
            Véhicules
          </h1>
          <p style={{ fontSize:"0.85rem", color:"var(--text-secondary)", margin:"4px 0 0" }}>
            Gestion du parc automobile
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding:"10px 18px", borderRadius:12,
            background:"var(--accent-bg)", color:"var(--text-primary)",
            fontWeight:800, cursor:"pointer", fontSize:"0.9rem",
            border:"1px solid var(--accent-border)"
          }}
        >
          + Nouveau véhicule
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ color:"var(--text-secondary)" }}>Chargement...</p>
      ) : vehicles.length === 0 ? (
        <div style={{
          textAlign:"center", padding:60,
          border:"1px dashed var(--border-subtle)", borderRadius:16,
          color:"var(--text-secondary)"
        }}>
          Aucun véhicule enregistré
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px,1fr))", gap:14 }}>
          {vehicles.map((v) => {
            const s = STATUS_META[v.status] || STATUS_META.inactif;
            return (
              <div key={v.id} style={{
                background:"var(--surface-panel-faint)",
                border:"1px solid var(--border-subtle)",
                borderRadius:14, padding:16
              }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <span style={{ fontSize:11, fontFamily:"monospace", color:"var(--text-secondary)" }}>
                    VEH-{String(v.id).padStart(3,"0")}
                  </span>
                  <span style={{
                    fontSize:11, padding:"3px 10px", borderRadius:20,
                    background:s.bg, color:s.color, fontWeight:700
                  }}>
                    {s.label}
                  </span>
                </div>

                <div style={{ fontSize:"0.95rem", fontWeight:700, color:"var(--text-primary)", marginBottom:8, wordBreak:"break-all" }}>
                  {v.matricule}
                </div>

                <div style={{ fontSize:12, color:"var(--text-secondary)", marginBottom:14 }}>
                  Matricule:{" "}
                  <strong style={{ color:"var(--text-primary)" }}>{v.min_length ?? 20}</strong>
                  {" – "}
                  <strong style={{ color:"var(--text-primary)" }}>{v.max_length ?? 40}</strong>
                  {" chars"}
                </div>

                <div style={{ fontSize:11, color:"var(--text-secondary)", marginBottom:12 }}>
                  Ajouté le {new Date(v.created_at).toLocaleDateString("fr-FR")}
                </div>

                <div style={{ display:"flex", gap:8 }}>
                  <button
                    onClick={() => openEdit(v)}
                    style={{
                      flex:1, padding:"7px 0", fontSize:12, borderRadius:8,
                      border:"1px solid var(--border-subtle)", cursor:"pointer",
                      background:"var(--surface-panel-faint)", color:"var(--text-primary)", fontWeight:700
                    }}
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    style={{
                      flex:1, padding:"7px 0", fontSize:12, borderRadius:8,
                      border:"1px solid var(--danger-border)", cursor:"pointer",
                      background:"var(--danger-bg)", color:"var(--danger)", fontWeight:700
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

      {/* Modal */}
      {modal && (
        <div style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
          display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000
        }}>
          <div style={{
            background:"var(--sidebar-bg)", borderRadius:16, padding:28,
            width:400, border:"1px solid var(--border-subtle)"
          }}>
            <h2 style={{ fontSize:"1.1rem", fontWeight:900, margin:"0 0 20px", color:"var(--text-primary)" }}>
              {editing ? "Modifier le véhicule" : "Nouveau véhicule"}
            </h2>

            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

              {/* ID */}
              <div>
                <label style={{ fontSize:12, color:"var(--text-secondary)", display:"block", marginBottom:4 }}>
                  ID (auto-généré)
                </label>
                <input
                  readOnly
                  value={editing ? `VEH-${String(editing.id).padStart(3,"0")}` : "— auto —"}
                  style={{
                    width:"100%", padding:"8px 12px", borderRadius:8,
                    border:"1px solid var(--border-subtle)",
                    background:"var(--surface-panel-faint)", color:"var(--text-secondary)",
                    fontSize:13, cursor:"not-allowed"
                  }}
                />
              </div>

              {/* Min / Max */}
              <div style={{ display:"flex", gap:10 }}>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color:"var(--text-secondary)", display:"block", marginBottom:4 }}>
                    Min caractères
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={form.max_length - 1}
                    value={form.min_length}
                    onChange={(e) => setForm({ ...form, min_length: parseInt(e.target.value) || 1 })}
                    style={{
                      width:"100%", padding:"8px 12px", borderRadius:8,
                      border:"1px solid var(--border-subtle)",
                      background:"var(--surface-panel-faint)", color:"var(--text-primary)", fontSize:13
                    }}
                  />
                </div>
                <div style={{ flex:1 }}>
                  <label style={{ fontSize:12, color:"var(--text-secondary)", display:"block", marginBottom:4 }}>
                    Max caractères
                  </label>
                  <input
                    type="number"
                    min={form.min_length + 1}
                    max={100}
                    value={form.max_length}
                    onChange={(e) => setForm({ ...form, max_length: parseInt(e.target.value) || 100 })}
                    style={{
                      width:"100%", padding:"8px 12px", borderRadius:8,
                      border:"1px solid var(--border-subtle)",
                      background:"var(--surface-panel-faint)", color:"var(--text-primary)", fontSize:13
                    }}
                  />
                </div>
              </div>

              {/* Matricule */}
              <div>
                <label style={{ fontSize:12, color:"var(--text-secondary)", display:"block", marginBottom:4 }}>
                  Matricule
                </label>
                <input
                  value={form.matricule}
                  maxLength={maxL}
                  onChange={(e) => { setForm({ ...form, matricule: e.target.value }); setError(""); }}
                  placeholder={`entre ${minL} et ${maxL} caractères`}
                  style={{
                    width:"100%", padding:"8px 12px", borderRadius:8,
                    border:`1px solid ${matLen === 0 ? "var(--border-subtle)" : matOk ? "var(--success)" : "var(--danger)"}`,
                    background:"var(--surface-panel-faint)", color:"var(--text-primary)", fontSize:13
                  }}
                />
                <div style={{
                  fontSize:11, marginTop:4,
                  color: matLen === 0 ? "var(--text-secondary)" : matOk ? "var(--success)" : "var(--danger)"
                }}>
                  {matLen} / {maxL} caractères{" "}
                  {matLen > 0 && (matOk ? "✓ valide" : matLen < minL ? `(minimum ${minL})` : `(maximum ${maxL})`)}
                </div>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize:12, color:"var(--text-secondary)", display:"block", marginBottom:4 }}>
                  Statut
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  style={{
                    width:"100%", padding:"8px 12px", borderRadius:8,
                    border:"1px solid var(--border-subtle)",
                    background:"var(--surface-panel-faint)", color:"var(--text-primary)", fontSize:13
                  }}
                >
                  <option value="actif">Actif — disponible</option>
                  <option value="inactif">Inactif — hors service</option>
                  <option value="maintenance">En maintenance</option>
                </select>
              </div>

              {error && (
                <div style={{ fontSize:12, color:"var(--danger)", padding:"8px 12px", borderRadius:8, background:"var(--danger-bg)" }}>
                  {error}
                </div>
              )}

              <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
                <button
                  onClick={() => setModal(false)}
                  style={{
                    padding:"9px 18px", borderRadius:10, fontWeight:700, fontSize:13, cursor:"pointer",
                    border:"1px solid var(--border-subtle)", background:"var(--surface-panel-faint)",
                    color:"var(--text-primary)"
                  }}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  style={{
                    padding:"9px 18px", borderRadius:10, fontWeight:800, fontSize:13, cursor:"pointer",
                    border:"1px solid var(--accent-border)", background:"var(--accent-bg)",
                    color:"var(--text-primary)", opacity: saving ? 0.6 : 1
                  }}
                >
                  {saving ? "..." : editing ? "Enregistrer" : "Créer"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}