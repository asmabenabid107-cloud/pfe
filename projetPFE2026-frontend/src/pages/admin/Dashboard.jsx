import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/client.js";

function fmt(n) {
  if (n === null || n === undefined) return "—";
  return String(n);
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);

  // ---- SHIPPERS ----
  const shippersTotal = useMemo(() => stats?.shippers?.total ?? 0, [stats]);
  const shippersApproved = useMemo(() => stats?.shippers?.approved ?? 0, [stats]);
  const shippersPending = useMemo(() => stats?.shippers?.pending ?? 0, [stats]);

  // ---- COURIERS ----
  const couriersTotal = useMemo(() => stats?.couriers?.total ?? 0, [stats]);
  const couriersApproved = useMemo(() => stats?.couriers?.approved ?? 0, [stats]);
  const couriersPending = useMemo(() => stats?.couriers?.pending ?? 0, [stats]);

  // ---- PARCELS ----
  const parcelsTotal = useMemo(() => stats?.parcels?.total ?? 0, [stats]);
  const parcelsByStatus = useMemo(() => stats?.parcels?.by_status ?? {}, [stats]);

  const statusOrder = useMemo(
    () => [
      ["en_attente", "En attente"],
      ["en_transit", "En transit"],
      ["livré", "Livré"],
      ["annulé", "Annulé"],
      ["retour", "Retour"],
      ["inconnu", "Inconnu"],
    ],
    []
  );

  const statusItems = useMemo(() => {
    const total = parcelsTotal || 0;

    return statusOrder
      .map(([key, label]) => {
        const value = Number(parcelsByStatus?.[key] ?? 0);
        const pct = total > 0 ? Math.round((value / total) * 100) : 0;
        return { key, label, value, pct };
      })
      .filter(
        (x) =>
          x.value > 0 ||
          x.key === "en_attente" ||
          x.key === "en_transit" ||
          x.key === "livré" ||
          x.key === "annulé" ||
          x.key === "retour"
      );
  }, [parcelsByStatus, parcelsTotal, statusOrder]);

  const deliveredRate = useMemo(() => {
    const delivered = Number(parcelsByStatus?.["livré"] ?? 0);
    if (!parcelsTotal) return 0;
    return Math.round((delivered / parcelsTotal) * 100);
  }, [parcelsByStatus, parcelsTotal]);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await api.get("/admin/stats");
      setStats(res.data);
      setUpdatedAt(new Date());
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;

      if (status === 401) setErr("Session expirée. Reconnecte-toi.");
      else if (status === 403) setErr("Accès refusé: admin requis.");
      else setErr(detail || e?.message || "Erreur chargement statistiques.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    const t = setInterval(() => load(), 15000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(t);
    };
  }, []);

  return (
    <div className="admDash">
      <div className="admDashTop">
        <div>
          <div className="admDashTitle">Dashboard</div>
          <div className="admDashSub">
            Vue globale — mise à jour{" "}
            <strong>{updatedAt ? updatedAt.toLocaleTimeString() : "—"}</strong>
          </div>
        </div>

        <button className="admDashBtn" onClick={load} disabled={loading}>
          {loading ? "Chargement..." : "Rafraîchir"}
        </button>
      </div>

      {err && <div className="admDashAlert admDashAlertErr">{err}</div>}

      {/* ✅ 3 cartes en haut */}
      <div className="admStatsGrid">
        {/* EXPEDITEURS */}
        <div className="admStatCard admBlue">
          <div className="admStatHead">
            <div className="admStatName">Expéditeurs</div>
            <div className="admPill">Comptes</div>
          </div>

          <div className="admStatValue">{loading ? "…" : fmt(shippersTotal)}</div>

          <div className="admSplit">
            <div className="admSplitBox">
              <div className="admSplitK">Approuvés</div>
              <div className="admSplitV">{loading ? "…" : fmt(shippersApproved)}</div>
            </div>
            <div className="admSplitBox">
              <div className="admSplitK">En attente</div>
              <div className="admSplitV">{loading ? "…" : fmt(shippersPending)}</div>
            </div>
          </div>
        </div>

        {/* LIVREURS */}
        <div className="admStatCard admViolet">
          <div className="admStatHead">
            <div className="admStatName">Livreurs</div>
            <div className="admPill">Comptes</div>
          </div>

          <div className="admStatValue">{loading ? "…" : fmt(couriersTotal)}</div>

          <div className="admSplit">
            <div className="admSplitBox">
              <div className="admSplitK">Approuvés</div>
              <div className="admSplitV">{loading ? "…" : fmt(couriersApproved)}</div>
            </div>
            <div className="admSplitBox">
              <div className="admSplitK">En attente</div>
              <div className="admSplitV">{loading ? "…" : fmt(couriersPending)}</div>
            </div>
          </div>
        </div>

        {/* COLIS */}
        <div className="admStatCard admGreen">
          <div className="admStatHead">
            <div className="admStatName">Colis</div>
            <div className="admPill">Total</div>
          </div>

          <div className="admStatValue">{loading ? "…" : fmt(parcelsTotal)}</div>

          <div className="admMini">
            <div className="admMiniK">Taux livrés</div>
            <div className="admMiniV">{loading ? "…" : `${deliveredRate}%`}</div>
            <div className="admMiniBar">
              <div className="admMiniFill" style={{ width: `${deliveredRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Répartition à gauche, Résumé à droite */}
      <div className="admPanels">
        <div className="admPanel">
          <div className="admPanelTitle">Répartition colis</div>

          <div className="admStatusList">
            {(loading ? new Array(5).fill(null) : statusItems).map((it, idx) => {
              if (!it) {
                return (
                  <div key={idx} className="admStatusRow">
                    <div className="admStatusLeft">
                      <div className="admSkel sk1" />
                      <div className="admSkel sk2" />
                    </div>
                    <div className="admSkel sk3" />
                  </div>
                );
              }

              return (
                <div key={it.key} className="admStatusRow">
                  <div className="admStatusLeft">
                    <div className="admStatusLabel">{it.label}</div>
                    <div className="admStatusMeta">
                      <span className="admStatusN">{fmt(it.value)}</span>
                      <span className="admDot">•</span>
                      <span className="admStatusP">{it.pct}%</span>
                    </div>
                  </div>

                  <div className="admStatusBar" aria-hidden="true">
                    <div className="admStatusFill" style={{ width: `${it.pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="admPanel">
          <div className="admPanelTitle">Résumé</div>
          <div className="admPanelBody">
            <div className="admLine">
              <span>Demandes expéditeurs en attente</span>
              <strong>{loading ? "…" : fmt(shippersPending)}</strong>
            </div>
            <div className="admLine">
              <span>Expéditeurs approuvés</span>
              <strong>{loading ? "…" : fmt(shippersApproved)}</strong>
            </div>

            <div className="admLine">
              <span>Demandes livreurs en attente</span>
              <strong>{loading ? "…" : fmt(couriersPending)}</strong>
            </div>
            <div className="admLine">
              <span>Livreurs approuvés</span>
              <strong>{loading ? "…" : fmt(couriersApproved)}</strong>
            </div>

            <div className="admLine">
              <span>Total colis</span>
              <strong>{loading ? "…" : fmt(parcelsTotal)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
