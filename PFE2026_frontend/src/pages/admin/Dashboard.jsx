import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client.js";

const VISIBLE_FILTERS = ["all", "pending", "warehouse", "delivered", "returns", "failed"];

const FILTER_META = {
  all: {
    label: "Total colis",
    hint: "Tous les colis suivis",
    color: "#0e389b",
    bg: "rgba(255,255,255,0.04)",
    border: "rgba(255,255,255,0.12)",
    fill: "rgba(122,162,255,0.55)",
  },
  pending: {
    label: "En attente",
    hint: "Avant depot",
    color: "#f5b74b",
    bg: "rgba(245,158,11,0.12)",
    border: "rgba(245,158,11,0.32)",
    fill: "rgba(245,158,11,0.62)",
  },
  warehouse: {
    label: "Au depot",
    hint: "Scannes au depot",
    color: "#8d95ff",
    bg: "rgba(99,102,241,0.12)",
    border: "rgba(99,102,241,0.32)",
    fill: "rgba(99,102,241,0.58)",
  },
  delivered: {
    label: "Livres",
    hint: "Livraison terminee",
    color: "#2ccb76",
    bg: "rgba(44,203,118,0.12)",
    border: "rgba(44,203,118,0.32)",
    fill: "rgba(44,203,118,0.62)",
  },
  returns: {
    label: "Retours",
    hint: "Retour depot ou expediteur",
    color: "#b68cff",
    bg: "rgba(168,85,247,0.12)",
    border: "rgba(168,85,247,0.32)",
    fill: "rgba(168,85,247,0.58)",
  },
  failed: {
    label: "A relivrer",
    hint: "Revenus au depot",
    color: "#ff9457",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.32)",
    fill: "rgba(249,115,22,0.6)",
  },
};

const STATUS_META = {
  en_attente: { label: "En attente", color: "#f5b74b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.32)" },
  en_transit: { label: "En transit", color: "#7aa2ff", bg: "rgba(110,168,255,0.12)", border: "rgba(110,168,255,0.32)" },
  a_relivrer: { label: "A relivrer", color: "#ff9457", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.32)" },
  livre: { label: "Livre", color: "#2ccb76", bg: "rgba(44,203,118,0.12)", border: "rgba(44,203,118,0.32)" },
  annule: { label: "Annule", color: "#ff5f5f", bg: "rgba(255,95,95,0.12)", border: "rgba(255,95,95,0.32)" },
  retour: { label: "Retour", color: "#b68cff", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.32)" },
  inconnu: { label: "Inconnu", color: "rgba(232,238,252,0.7)", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.28)" },
};

const STAGE_META = {
  pending_pickup: { label: "En attente prise en charge", color: "#f5b74b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.32)" },
  picked_up: { label: "Pris chez expediteur", color: "#4fc3f7", bg: "rgba(14,165,233,0.12)", border: "rgba(14,165,233,0.32)" },
  at_warehouse: { label: "Au depot", color: "#8d95ff", bg: "rgba(99,102,241,0.12)", border: "rgba(99,102,241,0.32)" },
  out_for_delivery: { label: "Sorti du depot", color: "#b68cff", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.32)" },
  delivery_failed: { label: "Echec livraison", color: "#ff9457", bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.32)" },
  returned_to_warehouse: { label: "Retour depot", color: "#9b7cff", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.32)" },
  return_pending: { label: "Depot retour expediteur", color: "#9b7cff", bg: "rgba(124,58,237,0.12)", border: "rgba(124,58,237,0.32)" },
  returned: { label: "Retour expediteur", color: "#b68cff", bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.32)" },
  delivered: { label: "Livre", color: "#2ccb76", bg: "rgba(44,203,118,0.12)", border: "rgba(44,203,118,0.32)" },
  unknown: { label: "Etape inconnue", color: "rgba(232,238,252,0.7)", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.28)" },
};

const EVENT_TONES = {
  created: { label: "Creation", accent: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  pending: { label: "En attente", accent: "#f59e0b", bg: "rgba(245,158,11,0.14)" },
  approved: { label: "Valide", accent: "#16a34a", bg: "rgba(22,163,74,0.14)" },
  rejected: { label: "Refuse", accent: "#dc2626", bg: "rgba(220,38,38,0.14)" },
  pickup: { label: "Enlevement", accent: "#2563eb", bg: "rgba(37,99,235,0.12)" },
  warehouse_in: { label: "Au depot", accent: "#4f46e5", bg: "rgba(79,70,229,0.12)" },
  warehouse_out: { label: "Sortie depot", accent: "#0f766e", bg: "rgba(15,118,110,0.12)" },
  transit: { label: "En transit", accent: "#0ea5e9", bg: "rgba(14,165,233,0.12)" },
  rescheduled: { label: "A relivrer", accent: "#f97316", bg: "rgba(249,115,22,0.12)" },
  delivery_issue: { label: "A relivrer", accent: "#f97316", bg: "rgba(249,115,22,0.12)" },
  delivery_failed: { label: "Echec livraison", accent: "#f97316", bg: "rgba(249,115,22,0.12)" },
  return_warehouse: { label: "Retour depot", accent: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  return_pending: { label: "Retour a confirmer", accent: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  delivered: { label: "Livre", accent: "#059669", bg: "rgba(5,150,105,0.12)" },
  returned: { label: "Retour", accent: "#7c3aed", bg: "rgba(124,58,237,0.12)" },
  cancelled: { label: "Annule", accent: "#64748b", bg: "rgba(100,116,139,0.12)" },
  neutral: { label: "Evenement", accent: "#94a3b8", bg: "rgba(148,163,184,0.12)" },
};

function fmt(value) {
  if (value === null || value === undefined) return "-";
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat("fr-TN").format(number);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeStatusKey(value) {
  const raw = normalizeText(value);
  if (raw.includes("attente")) return "en_attente";
  if (raw.includes("transit")) return "en_transit";
  if (raw.includes("relivr") || raw.includes("report")) return "a_relivrer";
  if (raw.includes("livr")) return "livre";
  if (raw.includes("annul")) return "annule";
  if (raw.includes("retour")) return "retour";
  return "inconnu";
}

function normalizeStageKey(value) {
  const raw = normalizeText(value);

  if (!raw) return "pending_pickup";
  if (raw === "pending_pickup" || raw.includes("pending")) return "pending_pickup";
  if (raw === "picked_up" || raw.includes("picked")) return "picked_up";
  if (raw === "returned_to_warehouse" || (raw.includes("return") && raw.includes("warehouse"))) return "returned_to_warehouse";
  if (raw === "return_pending") return "return_pending";
  if (raw === "returned" || (raw.includes("return") && !raw.includes("warehouse"))) return "returned";
  if (raw === "out_for_delivery" || (raw.includes("warehouse") && raw.includes("out"))) return "out_for_delivery";
  if (raw === "at_warehouse" || (raw.includes("warehouse") && !raw.includes("out"))) return "at_warehouse";
  if (raw === "delivery_failed" || (raw.includes("deliver") && raw.includes("fail"))) return "delivery_failed";
  if (raw === "delivered" || (raw.includes("deliver") && !raw.includes("fail"))) return "delivered";
  return "unknown";
}

function parcelBucket(colis) {
  const status = normalizeStatusKey(colis?.statut);
  const stage = normalizeStageKey(colis?.tracking_stage);

  if (stage === "delivery_failed" || status === "a_relivrer") return "failed";
  if (stage === "returned_to_warehouse" || stage === "returned" || status === "retour") return "returns";
  if (stage === "delivered" || status === "livre") return "delivered";
  if (status === "annule") return "cancelled";
  if (stage === "at_warehouse") return "warehouse";
  if (stage === "out_for_delivery" || status === "en_transit") return "transit";
  if (stage === "pending_pickup" || stage === "picked_up" || status === "en_attente") return "pending";
  return "other";
}

function toneOf(value) {
  const raw = String(value || "").toLowerCase();
  if (EVENT_TONES[raw]) return EVENT_TONES[raw];
  if (raw.includes("attente")) return EVENT_TONES.pending;
  if (raw.includes("transit")) return EVENT_TONES.transit;
  if (raw.includes("failed")) return EVENT_TONES.delivery_failed;
  if (raw.includes("issue") || raw.includes("relivr") || raw.includes("report")) return EVENT_TONES.delivery_issue;
  if (raw.includes("livr")) return EVENT_TONES.delivered;
  if (raw.includes("annul")) return EVENT_TONES.cancelled;
  if (raw.includes("retour")) return EVENT_TONES.returned;
  return EVENT_TONES.neutral;
}

function adminDecision(note) {
  const raw = String(note || "").toLowerCase();
  if (raw.includes("accept")) return "approved";
  if (raw.includes("refus")) return "rejected";
  return null;
}

function formatDate(value) {
  if (!value) return "Date indisponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date indisponible";
  return date.toLocaleDateString("fr-TN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatTime(value) {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(value) {
  if (!value) return "Date indisponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date indisponible";
  return date.toLocaleString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMoney(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? `${amount.toFixed(2)} DT` : "-";
}

function designationOf(produits) {
  if (!Array.isArray(produits) || produits.length === 0) return "Colis standard";
  const names = produits
    .map((item) => {
      if (typeof item === "string" || typeof item === "number") return String(item);
      if (item && typeof item === "object") return item.designation || item.nom || item.name || item.label || "";
      return "";
    })
    .filter(Boolean);
  if (names.length === 0) return "Colis standard";
  return names.join(", ");
}

function itemCountOf(produits) {
  if (!Array.isArray(produits) || produits.length === 0) return 1;
  return produits.reduce((total, item) => total + (Number(item?.quantite) || 1), 0);
}

function deriveAddressLabel(address, fallback = "Origine") {
  const raw = String(address || "").trim();
  if (!raw) return fallback;
  const segments = raw.split(/[,/-]/).map((part) => part.trim()).filter(Boolean);
  return segments[0] || raw;
}

function deriveOriginLabel(profile) {
  return (profile?.city || "").trim() || deriveAddressLabel(profile?.address, "Origine");
}

function deriveDestinationLabel(colis) {
  return (colis?.destination_label || "").trim() || deriveAddressLabel(colis?.adresse_livraison, "Destination");
}

function compact(value, length = 52) {
  const text = String(value || "");
  return text.length <= length ? text : `${text.slice(0, length - 3)}...`;
}

function timelineOf(colis) {
  if (!colis) return [];

  if (Array.isArray(colis.history) && colis.history.length > 0) {
    return colis.history
      .map((event, index) => ({
        id: event.id ?? `history-${index}`,
        title: event.title || "Mise a jour",
        note: event.note || "",
        date: event.date || event.event_at || event.created_at || event.updated_at,
        tone: toneOf(event.kind || event.status || event.statut),
      }))
      .filter((event) => event.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  const events = [];

  if (colis.created_at) {
    events.push({ id: "created", title: "Demande d'enlevement", note: "Bordereau enregistre par l'expediteur.", date: colis.created_at, tone: EVENT_TONES.created });
  }
  const decision = adminDecision(colis.admin_note);
  if (decision === "approved") {
    events.push({ id: "approved", title: "Demande d'enlevement validee", note: "Le colis a ete accepte par l'admin.", date: colis.admin_note_at || colis.updated_at, tone: EVENT_TONES.approved });
  }
  if (decision === "rejected") {
    events.push({ id: "rejected", title: "Demande refusee", note: "Le colis a ete refuse par l'admin.", date: colis.admin_note_at || colis.updated_at, tone: EVENT_TONES.rejected });
  }
  if (colis.picked_up_at) {
    events.push({ id: "pickup", title: "En cours d'enlevement", note: "Le livreur a pris le colis chez l'expediteur.", date: colis.picked_up_at, tone: EVENT_TONES.pickup });
  }
  if (colis.warehouse_received_at) {
    events.push({ id: "warehouse-in", title: "Recevoir au depot", note: "Le colis est arrive au depot.", date: colis.warehouse_received_at, tone: EVENT_TONES.warehouse_in });
  }
  if (colis.out_for_delivery_at) {
    events.push({ id: "warehouse-out", title: "Sortie depot", note: "Le colis a quitte le depot pour la livraison.", date: colis.out_for_delivery_at, tone: EVENT_TONES.warehouse_out });
  }
  if (colis.last_delivery_issue_at || colis.failed_delivery_at) {
    const reason = colis.last_delivery_issue_reason ? ` Motif: ${colis.last_delivery_issue_reason}.` : "";
    events.push({
      id: "delivery-issue",
      title: "Livraison reportee",
      note: `Le colis revient au depot pour une nouvelle tentative.${reason}`,
      date: colis.last_delivery_issue_at || colis.failed_delivery_at,
      tone: EVENT_TONES.delivery_issue,
    });
  }
  if (colis.return_warehouse_received_at) {
    events.push({
      id: "returned-warehouse",
      title: "Retour depot",
      note: "Le colis est revenu au depot apres l echec de livraison.",
      date: colis.return_warehouse_received_at,
      tone: EVENT_TONES.return_warehouse,
    });
  }
  if (colis.returned_at || colis.returned_to_shipper_at) {
    events.push({
      id: "returned-shipper",
      title: "Retour expediteur",
      note: "Le colis a ete remis a l expediteur.",
      date: colis.returned_at || colis.returned_to_shipper_at,
      tone: EVENT_TONES.returned,
    });
  }
  if (colis.delivered_at) {
    events.push({ id: "delivered", title: "Livraison", note: "Le colis a atteint sa destination finale.", date: colis.delivered_at, tone: EVENT_TONES.delivered });
  } else if (colis.statut) {
    const tone = toneOf(colis.statut);
    events.push({ id: "status", title: `Statut: ${tone.label}`, note: "Dernier etat connu du colis.", date: colis.updated_at || colis.created_at, tone });
  }

  return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

function lastParcelDate(colis) {
  return (
    colis?.returned_to_shipper_at ||
    colis?.returned_at ||
    colis?.return_warehouse_received_at ||
    colis?.last_delivery_issue_at ||
    colis?.failed_delivery_at ||
    colis?.delivered_at ||
    colis?.out_for_delivery_at ||
    colis?.warehouse_received_at ||
    colis?.picked_up_at ||
    colis?.admin_note_at ||
    colis?.updated_at ||
    colis?.created_at
  );
}

function metricCounts(colisList) {
  const counts = {
    all: colisList.length,
    pending: 0,
    warehouse: 0,
    delivered: 0,
    returns: 0,
    failed: 0,
    transit: 0,
    cancelled: 0,
    other: 0,
  };

  colisList.forEach((colis) => {
    const bucket = parcelBucket(colis);
    counts[bucket] = (counts[bucket] || 0) + 1;
  });

  return counts;
}

function badgeStyle(meta) {
  return {
    color: meta.color,
    background: meta.bg,
    border: `1px solid ${meta.border}`,
  };
}

export default function Dashboard() {
  const listRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [stats, setStats] = useState(null);
  const [colisList, setColisList] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedColis, setSelectedColis] = useState(null);

  const shippersTotal = useMemo(() => stats?.shippers?.total ?? 0, [stats]);
  const shippersApproved = useMemo(() => stats?.shippers?.approved ?? 0, [stats]);
  const shippersPending = useMemo(() => stats?.shippers?.pending ?? 0, [stats]);

  const couriersTotal = useMemo(() => stats?.couriers?.total ?? 0, [stats]);
  const couriersApproved = useMemo(() => stats?.couriers?.approved ?? 0, [stats]);
  const couriersPending = useMemo(() => stats?.couriers?.pending ?? 0, [stats]);

  const counts = useMemo(() => metricCounts(colisList), [colisList]);
  const parcelsTotal = counts.all;
  const deliveredRate = useMemo(() => {
    if (!parcelsTotal) return 0;
    return Math.round((counts.delivered / parcelsTotal) * 100);
  }, [counts.delivered, parcelsTotal]);

  const parcelMetrics = useMemo(() => {
    return VISIBLE_FILTERS.map((key) => {
      const meta = FILTER_META[key];
      const value = counts[key] ?? 0;
      const pct = key === "all" ? 100 : parcelsTotal > 0 ? Math.round((value / parcelsTotal) * 100) : 0;
      return { key, ...meta, value, pct };
    });
  }, [counts, parcelsTotal]);

  const metricMap = useMemo(
    () => Object.fromEntries(parcelMetrics.map((metric) => [metric.key, metric])),
    [parcelMetrics]
  );

  const selectedMetric = metricMap[selectedFilter] || metricMap.all || parcelMetrics[0];

  const filteredColis = useMemo(() => {
    if (selectedFilter === "all") return colisList;
    return colisList.filter((colis) => parcelBucket(colis) === selectedFilter);
  }, [colisList, selectedFilter]);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const [statsRes, colisRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/colis"),
      ]);

      setStats(statsRes.data);
      setColisList(Array.isArray(colisRes.data) ? colisRes.data : colisRes.data?.items || []);
      setUpdatedAt(new Date());
    } catch (e) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail;

      if (status === 401) setErr("Session expiree. Reconnecte-toi.");
      else if (status === 403) setErr("Acces refuse: admin requis.");
      else setErr(detail || e?.message || "Erreur chargement dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);

    const timer = setInterval(() => load(), 15000);

    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    if (!selectedColis) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setSelectedColis(null);
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedColis]);

  function selectFilter(key) {
    setSelectedFilter(key);
    window.requestAnimationFrame(() => {
      listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function openColisDetails(colis) {
    setSelectedColis(colis);
  }

  return (
    <div className="admDash">
      <div className="admDashTop">
        <div>
          <div className="admDashTitle">Dashboard</div>
          <div className="admDashSub">
            Vue globale admin - mise a jour{" "}
            <strong>{updatedAt ? updatedAt.toLocaleTimeString() : "-"}</strong>
          </div>
        </div>

        <button className="admDashBtn" onClick={load} disabled={loading}>
          {loading ? "Chargement..." : "Rafraichir"}
        </button>
      </div>

      {err && <div className="admDashAlert admDashAlertErr">{err}</div>}

      <div className="admStatsGrid">
        <div className="admStatCard admBlue">
          <div className="admStatHead">
            <div className="admStatName">Expediteurs</div>
            <div className="admPill">Comptes</div>
          </div>

          <div className="admStatValue">{loading ? "..." : fmt(shippersTotal)}</div>

          <div className="admSplit">
            <div className="admSplitBox">
              <div className="admSplitK">Approuves</div>
              <div className="admSplitV">{loading ? "..." : fmt(shippersApproved)}</div>
            </div>
            <div className="admSplitBox">
              <div className="admSplitK">En attente</div>
              <div className="admSplitV">{loading ? "..." : fmt(shippersPending)}</div>
            </div>
          </div>
        </div>

        <div className="admStatCard admViolet">
          <div className="admStatHead">
            <div className="admStatName">Livreurs</div>
            <div className="admPill">Comptes</div>
          </div>

          <div className="admStatValue">{loading ? "..." : fmt(couriersTotal)}</div>

          <div className="admSplit">
            <div className="admSplitBox">
              <div className="admSplitK">Approuves</div>
              <div className="admSplitV">{loading ? "..." : fmt(couriersApproved)}</div>
            </div>
            <div className="admSplitBox">
              <div className="admSplitK">En attente</div>
              <div className="admSplitV">{loading ? "..." : fmt(couriersPending)}</div>
            </div>
          </div>
        </div>

        <div className="admStatCard admGreen">
          <div className="admStatHead">
            <div className="admStatName">Colis</div>
            <div className="admPill">Suivi</div>
          </div>

          <div className="admStatValue">{loading ? "..." : fmt(parcelsTotal)}</div>

          <div className="admMini">
            <div className="admMiniK">Taux livres</div>
            <div className="admMiniV">{loading ? "..." : `${deliveredRate}%`}</div>
            <div className="admMiniBar">
              <div className="admMiniFill" style={{ width: `${deliveredRate}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="admPanels">
        <div className="admPanel">
          <div className="admPanelTitle">Repartition colis</div>
          <div className="admPanelText">Clique sur un etat pour voir la liste des colis correspondants.</div>

          <div className="admStatusList">
            {(loading ? new Array(VISIBLE_FILTERS.length).fill(null) : parcelMetrics).map((item, idx) => {
              if (!item) {
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

              const active = selectedFilter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`admStatusRow admStatusBtn ${active ? "isActive" : ""}`}
                  onClick={() => selectFilter(item.key)}
                  style={{
                    "--adm-row-bg": item.bg,
                    "--adm-row-border": item.border,
                    "--adm-row-accent": item.color,
                    "--adm-fill": item.fill,
                  }}
                >
                  <div className="admStatusLeft">
                    <div className="admStatusLabel">{item.label}</div>
                    <div className="admStatusMeta">
                      <span className="admStatusN">{fmt(item.value)}</span>
                      <span className="admDot">|</span>
                      <span className="admStatusP">{item.pct}%</span>
                      <span className="admDot">|</span>
                      <span>{item.hint}</span>
                    </div>
                  </div>

                  <div className="admStatusBar" aria-hidden="true">
                    <div className="admStatusFill" style={{ width: `${item.pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="admPanel">
          <div className="admPanelTitle">Resume</div>
          <div className="admMetricGrid">
            {(loading ? new Array(VISIBLE_FILTERS.length).fill(null) : parcelMetrics).map((item, idx) => {
              if (!item) {
                return (
                  <div key={idx} className="admMetricCard">
                    <div className="admSkel sk1" />
                    <div className="admSkel sk1" style={{ width: 80, marginTop: 10 }} />
                    <div className="admSkel sk2" style={{ marginTop: 12 }} />
                  </div>
                );
              }

              const active = selectedFilter === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  className={`admMetricCard admMetricBtn ${active ? "isActive" : ""}`}
                  onClick={() => selectFilter(item.key)}
                  style={{
                    "--adm-row-bg": item.bg,
                    "--adm-row-border": item.border,
                    "--adm-row-accent": item.color,
                  }}
                >
                  <div className="admMetricLabel">{item.label}</div>
                  <div className="admMetricValue">{fmt(item.value)}</div>
                  <div className="admMetricHint">{item.hint}</div>
                </button>
              );
            })}
          </div>

          <div className="admSelectionLine">
            <span>Selection active</span>
            <strong>{selectedMetric?.label || "Total colis"}</strong>
          </div>

          {(counts.transit > 0 || counts.cancelled > 0 || counts.other > 0) && (
            <div className="admPanelText">
              Autres etats suivis: {fmt(counts.transit)} en transit, {fmt(counts.cancelled)} annules, {fmt(counts.other)} non classes.
            </div>
          )}
        </div>
      </div>

      <div ref={listRef} className="admPanel admListPanel">
        <div className="admListHead">
          <div>
            <div className="admPanelTitle">Liste des colis - {selectedMetric?.label || "Total colis"}</div>
            <div className="admPanelText">
              {loading
                ? "Chargement..."
                : `${fmt(filteredColis.length)} colis dans cette vue`}
            </div>
          </div>

          {selectedFilter !== "all" && (
            <button className="admDashBtn" onClick={() => selectFilter("all")}>
              Voir tous
            </button>
          )}
        </div>

        {loading ? (
          <div className="admListGrid">
            {new Array(4).fill(null).map((_, idx) => (
              <div key={idx} className="admListCard">
                <div className="admSkel sk1" />
                <div className="admSkel sk2" style={{ marginTop: 10, width: 120 }} />
                <div className="admSkel sk3" style={{ marginTop: 14, width: "100%" }} />
              </div>
            ))}
          </div>
        ) : filteredColis.length === 0 ? (
          <div className="admEmptyState">
            Aucun colis dans cette vue pour le moment.
          </div>
        ) : (
          <div className="admListGrid">
            {filteredColis.map((colis) => {
              const statusKey = normalizeStatusKey(colis.statut);
              const stageKey = normalizeStageKey(colis.tracking_stage);
              const status = STATUS_META[statusKey] || STATUS_META.inconnu;
              const stage = STAGE_META[stageKey] || STAGE_META.unknown;

              return (
                <div
                  key={colis.id}
                  className="admListCard admListCardAction"
                  role="button"
                  tabIndex={0}
                  onClick={() => openColisDetails(colis)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openColisDetails(colis);
                    }
                  }}
                >
                  <div className="admListTop">
                    <div>
                      <div className="admListTrack">#{colis.numero_suivi}</div>
                      <div className="admListName">{colis.nom_destinataire || "Destinataire non renseigne"}</div>
                    </div>

                    <div className="admListBadges">
                      <span className="admBadge" style={badgeStyle(status)}>
                        {status.label}
                      </span>
                      <span className="admBadge" style={badgeStyle(stage)}>
                        {stage.label}
                      </span>
                    </div>
                  </div>

                  <div className="admListMetaBlock">
                    <div className="admListMetaLine">
                      <span>Adresse</span>
                      <strong>{colis.adresse_livraison || "Non renseignee"}</strong>
                    </div>
                    <div className="admListMetaLine">
                      <span>Telephone</span>
                      <strong>{colis.telephone_destinataire || "Non renseigne"}</strong>
                    </div>
                    <div className="admListMetaLine">
                      <span>Derniere mise a jour</span>
                      <strong>{formatDateTime(lastParcelDate(colis))}</strong>
                    </div>
                  </div>

                  <div className="admCardHint">Cliquer pour voir l historique du colis</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedColis && (
        <HistoryCenterModal colis={selectedColis} shipperProfile={{ city: "Expediteur" }} onClose={() => setSelectedColis(null)} />
      )}
    </div>
  );
}

function HistoryCenterModal({ colis, shipperProfile, onClose }) {
  const timeline = timelineOf(colis);
  const route = `${deriveOriginLabel(shipperProfile)} >> Dispatch >> ${deriveDestinationLabel(colis)}`;
  const comment = shipperProfile?.name || colis.admin_note || "Aucune remarque";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(3, 7, 18, 0.62)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 120, padding: 20 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0 }} />

      <div style={{ position: "relative", width: "min(960px, calc(100vw - 40px))", maxHeight: "92vh", overflow: "hidden", borderRadius: 24, background: "#ffffff", color: "#111827", boxShadow: "0 34px 80px rgba(15, 23, 42, 0.38)" }}>
        <div style={{ height: 8, background: "#16a34a" }} />
        <div style={{ maxHeight: "calc(92vh - 8px)", overflowY: "auto" }}>
          <div style={{ padding: "18px 22px 30px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div style={{ width: 36 }} />
              <div style={{ flex: 1, textAlign: "center", fontSize: "1.2rem", fontWeight: 700 }}>
                Historique {colis.numero_suivi}
              </div>
              <button onClick={onClose} style={{ width: 36, height: 36, padding: 0, borderRadius: 10, border: "1px solid #d1d5db", background: "#ffffff", color: "#374151", fontSize: "1.1rem" }}>
                x
              </button>
            </div>

            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 22 }}>
              <InfoBlock label="Client" value={colis.nom_destinataire || "Non renseigne"} />
              <InfoBlock label="Adresse" value={colis.adresse_livraison || "Non renseignee"} />
              <InfoBlock label="Telephone" value={colis.telephone_destinataire || "Non renseigne"} />
              <InfoBlock label="Montant" value={formatMoney(colis.prix)} />
              <InfoBlock label="Designation" value={designationOf(colis.produits)} />
              <InfoBlock label="Nombre des articles" value={`${itemCountOf(colis.produits)}`} />
              <InfoBlock label="Commentaire" value={comment} />
              <InfoBlock label="Code barre" value={colis.barcode_value || "Non genere"} />
              <InfoBlock label="Trajet" value={route} />
            </div>

            <div style={{ marginTop: 26, textAlign: "center", fontSize: "1rem", fontWeight: 800 }}>
              <span style={{ color: "#111827" }}>{deriveOriginLabel(shipperProfile)}</span>
              <span style={{ color: "#6b7280" }}> &gt;&gt; ---- Dispatch ---- &gt;&gt; </span>
              <span style={{ color: "#111827" }}>{deriveDestinationLabel(colis)}</span>
            </div>

            <div style={{ marginTop: 28, position: "relative", padding: "10px 0 6px" }}>
              <div style={{ position: "absolute", top: 12, bottom: 14, left: "50%", width: 2, transform: "translateX(-50%)", background: "#d1d5db" }} />

              <div style={{ display: "grid", gap: 18 }}>
                {timeline.map((event, index) => {
                  const leftSide = index % 2 === 0;
                  return (
                    <div key={`${event.id}-${index}`} style={{ display: "grid", gridTemplateColumns: "1fr 58px 1fr", alignItems: "center", gap: 12 }}>
                      <div style={{ display: "flex", justifyContent: leftSide ? "flex-end" : "flex-start" }}>
                        {leftSide ? (
                          <div style={{ textAlign: "right", color: "#6b7280", fontSize: "0.86rem", lineHeight: 1.4 }}>
                            <div>{formatDate(event.date)}</div>
                            <div>{formatTime(event.date)}</div>
                          </div>
                        ) : (
                          <EventBubble event={event} align="left" />
                        )}
                      </div>

                      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "center" }}>
                        <div style={{ width: 34, height: 34, borderRadius: "50%", border: `2px solid ${event.tone.accent}`, background: "#ffffff" }} />
                      </div>

                      <div style={{ display: "flex", justifyContent: leftSide ? "flex-start" : "flex-end" }}>
                        {leftSide ? (
                          <EventBubble event={event} align="right" />
                        ) : (
                          <div style={{ textAlign: "left", color: "#6b7280", fontSize: "0.86rem", lineHeight: 1.4 }}>
                            <div>{formatDate(event.date)}</div>
                            <div>{formatTime(event.date)}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EventBubble({ event, align }) {
  return (
    <div style={{ maxWidth: 270, textAlign: align === "right" ? "left" : "right" }}>
      <div style={{ display: "inline-flex", padding: "5px 10px", borderRadius: 999, background: event.tone.bg, color: event.tone.accent, fontWeight: 800, fontSize: "0.8rem" }}>
        {event.title}
      </div>
      {event.note && (
        <div style={{ marginTop: 6, color: "#111827", fontSize: "0.93rem", lineHeight: 1.45 }}>
          {event.note}
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}: <span style={{ fontWeight: 500 }}>{compact(value, 90)}</span></div>
    </div>
  );
}
