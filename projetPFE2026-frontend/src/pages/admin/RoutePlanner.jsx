import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client.js";
import MapPickerModal from "../../components/MapPickerModal.jsx";

const DEFAULT_ORIGIN = "36.8065,10.1815";
const EMPTY_STATUS = {
  tone: "info",
  message: "Construisez un itineraire pour afficher la carte integree.",
};

function normalizeValue(value) {
  return String(value || "").trim();
}

function getStopValue(stop) {
  return typeof stop === "string" ? stop : stop?.value;
}

function cleanStops(stops) {
  return stops.map((stop) => normalizeValue(getStopValue(stop))).filter(Boolean);
}

function buildRouteData(origin, stops, returnToOrigin) {
  const start = normalizeValue(origin);
  const clean = cleanStops(stops);

  if (!start || clean.length === 0) {
    return null;
  }

  if (returnToOrigin) {
    return {
      origin: start,
      destination: start,
      waypoints: clean,
    };
  }

  return {
    origin: start,
    destination: clean[clean.length - 1],
    waypoints: clean.slice(0, -1),
  };
}

function buildFallbackRoute(origin, stops, returnToOrigin) {
  const route = buildRouteData(origin, stops, returnToOrigin);
  if (route) {
    return route;
  }

  const start = normalizeValue(origin) || DEFAULT_ORIGIN;
  return {
    origin: start,
    destination: start,
    waypoints: [],
  };
}

function buildEmbedIframeUrl({
  apiKey,
  origin,
  destination,
  waypoints,
  mode = "driving",
}) {
  const params = new URLSearchParams();
  params.set("key", apiKey);
  params.set("origin", origin);
  params.set("destination", destination);
  if (waypoints?.length) {
    params.set("waypoints", waypoints.join("|"));
  }
  params.set("mode", mode);
  return `https://www.google.com/maps/embed/v1/directions?${params.toString()}`;
}

function buildOpenGoogleMapsUrl({
  origin,
  destination,
  waypoints,
  mode = "driving",
}) {
  const params = new URLSearchParams();
  params.set("api", "1");
  params.set("origin", origin);
  params.set("destination", destination);
  if (waypoints?.length) {
    params.set("waypoints", waypoints.join("|"));
  }
  params.set("travelmode", mode);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function stopCountLabel(count) {
  return `${count} arret${count > 1 ? "s" : ""}`;
}

export default function RoutePlanner() {
  const nextStopIdRef = useRef(0);
  const [backendApiKey, setBackendApiKey] = useState("");
  const [origin, setOrigin] = useState(DEFAULT_ORIGIN);
  const [returnToOrigin, setReturnToOrigin] = useState(false);
  const [stops, setStops] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [iframeSrc, setIframeSrc] = useState("");
  const [status, setStatus] = useState(EMPTY_STATUS);

  const cleanedStopValues = cleanStops(stops);
  const currentRoute = buildRouteData(origin, stops, returnToOrigin);
  const destinationSummary = currentRoute?.destination || "A definir";
  const openMapsUrl = buildOpenGoogleMapsUrl(
    buildFallbackRoute(origin, stops, returnToOrigin),
  );

  useEffect(() => {
    let cancelled = false;

    api
      .get("/admin/settings/google-maps")
      .then((response) => {
        if (cancelled) {
          return;
        }

        setBackendApiKey(normalizeValue(response.data?.api_key));
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setBackendApiKey("");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function createStop(value = "") {
    nextStopIdRef.current += 1;
    return {
      id: `stop-${Date.now()}-${nextStopIdRef.current}`,
      value,
    };
  }

  function addStopValue(value = "") {
    const stop = createStop(value);
    setStops((current) => [...current, stop]);
  }

  function removeStop(id) {
    setStops((current) => current.filter((stop) => stop.id !== id));
  }

  function updateStop(id, value) {
    setStops((current) =>
      current.map((stop) => (stop.id === id ? { ...stop, value } : stop)),
    );
  }

  function resetPlanner() {
    setOrigin(DEFAULT_ORIGIN);
    setReturnToOrigin(false);
    setStops([]);
    setIframeSrc("");
    setStatus({
      tone: "info",
      message: "Planificateur reinitialise. Ajoutez un nouveau trajet.",
    });
  }

  function buildRoute() {
    if (!normalizeValue(origin)) {
      setIframeSrc("");
      setStatus({
        tone: "warning",
        message: "Renseignez le point de depart avant de construire l itineraire.",
      });
      return;
    }

    if (cleanedStopValues.length === 0) {
      setIframeSrc("");
      setStatus({
        tone: "warning",
        message: "Ajoutez au moins un arret pour generer le trajet.",
      });
      return;
    }

    const route = buildRouteData(origin, stops, returnToOrigin);
    if (!route) {
      setIframeSrc("");
      setStatus({
        tone: "warning",
        message: "Impossible de calculer le trajet avec les donnees actuelles.",
      });
      return;
    }
    if (!backendApiKey) {
      setIframeSrc("");
      setStatus({
        tone: "warning",
        message:
          "Cle Google absente. Ajoutez-la dans le .env du backend ou utilisez le lien externe.",
      });
      return;
    }

    setIframeSrc(
      buildEmbedIframeUrl({
        apiKey: backendApiKey,
        origin: route.origin,
        destination: route.destination,
        waypoints: route.waypoints,
      }),
    );
    setStatus({
      tone: "success",
      message: `Itineraire genere avec ${stopCountLabel(cleanedStopValues.length)}.`,
    });
  }

  function handlePickStop(lat, lng) {
    addStopValue(`${lat.toFixed(6)},${lng.toFixed(6)}`);
    setPickerOpen(false);
    setStatus({
      tone: "success",
      message: "Nouvel arret ajoute depuis la carte.",
    });
  }

  return (
    <div className="routePlannerShell">
      <section className="routePlannerHero">
        <div>
          <div className="routePlannerEyebrow">Admin only</div>
          <h1 className="routePlannerTitle">Planification d itineraire</h1>
          <p className="routePlannerLead">
            L admin peut construire un trajet multi-arrets, ouvrir le parcours
            dans Google Maps et ajouter des arrets directement depuis la carte.
          </p>
        </div>

        <div className="routePlannerHeroActions">
          <button className="admDashBtn" type="button" onClick={buildRoute}>
            Construire l itineraire
          </button>
          <button
            className="admDashBtn"
            type="button"
            onClick={() => setPickerOpen(true)}
          >
            Choisir un arret sur la carte
          </button>
        </div>
      </section>

      <div className="routePlannerGrid">
        <section className="routePlannerPanel">
          <div className="routePlannerGroup">
            <div className="routePlannerLabel">Configuration Google Maps</div>
            <div className="routePlannerHint">
              La cle est recuperee automatiquement depuis le backend via un
              endpoint admin protege. Elle n est plus editable dans le frontend.
            </div>
          </div>

          <div className="routePlannerGroup">
            <label className="routePlannerLabel">Point de depart</label>
            <input
              className="routePlannerInput"
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              type="text"
              placeholder="36.8065,10.1815 ou une adresse"
            />
            <div className="routePlannerHint">
              Accepte des coordonnees <code>lat,lng</code> ou une adresse Google
              Maps.
            </div>
          </div>

          <div className="routePlannerGroup">
            <label className="routePlannerToggle">
              <input
                checked={returnToOrigin}
                onChange={(event) => setReturnToOrigin(event.target.checked)}
                type="checkbox"
              />
              <span>Retour au point de depart</span>
            </label>
            <div className="routePlannerHint">
              Si active, le trajet redevient circulaire et le depart est aussi
              la destination finale.
            </div>
          </div>

          <div className="routePlannerGroup">
            <div className="routePlannerSectionHead">
              <div>
                <div className="routePlannerLabel">Arrets de livraison</div>
                <div className="routePlannerHint">
                  Ajoutez des arrets manuellement ou depuis la carte.
                </div>
              </div>

              <button type="button" onClick={() => addStopValue("")}>
                Ajouter un arret
              </button>
            </div>

            {stops.length === 0 ? (
              <div className="routePlannerEmpty">
                Aucun arret pour le moment.
              </div>
            ) : (
              <div className="routePlannerStops">
                {stops.map((stop, index) => (
                  <div key={stop.id} className="routePlannerStopCard">
                    <div className="routePlannerStopHead">
                      <span className="routePlannerBadge">{index + 1}</span>
                      <button type="button" onClick={() => removeStop(stop.id)}>
                        Supprimer
                      </button>
                    </div>
                    <input
                      className="routePlannerInput"
                      type="text"
                      value={getStopValue(stop)}
                      onChange={(event) =>
                        updateStop(stop.id, event.target.value)
                      }
                      placeholder="Stop: lat,lng ou adresse"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="routePlannerActions">
            <button type="button" onClick={() => setPickerOpen(true)}>
              Choisir sur la carte
            </button>
            <button type="button" onClick={buildRoute}>
              Construire
            </button>
            <button type="button" onClick={resetPlanner}>
              Reinitialiser le trajet
            </button>
          </div>

          <div className={`routePlannerStatus ${status.tone}`}>
            {status.message}
          </div>
        </section>

        <section className="routePlannerMapColumn">
          <div className="routePlannerPanel routePlannerPreviewPanel">
            <div className="routePlannerPreviewHead">
              <div>
                <div className="routePlannerPreviewTitle">
                  Apercu de l itineraire
                </div>
                <div className="routePlannerHint">
                  Origine: <strong>{normalizeValue(origin) || "A definir"}</strong>
                </div>
              </div>

              <a
                className="routePlannerLink"
                href={openMapsUrl}
                target="_blank"
                rel="noreferrer"
              >
                Ouvrir dans Google Maps
              </a>
            </div>

            <div className="routePlannerSummary">
              <div className="routePlannerSummaryCard">
                <span>Arrets</span>
                <strong>{cleanedStopValues.length}</strong>
              </div>
              <div className="routePlannerSummaryCard">
                <span>Destination</span>
                <strong>{destinationSummary}</strong>
              </div>
              <div className="routePlannerSummaryCard">
                <span>Mode</span>
                <strong>{returnToOrigin ? "Aller-retour" : "Aller simple"}</strong>
              </div>
            </div>

            {iframeSrc ? (
              <iframe
                className="routePlannerFrame"
                title="admin-route-preview"
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={iframeSrc}
              />
            ) : (
              <div className="routePlannerPlaceholder">
                <div className="routePlannerPlaceholderTitle">
                  Aucun apercu integre pour l instant
                </div>
                <div className="routePlannerPlaceholderText">
                  Construisez l itineraire ou utilisez le lien externe Google
                  Maps. Si l iframe ne fonctionne pas, verifiez que la Maps
                  Embed API, la facturation et les restrictions de domaine sont
                  actives pour votre cle.
                </div>
              </div>
            )}
          </div>
        </section>
      </div>

      <MapPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={handlePickStop}
        apiKey={backendApiKey}
      />
    </div>
  );
}
