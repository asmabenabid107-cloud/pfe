import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api/client.js";
import tourneeService from "../../api/tourneeService.js";
import {
  configureGoogleMapsOnce,
  loadMapsLibrary,
} from "../../lib/googleMapsLoader.js";

const DEFAULT_CENTER = { lat: 36.8065, lng: 10.1815 };
const DEPOT_COORDS = {
  kairouan: {
    lat: 35.68779123889766,
    lng: 10.083732874866017,
  },
  sousse: {
    lat: 35.77005959180682,
    lng: 10.594931528518906,
  },
};
const ROUTE_COLORS = [
  "#2d5bff",
  "#16a34a",
  "#f59e0b",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#65a30d",
  "#ea580c",
  "#475569",
];
const EMPTY_STATUS = {
  tone: "info",
  message: "Selectionnez une tournee, un livreur, ou affichez tous les trajets.",
};

function normalizeValue(value) {
  return String(value || "").trim();
}

function toCoordinate(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCoordinate(value) {
  const coordinate = toCoordinate(value);
  return coordinate == null ? "" : coordinate.toFixed(6);
}

function formatCoordinatePair(latitude, longitude) {
  const lat = formatCoordinate(latitude);
  const lng = formatCoordinate(longitude);

  return lat && lng ? `${lat},${lng}` : "";
}

function comparableValue(value) {
  return normalizeValue(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatNumber(value, suffix = "") {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return `${value}${suffix}`;
}

function stopCountLabel(count) {
  return `${count} arret${count > 1 ? "s" : ""}`;
}

function getCourierName(tournee) {
  const name = normalizeValue(tournee?.livreur_name);
  return name && name !== "-" ? name : "Livreur non assigne";
}

function getTourneeDepotPoint(tournee) {
  const depotKey = comparableValue(tournee?.depot_depart);
  const fallback = DEPOT_COORDS[depotKey];
  const lat = toCoordinate(tournee?.depot_latitude) ?? fallback?.lat;
  const lng = toCoordinate(tournee?.depot_longitude) ?? fallback?.lng;

  if (lat == null || lng == null) {
    return null;
  }

  return {
    lat,
    lng,
    label: "D",
    title: tournee?.depot_label || tournee?.depot_adresse || "Depot",
    kind: "depot",
  };
}

function getTourneeStopPoints(tournee) {
  return (tournee?.stops || [])
    .map((stop, index) => {
      const lat = toCoordinate(stop.latitude);
      const lng = toCoordinate(stop.longitude);

      if (lat == null || lng == null) {
        return null;
      }

      const order = stop.ordre || index + 1;
      return {
        lat,
        lng,
        label: String(order),
        title: stop.adresse || `Arret ${order}`,
        kind: "stop",
        order,
        stop,
      };
    })
    .filter(Boolean);
}

function getTourneeRoute(tournee) {
  const depot = getTourneeDepotPoint(tournee);
  const stops = getTourneeStopPoints(tournee);

  if (!depot && stops.length === 0) {
    return {
      markerPoints: [],
      pathPoints: [],
      stops: [],
    };
  }

  if (!depot) {
    return {
      markerPoints: stops,
      pathPoints: stops,
      stops,
    };
  }

  return {
    markerPoints: [depot, ...stops],
    pathPoints: stops.length > 0 ? [depot, ...stops] : [depot],
    stops,
  };
}

function getRoutePointMarkerKey(tournee, point) {
  if (!tournee || !point) {
    return "";
  }

  const pointId =
    point.kind === "stop"
      ? point.stop?.colis_id || point.order || point.label
      : "depot";

  return `${tournee.id}:${point.kind}:${pointId}`;
}

function countTourneeStops(tournee) {
  return getTourneeStopPoints(tournee).length;
}

function getTourneeDirectionsUrl(tournee) {
  const route = getTourneeRoute(tournee);
  const depot = route.pathPoints[0];
  const stops = route.stops.map((point) =>
    formatCoordinatePair(point.lat, point.lng),
  );

  if (!depot || stops.length === 0) {
    return "";
  }

  const params = new URLSearchParams();
  const destination = route.stops[route.stops.length - 1];
  params.set("api", "1");
  params.set("origin", formatCoordinatePair(depot.lat, depot.lng));
  params.set("destination", formatCoordinatePair(destination.lat, destination.lng));
  if (stops.length > 1) {
    params.set("waypoints", stops.slice(0, -1).join("|"));
  }
  params.set("travelmode", "driving");

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function getTourneeTimelineSteps(tournee) {
  if (!tournee) {
    return [];
  }

  const depot = getTourneeDepotPoint(tournee);
  const stops = getTourneeStopPoints(tournee);
  const depotStep = depot
    ? {
        id: "depot-start",
        markerLabel: "D",
        adresse: depot.title,
        details: formatCoordinatePair(depot.lat, depot.lng),
        markerKey: getRoutePointMarkerKey(tournee, depot),
        kind: "depot",
      }
    : null;

  const stopSteps = stops.map((point, index) => {
    const stop = point.stop || {};
    const coordinates = formatCoordinatePair(point.lat, point.lng);
    const poids = formatNumber(stop.poids, " kg");
    const meta = [
      coordinates,
      stop.numero_suivi ? `Colis ${stop.numero_suivi}` : "",
      poids !== "-" ? `Poids ${poids}` : "",
    ].filter(Boolean);

    return {
      id: stop.colis_id || `stop-${index + 1}`,
      markerLabel: point.label,
      adresse: point.title || coordinates || `Arret ${index + 1}`,
      details: meta.join(" | "),
      markerKey: getRoutePointMarkerKey(tournee, point),
      kind: "stop",
    };
  });

  if (!depotStep) {
    return stopSteps;
  }

  return [depotStep, ...stopSteps];
}

function appendMapInfoText(parent, tagName, className, text) {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;
  parent.appendChild(element);
  return element;
}

function appendMapInfoRow(parent, label, value) {
  if (value === null || value === undefined || value === "") {
    return;
  }

  const row = document.createElement("div");
  row.className = "routePlannerMapInfoRow";

  appendMapInfoText(row, "span", "", label);
  appendMapInfoText(row, "strong", "", String(value));
  parent.appendChild(row);
}

function createMapInfoContent(point, tournee) {
  const root = document.createElement("div");
  root.className = "routePlannerMapInfo";

  if (point.kind === "depot") {
    appendMapInfoText(root, "div", "routePlannerMapInfoTitle", "Depot");
    appendMapInfoText(
      root,
      "div",
      "routePlannerMapInfoSubtitle",
      tournee?.nom || "Tournee",
    );

    const rows = document.createElement("div");
    rows.className = "routePlannerMapInfoRows";
    appendMapInfoRow(rows, "Adresse", point.title);
    appendMapInfoRow(rows, "Coordonnees", formatCoordinatePair(point.lat, point.lng));
    root.appendChild(rows);
    return root;
  }

  const stop = point.stop || {};
  const poids = formatNumber(stop.poids, " kg");
  const distance = formatNumber(stop.distance_depuis_precedent, " km");

  appendMapInfoText(
    root,
    "div",
    "routePlannerMapInfoTitle",
    `Arret ${point.order || point.label}`,
  );
  appendMapInfoText(
    root,
    "div",
    "routePlannerMapInfoSubtitle",
    tournee?.nom || "Tournee",
  );

  const rows = document.createElement("div");
  rows.className = "routePlannerMapInfoRows";
  appendMapInfoRow(rows, "Adresse", point.title);
  appendMapInfoRow(rows, "Colis", stop.numero_suivi);
  appendMapInfoRow(rows, "Destinataire", stop.nom_destinataire);
  appendMapInfoRow(rows, "Telephone", stop.telephone_destinataire);
  if (poids !== "-") {
    appendMapInfoRow(rows, "Poids", poids);
  }
  if (distance !== "-") {
    appendMapInfoRow(rows, "Depuis precedent", distance);
  }
  appendMapInfoRow(rows, "Coordonnees", formatCoordinatePair(point.lat, point.lng));
  root.appendChild(rows);

  return root;
}

function createNumberedStopIcon(maps, color) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="50" viewBox="0 0 36 50">
      <line x1="18" y1="31" x2="18" y2="44" stroke="#111827" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="18" cy="18" r="13.5" fill="${color}" stroke="#ffffff" stroke-width="3"/>
      <circle cx="18" cy="44" r="4.5" fill="#111827" stroke="#ffffff" stroke-width="1.5"/>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new maps.Size(36, 50),
    anchor: new maps.Point(18, 44),
    labelOrigin: new maps.Point(18, 18),
  };
}

function focusRouteMarker({ map, marker, position, infoWindow, point, tournee }) {
  map.panTo(position);
  map.setZoom(Math.max(map.getZoom() || 0, 16));
  infoWindow.setContent(createMapInfoContent(point, tournee));
  infoWindow.open({
    anchor: marker,
    map,
    shouldFocus: false,
  });
}

function createRouteMarker({ maps, map, point, tournee, color, infoWindow }) {
  const position = { lat: point.lat, lng: point.lng };
  const isDepot = point.kind === "depot";
  const marker = new maps.Marker({
    map,
    position,
    label: {
      text: point.label,
      color: "#ffffff",
      fontSize: point.label.length > 2 ? "10px" : "12px",
      fontWeight: "900",
    },
    title: `${tournee.nom} - ${point.title}`,
    icon: isDepot
      ? undefined
      : createNumberedStopIcon(maps, color),
  });

  marker.routePlannerFocus = () =>
    focusRouteMarker({ map, marker, position, infoWindow, point, tournee });

  marker.addListener("click", marker.routePlannerFocus);

  return marker;
}

function buildRouteSegments(pathPoints, maxWaypointCount = 23) {
  if (pathPoints.length < 2) {
    return [];
  }

  const maxPointsPerSegment = maxWaypointCount + 2;
  const segments = [];
  let startIndex = 0;

  while (startIndex < pathPoints.length - 1) {
    const endIndex = Math.min(
      pathPoints.length - 1,
      startIndex + maxPointsPerSegment - 1,
    );

    segments.push(pathPoints.slice(startIndex, endIndex + 1));
    startIndex = endIndex;
  }

  return segments;
}

function toOsrmCoordinate(point) {
  return `${point.lng},${point.lat}`;
}

async function getOsrmRoutePaths(pathPoints) {
  if (pathPoints.length <= 1) {
    return [];
  }

  const routeSegments = buildRouteSegments(pathPoints);
  const paths = [];

  for (const segment of routeSegments) {
    const coordinates = segment.map(toOsrmCoordinate).join(";");
    const params = new URLSearchParams({
      overview: "full",
      geometries: "geojson",
      steps: "false",
    });
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordinates}?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`OSRM route request failed: ${response.status}`);
    }

    const data = await response.json();
    const geometry = data?.routes?.[0]?.geometry?.coordinates;

    if (!Array.isArray(geometry) || geometry.length === 0) {
      throw new Error("OSRM route response did not include geometry");
    }

    paths.push(
      geometry.map(([lng, lat]) => ({
        lat,
        lng,
      })),
    );
  }

  return paths;
}

function getVisibleTitle({ selectedTournee, selectedCourierName, mapView }) {
  if (selectedTournee) {
    return selectedTournee.nom;
  }

  if (mapView === "courier" && selectedCourierName) {
    return `Trajet de ${selectedCourierName}`;
  }

  if (mapView === "all") {
    return "Tous les trajets acceptes";
  }

  return "Apercu des trajets";
}

export default function Planification() {
  const mapDivRef = useRef(null);
  const mapRef = useRef(null);
  const mapContainerRef = useRef(null);
  const mapMarkersRef = useRef([]);
  const mapMarkerLookupRef = useRef(new Map());
  const mapPolylinesRef = useRef([]);
  const mapInfoWindowRef = useRef(null);
  const [backendApiKey, setBackendApiKey] = useState("");
  const [acceptedTournees, setAcceptedTournees] = useState([]);
  const [acceptedLoading, setAcceptedLoading] = useState(true);
  const [acceptedError, setAcceptedError] = useState("");
  const [selectedTournee, setSelectedTournee] = useState(null);
  const [selectedCourierName, setSelectedCourierName] = useState("");
  const [mapView, setMapView] = useState("empty");
  const [status, setStatus] = useState(EMPTY_STATUS);

  const courierNames = useMemo(() => {
    return Array.from(new Set(acceptedTournees.map(getCourierName))).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [acceptedTournees]);

  const visibleTournees = useMemo(() => {
    if (mapView === "single" && selectedTournee) {
      return [selectedTournee];
    }

    if (mapView === "courier" && selectedCourierName) {
      return acceptedTournees.filter(
        (tournee) => getCourierName(tournee) === selectedCourierName,
      );
    }

    if (mapView === "all") {
      return acceptedTournees;
    }

    return [];
  }, [acceptedTournees, mapView, selectedCourierName, selectedTournee]);

  const visibleStopCount = useMemo(() => {
    return visibleTournees.reduce(
      (total, tournee) => total + countTourneeStops(tournee),
      0,
    );
  }, [visibleTournees]);

  const selectedSteps = useMemo(
    () => getTourneeTimelineSteps(selectedTournee),
    [selectedTournee],
  );
  const activeDirectionsTournee = useMemo(
    () => (visibleTournees.length === 1 ? visibleTournees[0] : null),
    [visibleTournees],
  );
  const selectedOpenMapsUrl = activeDirectionsTournee
    ? getTourneeDirectionsUrl(activeDirectionsTournee)
    : "";
  const mapMode =
    visibleTournees.length > 1
      ? "multi"
      : activeDirectionsTournee
        ? "directions"
        : "empty";
  const previewTitle = getVisibleTitle({
    selectedTournee,
    selectedCourierName,
    mapView,
  });

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

    loadAcceptedTournees();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedCourierName || courierNames.includes(selectedCourierName)) {
      return;
    }

    setSelectedCourierName("");
    setMapView("empty");
    setStatus(EMPTY_STATUS);
  }, [courierNames, selectedCourierName]);

  useEffect(() => {
    if (!backendApiKey || !mapDivRef.current) {
      return undefined;
    }

    let cancelled = false;

    async function drawMap() {
  configureGoogleMapsOnce(backendApiKey);
  const maps = await loadMapsLibrary();

  if (cancelled || !maps || !mapDivRef.current) {
    return;
  }

  if (!mapRef.current || mapContainerRef.current !== mapDivRef.current) {
    mapContainerRef.current = mapDivRef.current;
    mapRef.current = new maps.Map(mapDivRef.current, {
      center: DEFAULT_CENTER,
      zoom: 7,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
  }

  clearMapOverlays();

  if (!mapInfoWindowRef.current) {
    mapInfoWindowRef.current = new maps.InfoWindow();
  }

  const map = mapRef.current;
  const infoWindow = mapInfoWindowRef.current;

  if (visibleTournees.length === 0) {
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(7);
    return;
  }

  const bounds = new maps.LatLngBounds();
  let hasBounds = false;

  const extendBounds = (point) => {
    bounds.extend({ lat: point.lat, lng: point.lng });
    hasBounds = true;
  };

  const addRouteMarkers = (route, tournee, color) => {
    route.markerPoints.forEach((point) => {
      extendBounds(point);
      const marker = createRouteMarker({
        maps,
        map,
        point,
        tournee,
        color,
        infoWindow,
      });

      mapMarkersRef.current.push(marker);
      mapMarkerLookupRef.current.set(
        getRoutePointMarkerKey(tournee, point),
        marker,
      );
    });
  };

  const drawRoadRoute = async (pathPoints, color, strokeWeight) => {
    if (pathPoints.length <= 1) {
      return false;
    }

    const routePaths = await getOsrmRoutePaths(pathPoints);

    if (cancelled) {
      return true;
    }

    routePaths.forEach((path) => {
      mapPolylinesRef.current.push(
        new maps.Polyline({
          map,
          path,
          geodesic: true,
          strokeColor: color,
          strokeOpacity: 0.86,
          strokeWeight,
        }),
      );
    });

    return routePaths.length > 0;
  };

  const drawStraightRoute = (pathPoints, color, strokeWeight) => {
    const path = pathPoints.map((point) => ({
      lat: point.lat,
      lng: point.lng,
    }));

    if (path.length <= 1) {
      return;
    }

    mapPolylinesRef.current.push(
      new maps.Polyline({
        map,
        path,
        geodesic: true,
        strokeColor: color,
        strokeOpacity: 0.56,
        strokeWeight,
      }),
    );
  };

  const drawRouteWithRoadFallback = async (
    pathPoints,
    color,
    strokeWeight,
  ) => {
    if (pathPoints.length <= 1) {
      return true;
    }

    try {
      return await drawRoadRoute(pathPoints, color, strokeWeight);
    } catch (err) {
      console.warn(err);
      drawStraightRoute(pathPoints, color, strokeWeight);
      return false;
    }
  };

  if (mapMode === "directions" && activeDirectionsTournee) {
    const color = ROUTE_COLORS[0];
    const route = getTourneeRoute(activeDirectionsTournee);

    addRouteMarkers(route, activeDirectionsTournee, color);
    route.pathPoints.forEach(extendBounds);

    const roadRouteDrawn = await drawRouteWithRoadFallback(
      route.pathPoints,
      color,
      5,
    );

    if (!roadRouteDrawn && !cancelled) {
      setStatus({
        tone: "warning",
        message:
          "Le calcul routier est indisponible pour ce trajet. Un trace direct est affiche avec les arrets numerotes et cliquables.",
      });
    }

    if (hasBounds) {
      map.fitBounds(bounds, 52);
    }

    return;
  }

  let usedRoadRouteFailure = false;

  for (const [tourneeIndex, tournee] of visibleTournees.entries()) {
    const color = ROUTE_COLORS[tourneeIndex % ROUTE_COLORS.length];
    const route = getTourneeRoute(tournee);

    route.pathPoints.forEach(extendBounds);

    const roadRouteDrawn = await drawRouteWithRoadFallback(
      route.pathPoints,
      color,
      visibleTournees.length === 1 ? 5 : 3,
    );

    usedRoadRouteFailure = usedRoadRouteFailure || !roadRouteDrawn;

    addRouteMarkers(route, tournee, color);

    if (cancelled) {
      return;
    }
  }

  if (usedRoadRouteFailure && !cancelled) {
    setStatus({
      tone: "warning",
      message:
        "Certains calculs routiers sont indisponibles. Un trace direct est affiche pour ces trajets avec les arrets numerotes et cliquables.",
    });
  }

  if (hasBounds) {
    map.fitBounds(bounds, 52);
  }
}

    drawMap().catch((err) => {
      console.error(err);
      setStatus({
        tone: "warning",
        message:
          "Carte Google indisponible. Verifiez la cle Google Maps du backend.",
      });
    });

    return () => {
      cancelled = true;
      clearMapOverlays();
    };
  }, [activeDirectionsTournee, backendApiKey, mapMode, visibleTournees]);

  function clearMapOverlays() {
    if (mapInfoWindowRef.current) {
      mapInfoWindowRef.current.close();
    }

    mapMarkersRef.current.forEach((marker) => marker.setMap(null));
    mapMarkersRef.current = [];
    mapMarkerLookupRef.current.clear();

    mapPolylinesRef.current.forEach((polyline) => polyline.setMap(null));
    mapPolylinesRef.current = [];

  }

  async function loadAcceptedTournees(cancelled = false) {
    try {
      setAcceptedLoading(true);
      setAcceptedError("");

      const data = await tourneeService.getAccepted();

      if (cancelled) {
        return;
      }

      const nextTournees = Array.isArray(data) ? data : [];
      setAcceptedTournees(nextTournees);
      setSelectedTournee((current) => {
        if (!current) {
          return null;
        }

        return nextTournees.find((tournee) => tournee.id === current.id) || null;
      });
    } catch (err) {
      console.error(err);

      if (cancelled) {
        return;
      }

      setAcceptedError("Erreur chargement des tournees acceptees.");
      setAcceptedTournees([]);
    } finally {
      if (!cancelled) {
        setAcceptedLoading(false);
      }
    }
  }

  function selectAcceptedTournee(tournee) {
    const stopCount = countTourneeStops(tournee);

    setSelectedTournee(tournee);
    setSelectedCourierName("");
    setMapView("single");
    setStatus({
      tone: "success",
      message: `Tournee ${tournee.nom} affichee sur la carte avec ${stopCountLabel(
        stopCount,
      )}.`,
    });
  }

  function showAllRoutes() {
    setSelectedTournee(null);
    setSelectedCourierName("");
    setMapView("all");
    setStatus({
      tone: "success",
      message: `${acceptedTournees.length} trajet(s) accepte(s) affiches sur la carte.`,
    });
  }

  function selectCourier(event) {
    const nextCourierName = event.target.value;
    setSelectedTournee(null);
    setSelectedCourierName(nextCourierName);

    if (!nextCourierName) {
      setMapView("empty");
      setStatus(EMPTY_STATUS);
      return;
    }

    const courierTournees = acceptedTournees.filter(
      (tournee) => getCourierName(tournee) === nextCourierName,
    );
    const stopCount = courierTournees.reduce(
      (total, tournee) => total + countTourneeStops(tournee),
      0,
    );

    setMapView("courier");
    setStatus({
      tone: "success",
      message: `${nextCourierName}: ${courierTournees.length} trajet(s), ${stopCountLabel(
        stopCount,
      )} affiches sur la carte.`,
    });
  }

  function focusStepOnMap(step) {
    if (!step?.markerKey || step.kind !== "stop") {
      return;
    }

    const marker = mapMarkerLookupRef.current.get(step.markerKey);

    if (!marker?.routePlannerFocus) {
      setStatus({
        tone: "warning",
        message: "La carte charge encore ce point. Reessayez dans un instant.",
      });
      return;
    }

    mapDivRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });

    window.setTimeout(() => {
      marker.routePlannerFocus();
    }, 220);

    setStatus({
      tone: "success",
      message: `Arret ${step.markerLabel} affiche sur la carte.`,
    });
  }

  function handleTimelineKeyDown(event, step) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    focusStepOnMap(step);
  }

  return (
    <div className="routePlannerShell">
      <section className="routePlannerHero">
        <div>
          <div className="routePlannerEyebrow">Admin only</div>
          <h1 className="routePlannerTitle">Planification des tournees</h1>
          <p className="routePlannerLead">
            Les tournees acceptees sont affichees directement avec leurs
            coordonnees GPS. Les marqueurs numerotes suivent l ordre du trajet.
          </p>
        </div>

        <div className="routePlannerHeroActions">
          <button
            className="admDashBtn"
            type="button"
            onClick={() => loadAcceptedTournees()}
            disabled={acceptedLoading}
          >
            {acceptedLoading ? "Chargement..." : "Rafraichir tournees"}
          </button>
        </div>
      </section>

      <div className="routePlannerGrid">
        <div className="routePlannerSideColumn">
          <section className="routePlannerPanel routePlannerAcceptedPanel">
            <div className="routePlannerAcceptedHead">
              <div>
                <div className="routePlannerPreviewTitle">
                  Tournees acceptees
                </div>
                <div className="routePlannerHint">
                  Selectionnez une note, affichez tout, ou filtrez par livreur.
                </div>
              </div>
              <span className="routePlannerCountPill">
                {acceptedTournees.length}
              </span>
            </div>

            <div className="routePlannerAcceptedActions">
              <button
                className="admDashBtn"
                type="button"
                onClick={showAllRoutes}
                disabled={acceptedLoading || acceptedTournees.length === 0}
              >
                Afficher tous les trajets
              </button>

              <label className="routePlannerCourierSelectWrap">
                <span>Liste deroulante des livreurs</span>
                <select
                  className="routePlannerCourierSelect"
                  value={selectedCourierName}
                  onChange={selectCourier}
                  disabled={acceptedLoading || courierNames.length === 0}
                >
                  <option value="">Choisir un livreur</option>
                  {courierNames.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {acceptedError ? (
              <div className="routePlannerStatus warning">{acceptedError}</div>
            ) : null}

            {acceptedLoading ? (
              <div className="routePlannerEmpty">
                Chargement des tournees acceptees...
              </div>
            ) : acceptedTournees.length === 0 ? (
              <div className="routePlannerEmpty">
                Aucune tournee acceptee pour le moment.
              </div>
            ) : (
              <div className="stickyTourneeGrid">
                {acceptedTournees.map((tournee) => {
                  const routeStops = countTourneeStops(tournee);
                  const courierName = getCourierName(tournee);
                  const isActive =
                    selectedTournee?.id === tournee.id ||
                    (mapView === "courier" &&
                      selectedCourierName &&
                      courierName === selectedCourierName);

                  return (
                    <button
                      key={tournee.id}
                      className={`stickyTourneeNote${
                        isActive ? " isActive" : ""
                      }`}
                      type="button"
                      onClick={() => selectAcceptedTournee(tournee)}
                    >
                      <div className="stickyTourneeTop">
                        <span className="stickyTourneeCode">
                          TOUR-{String(tournee.id).padStart(3, "0")}
                        </span>
                        <span className="stickyTourneeTime">
                          {stopCountLabel(routeStops)}
                        </span>
                      </div>

                      <div className="stickyTourneeName">{tournee.nom}</div>

                      <div className="stickyTourneeBody">
                        Livreur {courierName}. Cette tournee contient{" "}
                        {formatNumber(tournee.nombre_colis)} colis pour{" "}
                        {formatNumber(tournee.poids_total, " kg")} avec un
                        trajet estime a {formatNumber(tournee.distance_km, " km")}.
                      </div>

                      <div className="stickyTourneeFoot">
                        <span className="stickyTourneeStatus">Acceptee</span>
                        <strong>{formatNumber(tournee.distance_km, " km")}</strong>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <section className="routePlannerMapColumn">
          <div className="routePlannerPanel routePlannerPreviewPanel">
            <div className="routePlannerPreviewHead">
              <div>
                <div className="routePlannerPreviewTitle">{previewTitle}</div>
                <div className="routePlannerHint">
                  {visibleTournees.length > 0
                    ? `${visibleTournees.length} trajet(s), ${stopCountLabel(
                        visibleStopCount,
                      )} sur la carte.`
                    : "Aucun trajet affiche pour le moment."}
                </div>
              </div>

              {selectedOpenMapsUrl ? (
                <a
                  className="routePlannerLink"
                  href={selectedOpenMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Ouvrir dans Google Maps
                </a>
              ) : null}
            </div>

            <div className="routePlannerSummary">
              <div className="routePlannerSummaryCard">
                <span>Trajets</span>
                <strong>{visibleTournees.length}</strong>
              </div>
              <div className="routePlannerSummaryCard">
                <span>Arrets</span>
                <strong>{visibleStopCount}</strong>
              </div>
              <div className="routePlannerSummaryCard">
                <span>Vue</span>
                <strong>
                  {selectedTournee
                    ? "Tournee"
                    : selectedCourierName || mapView === "all"
                      ? selectedCourierName || "Globale"
                      : "A definir"}
                </strong>
              </div>
            </div>

            {backendApiKey ? (
              <div
                ref={mapDivRef}
                className="routePlannerFrame routePlannerGoogleMap"
                role="application"
                aria-label="Carte des trajets acceptes"
              />
            ) : (
              <div className="routePlannerPlaceholder">
                <div className="routePlannerPlaceholderTitle">
                  Carte Google indisponible
                </div>
                <div className="routePlannerPlaceholderText">
                  La cle Google Maps n est pas disponible depuis le backend.
                </div>
              </div>
            )}

            {visibleTournees.length > 0 ? (
              <div className="routePlannerLegend">
                {visibleTournees.map((tournee, index) => (
                  <span key={tournee.id} className="routePlannerLegendPill">
                    <span
                      aria-hidden="true"
                      style={{
                        background: ROUTE_COLORS[index % ROUTE_COLORS.length],
                      }}
                    />
                    {tournee.nom}
                  </span>
                ))}
              </div>
            ) : null}

            <div className={`routePlannerStatus ${status.tone}`}>
              {status.message}
            </div>
          </div>
        </section>

        {selectedTournee ? (
          <section className="routePlannerPanel routePlannerDetailsPanel routePlannerDetailsPanelFull">
            <div className="routePlannerPreviewHead">
              <div>
                <div className="routePlannerPreviewTitle">
                  Details de la tournee
                </div>
                <div className="routePlannerHint">
                  Parcours accepte par l administrateur.
                </div>
              </div>
              <span className="routePlannerCountPill">
                {stopCountLabel(countTourneeStops(selectedTournee))}
              </span>
            </div>

            <div className="routePlannerDetailsGrid">
              <Info label="Livreur" value={getCourierName(selectedTournee)} />
              <Info
                label="Vehicule"
                value={`${selectedTournee.vehicle_name || "-"} | Capacite: ${
                  selectedTournee.vehicle_capacity || "-"
                } kg`}
              />
              <Info
                label="Colis"
                value={formatNumber(selectedTournee.nombre_colis)}
              />
              <Info
                label="Distance"
                value={formatNumber(selectedTournee.distance_km, " km")}
              />
            </div>

            <div className="routePlannerTimeline routePlannerTimelineFull">
              {selectedSteps.length > 0 ? (
                selectedSteps.map((step) => {
                  const isClickable = step.kind === "stop" && step.markerKey;

                  return (
                    <div
                      key={step.id}
                      className={`routePlannerTimelineRow${
                        isClickable ? " isClickable" : ""
                      }`}
                      role={isClickable ? "button" : undefined}
                      tabIndex={isClickable ? 0 : undefined}
                      onClick={
                        isClickable ? () => focusStepOnMap(step) : undefined
                      }
                      onKeyDown={
                        isClickable
                          ? (event) => handleTimelineKeyDown(event, step)
                          : undefined
                      }
                    >
                      <span className="routePlannerTimelineNumber">
                        {step.markerLabel}
                      </span>
                      <div className="routePlannerTimelineCard">
                        <strong>{step.adresse}</strong>
                        {step.details ? <span>{step.details}</span> : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="routePlannerEmpty">
                  Aucun parcours disponible.
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="routePlannerInfoBox">
      <span>{label}</span>
      <strong>{value || "-"}</strong>
    </div>
  );
}
