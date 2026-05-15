import re
import time
from math import radians, sin, cos, sqrt, atan2

import numpy as np
import requests
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from sklearn.cluster import AgglomerativeClustering
from sqlalchemy.orm import Session

from app.models.colis import Colis
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.geocode_cache import GeocodeCache


DEPOTS = {
    "kairouan": {
        "label": "Dépôt Kairouan AFH 4",
        "adresse": "AFH 4, Kairouan, Tunisie",
        "latitude": 35.68779123889766,
        "longitude": 10.083732874866017,
    },
    "sousse": {
        "label": "Dépôt Sousse Msaken",
        "adresse": "Msaken, Sousse, Tunisie",
        "latitude": 35.77005959180682,
        "longitude": 10.594931528518906,
    },
}


MIN_COLIS_POUR_TOURNEE = 30
MAX_COLIS_PAR_TOURNEE = 300
MAX_GOUVERNORATS_PAR_TOURNEE = 4
MAX_GOV_DISTANCE_IN_TOURNEE_KM = 140
MAX_CLUSTER_DISTANCE_KM = 80

DEPOT_PREFERENCE_BONUS_KM = 25
DEPOT_SWITCH_THRESHOLD_KM = 40


GOVERNORATE_COORDS = {
    "Tunis": (36.8065, 10.1815),
    "Ariana": (36.8665, 10.1647),
    "Ben Arous": (36.7531, 10.2189),
    "Manouba": (36.8080, 10.0972),
    "Bizerte": (37.2746, 9.8739),
    "Nabeul": (36.4513, 10.7350),
    "Sousse": (35.8256, 10.6370),
    "Monastir": (35.7643, 10.8113),
    "Kairouan": (35.6781, 10.0963),
    "Le Kef": (36.1742, 8.7049),
    "Kef": (36.1742, 8.7049),
    "Sfax": (34.7406, 10.7603),
    "Mahdia": (35.5047, 11.0622),
    "Béja": (36.7333, 9.1833),
    "Beja": (36.7333, 9.1833),
    "Jendouba": (36.5011, 8.7802),
    "Zaghouan": (36.4029, 10.1429),
    "Siliana": (36.0833, 9.3667),
    "Kasserine": (35.1676, 8.8365),
    "Sidi Bouzid": (35.0382, 9.4849),
    "Gabès": (33.8815, 10.0982),
    "Gabes": (33.8815, 10.0982),
    "Médenine": (33.3549, 10.5055),
    "Medenine": (33.3549, 10.5055),
    "Tataouine": (32.9297, 10.4518),
    "Gafsa": (34.4250, 8.7842),
    "Tozeur": (33.9197, 8.1335),
    "Kebili": (33.7044, 8.9690),
}


def clean_region(value):
    if not value:
        return "Sans Région"

    value = str(value).strip().lower()
    value = value.replace("gouvernorat de", "")
    value = value.replace("gouvernorat", "")
    value = value.replace("governorate", "")
    value = value.replace("ولاية", "")
    value = re.sub(r"\s+", " ", value).strip()

    return value.title()


def limit_text(value, max_length=120):
    value = str(value or "").strip()

    if len(value) <= max_length:
        return value

    return value[: max_length - 3] + "..."


def normalize_address_key(address, region=None, delegation=None):
    parts = [
        str(address or "").strip().lower(),
        str(delegation or "").strip().lower(),
        str(region or "").strip().lower(),
        "tunisie",
    ]

    return " | ".join([p for p in parts if p])


def search_nominatim(query):
    response = requests.get(
        "https://nominatim.openstreetmap.org/search",
        params={
            "q": query,
            "format": "json",
            "limit": 1,
            "countrycodes": "tn",
            "addressdetails": 1,
            "accept-language": "fr",
        },
        headers={
            "User-Agent": "mz-logistic-pfe/1.0",
        },
        timeout=10,
    )

    data = response.json()

    if data:
        return float(data[0]["lat"]), float(data[0]["lon"])

    return None, None


def get_coordinates_smart(db, address, region=None, delegation=None):
    region = clean_region(region)
    delegation = str(delegation or "").strip()
    address = str(address or "").strip()

    address_key = normalize_address_key(address, region, delegation)

    cached = (
        db.query(GeocodeCache)
        .filter(GeocodeCache.address_key == address_key)
        .first()
    )

    if cached:
        print(f"GPS CACHE: {address_key} => {cached.latitude}, {cached.longitude}")
        return cached.latitude, cached.longitude

    queries = []

    if address:
        queries.append(f"{address}, Tunisie")

    if delegation and region and region != "Sans Région":
        queries.append(f"{delegation}, {region}, Tunisie")

    if region and region != "Sans Région":
        queries.append(f"{region}, Tunisie")

    lat = None
    lon = None

    for q in queries:
        try:
            print("Geocoding:", q)
            lat, lon = search_nominatim(q)

            if lat is not None and lon is not None:
                print("GPS OK:", q, lat, lon)
                break

            print("ZERO RESULT:", q)
            time.sleep(1)

        except Exception as e:
            print("Erreur geocoding:", q, e)

    if lat is None or lon is None:
        print("GPS introuvable:", address, region, delegation)
        return None, None

    cache = GeocodeCache(
        address_key=address_key,
        latitude=lat,
        longitude=lon,
        source="nominatim",
    )

    db.add(cache)
    db.commit()

    return lat, lon


def haversine_distance_km(lat1, lon1, lat2, lon2):
    R = 6371

    lat1, lon1, lat2, lon2 = map(
        radians,
        [lat1, lon1, lat2, lon2],
    )

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return max(1, int(R * c))


def get_region_coords(region):
    region = clean_region(region)
    return GOVERNORATE_COORDS.get(region)


def distance_between_regions(region_a, region_b):
    coords_a = get_region_coords(region_a)
    coords_b = get_region_coords(region_b)

    if not coords_a or not coords_b:
        return 999999

    return haversine_distance_km(
        coords_a[0],
        coords_a[1],
        coords_b[0],
        coords_b[1],
    )


def poids_total_colis(colis_list):
    return sum(float(c.get("poids") or 0) for c in colis_list)


def get_colis_center(colis_list):
    colis_valides = [
        c for c in colis_list
        if c.get("latitude") is not None
        and c.get("longitude") is not None
    ]

    if not colis_valides:
        return None

    return {
        "latitude": sum(c["latitude"] for c in colis_valides) / len(colis_valides),
        "longitude": sum(c["longitude"] for c in colis_valides) / len(colis_valides),
    }


def get_majority_depot_from_colis(colis_zone):
    counts = {}

    for c in colis_zone:
        depot_key = str(c.get("depot_depart") or "").lower().strip()

        if depot_key not in DEPOTS:
            continue

        counts[depot_key] = counts.get(depot_key, 0) + 1

    if not counts:
        return None

    return max(counts.items(), key=lambda x: x[1])[0]


def choose_depot_intelligent(colis_zone):
    center = get_colis_center(colis_zone)

    if not center:
        return "sousse", DEPOTS["sousse"]

    majority_depot = get_majority_depot_from_colis(colis_zone)

    depot_scores = []

    for depot_key, depot in DEPOTS.items():
        distance = haversine_distance_km(
            center["latitude"],
            center["longitude"],
            depot["latitude"],
            depot["longitude"],
        )

        score = distance

        if majority_depot == depot_key:
            score -= DEPOT_PREFERENCE_BONUS_KM

        depot_scores.append({
            "depot_key": depot_key,
            "depot": depot,
            "distance": distance,
            "score": score,
        })

    closest_by_gps = sorted(depot_scores, key=lambda x: x["distance"])[0]
    best_by_score = sorted(depot_scores, key=lambda x: x["score"])[0]

    if majority_depot:
        majority_item = next(
            x for x in depot_scores
            if x["depot_key"] == majority_depot
        )

        difference = majority_item["distance"] - closest_by_gps["distance"]

        if difference >= DEPOT_SWITCH_THRESHOLD_KM:
            print(
                f"IA CORRECTION DEPOT: depot initial={majority_depot} "
                f"trop loin ({majority_item['distance']}km), "
                f"depot GPS={closest_by_gps['depot_key']} "
                f"({closest_by_gps['distance']}km)"
            )

            return closest_by_gps["depot_key"], closest_by_gps["depot"]

    print(
        f"DEPOT CHOISI: {best_by_score['depot_key']} | "
        f"distance={best_by_score['distance']}km | "
        f"score={best_by_score['score']} | "
        f"majority_depot={majority_depot}"
    )

    return best_by_score["depot_key"], best_by_score["depot"]

def can_add_gouvernorat_to_zone(current_zone, new_colis):
    gouvernorats = set(
        clean_region(c.get("gouvernorat"))
        for c in current_zone + [new_colis]
        if c.get("gouvernorat")
    )

    gouvernorats = list(gouvernorats)

    if len(gouvernorats) <= 1:
        return True

    for i in range(len(gouvernorats)):
        for j in range(i + 1, len(gouvernorats)):
            distance = distance_between_regions(
                gouvernorats[i],
                gouvernorats[j],
            )

            if distance > MAX_GOV_DISTANCE_IN_TOURNEE_KM:
                return False

    return True

def split_zone_by_rules(colis_zone, vehicle_capacity):
    colis_zone = sorted(
        colis_zone,
        key=lambda c: (
            clean_region(c.get("gouvernorat")),
            c.get("latitude") or 0,
            c.get("longitude") or 0,
            c["id"],
        )
    )

    zones = []
    current_zone = []
    current_weight = 0

    for c in colis_zone:
        poids = float(c.get("poids") or 0)

        gouvernorats_if_added = set(
            clean_region(x.get("gouvernorat"))
            for x in current_zone + [c]
        )

        should_split = (
            current_zone
            and (
                len(current_zone) >= MAX_COLIS_PAR_TOURNEE
                or current_weight + poids > vehicle_capacity
                or len(gouvernorats_if_added) > MAX_GOUVERNORATS_PAR_TOURNEE
                or not can_add_gouvernorat_to_zone(current_zone, c)
                or not can_merge_by_preferred_group(current_zone, [c])
            )
        )

        if should_split:
            zones.append(current_zone)
            current_zone = []
            current_weight = 0

        current_zone.append(c)
        current_weight += poids

    if current_zone:
        zones.append(current_zone)

    return zones












def merge_small_zones(zones, vehicle_capacity):
    zones = [z for z in zones if z]
    zones.sort(key=lambda z: len(z))

    changed = True

    while changed:
        changed = False
        new_zones = []
        used = set()

        for i, zone in enumerate(zones):
            if i in used:
                continue

            if len(zone) >= MIN_COLIS_POUR_TOURNEE:
                new_zones.append(zone)
                used.add(i)
                continue

            best_j = None
            best_distance = 999999

            center_zone = get_colis_center(zone)

            for j, other in enumerate(zones):
                if j == i or j in used:
                    continue

                merged = zone + other

                if len(merged) > MAX_COLIS_PAR_TOURNEE:
                    continue

                if poids_total_colis(merged) > vehicle_capacity:
                    continue

                gouvernorats_merged = set(
                    clean_region(c.get("gouvernorat"))
                    for c in merged
                    if c.get("gouvernorat")
                )

                if len(gouvernorats_merged) > MAX_GOUVERNORATS_PAR_TOURNEE:
                    continue

                can_merge = True
                gouvernorats_list = list(gouvernorats_merged)

                for a in range(len(gouvernorats_list)):
                    for b in range(a + 1, len(gouvernorats_list)):
                        distance_gov = distance_between_regions(
                            gouvernorats_list[a],
                            gouvernorats_list[b],
                        )

                        if distance_gov > MAX_GOV_DISTANCE_IN_TOURNEE_KM:
                            can_merge = False
                            break

                    if not can_merge:
                        break

                if not can_merge:
                    continue

                center_other = get_colis_center(other)

                if not center_zone or not center_other:
                    continue

                distance = haversine_distance_km(
                    center_zone["latitude"],
                    center_zone["longitude"],
                    center_other["latitude"],
                    center_other["longitude"],
                )

                if distance <= MAX_CLUSTER_DISTANCE_KM and distance < best_distance:
                    best_distance = distance
                    best_j = j

            if best_j is not None:
                merged = zone + zones[best_j]
                new_zones.append(merged)
                used.add(i)
                used.add(best_j)
                changed = True
            else:
                new_zones.append(zone)
                used.add(i)

        zones = new_zones

    return zones



















def create_agglomerative_model(distance_threshold):
    try:
        return AgglomerativeClustering(
            n_clusters=None,
            metric="precomputed",
            linkage="complete",
            distance_threshold=distance_threshold,
        )
    except TypeError:
        return AgglomerativeClustering(
            n_clusters=None,
            affinity="precomputed",
            linkage="complete",
            distance_threshold=distance_threshold,
        )
PREFERRED_GOV_GROUPS = [
    # Grand Tunis - 
    ["Tunis", "Ariana", "Ben Arous", "Manouba"],

    # Cap Bon / Nord-Est 
    ["Nabeul", "Zaghouan"],

    # Sahel - لازم مع بعض
    ["Sousse", "Monastir", "Mahdia"],

    # Nord - Bizerte  /  
    ["Bizerte", "Béja"],

    # Nord-Ouest
    ["Jendouba", "Le Kef", "Siliana"],

    # Centre-Ouest / Centre
    ["Kairouan", "Sidi Bouzid", "Kasserine"],

    # Centre-Est
    ["Sfax"],

    # Sud-Est
    ["Gabès", "Médenine", "Tataouine"],

    # Sud-Ouest
    ["Gafsa", "Tozeur", "Kebili"],
]

def get_group_id_for_gouvernorat(gouvernorat):
    gouvernorat = clean_region(gouvernorat)

    for index, group in enumerate(PREFERRED_GOV_GROUPS):
        cleaned_group = [clean_region(g) for g in group]

        if gouvernorat in cleaned_group:
            return index

    return None


def is_same_preferred_group(gouvernorats):
    gouvernorats = [
        clean_region(g)
        for g in gouvernorats
        if g
    ]

    if not gouvernorats:
        return True

    group_ids = set()

    for gov in gouvernorats:
        group_id = get_group_id_for_gouvernorat(gov)

        if group_id is None:
            return False

        group_ids.add(group_id)

    return len(group_ids) == 1


def can_merge_by_preferred_group(zone_a, zone_b):
    merged = zone_a + zone_b

    gouvernorats = set(
        clean_region(c.get("gouvernorat"))
        for c in merged
        if c.get("gouvernorat")
    )

    return is_same_preferred_group(gouvernorats)


def get_preferred_group_for_gov(gouvernorat):
    gouvernorat = clean_region(gouvernorat)

    for group in PREFERRED_GOV_GROUPS:
        cleaned_group = [clean_region(g) for g in group]

        if gouvernorat in cleaned_group:
            return cleaned_group

    return [gouvernorat]


def can_merge_zones(zone_a, zone_b, vehicle_capacity):
    merged = zone_a + zone_b

    if len(merged) > MAX_COLIS_PAR_TOURNEE:
        return False

    if poids_total_colis(merged) > vehicle_capacity:
        return False

    if not can_merge_by_preferred_group(zone_a, zone_b):
        return False

    gouvernorats = list(set(
        clean_region(c.get("gouvernorat"))
        for c in merged
        if c.get("gouvernorat")
    ))

    if len(gouvernorats) > MAX_GOUVERNORATS_PAR_TOURNEE:
        return False

    for i in range(len(gouvernorats)):
        for j in range(i + 1, len(gouvernorats)):
            distance = distance_between_regions(
                gouvernorats[i],
                gouvernorats[j],
            )

            if distance > MAX_GOV_DISTANCE_IN_TOURNEE_KM:
                return False

    return True


def merge_same_gouvernorat_zones(zones, vehicle_capacity):
    grouped = {}

    for zone in zones:
        if not zone:
            continue

        gouvernorats = list(set(
            clean_region(c.get("gouvernorat"))
            for c in zone
            if c.get("gouvernorat")
        ))

        # كان zone فيها أكثر من gouvernorat، نخليها كما هي
        if len(gouvernorats) != 1:
            key = f"mixed_{len(grouped)}"
        else:
            key = gouvernorats[0]

        grouped.setdefault(key, []).append(zone)

    result = []

    for _, group_zones in grouped.items():
        current = []

        for zone in group_zones:
            if not current:
                current = list(zone)
                continue

            if can_merge_zones(current, zone, vehicle_capacity):
                current.extend(zone)
            else:
                result.append(current)
                current = list(zone)

        if current:
            result.append(current)

    return result


def merge_preferred_governorate_groups(zones, vehicle_capacity):
    zones = [z for z in zones if z]
    changed = True

    while changed:
        changed = False
        result = []
        used = set()

        for i, zone in enumerate(zones):
            if i in used:
                continue

            govs_zone = list(set(
                clean_region(c.get("gouvernorat"))
                for c in zone
                if c.get("gouvernorat")
            ))

            if not govs_zone:
                result.append(zone)
                used.add(i)
                continue

            preferred_group = get_preferred_group_for_gov(govs_zone[0])
            best_j = None
            best_score = 999999

            center_zone = get_colis_center(zone)

            for j, other in enumerate(zones):
                if j == i or j in used:
                    continue

                govs_other = list(set(
                    clean_region(c.get("gouvernorat"))
                    for c in other
                    if c.get("gouvernorat")
                ))

                if not govs_other:
                    continue

                # نلمّ كان في نفس groupe préféré
                if not any(g in preferred_group for g in govs_other):
                    continue

                if not can_merge_zones(zone, other, vehicle_capacity):
                    continue

                center_other = get_colis_center(other)

                if not center_zone or not center_other:
                    continue

                distance = haversine_distance_km(
                    center_zone["latitude"],
                    center_zone["longitude"],
                    center_other["latitude"],
                    center_other["longitude"],
                )

                if distance < best_score:
                    best_score = distance
                    best_j = j

            if best_j is not None:
                merged = zone + zones[best_j]
                result.append(merged)
                used.add(i)
                used.add(best_j)
                changed = True
            else:
                result.append(zone)
                used.add(i)

        zones = result

    return zones

def get_preferred_group_key(gouvernorat):
    gouvernorat = clean_region(gouvernorat)

    for index, group in enumerate(PREFERRED_GOV_GROUPS):
        cleaned_group = [clean_region(g) for g in group]

        if gouvernorat in cleaned_group:
            return index

    return f"solo_{gouvernorat}"


def get_ordered_gouvernorats_for_group(group_key, gov_map):
    if isinstance(group_key, int):
        ordered = [
            clean_region(g)
            for g in PREFERRED_GOV_GROUPS[group_key]
        ]

        existing_ordered = [
            g for g in ordered
            if g in gov_map
        ]

        extras = sorted([
            g for g in gov_map.keys()
            if g not in existing_ordered
        ])

        return existing_ordered + extras

    return sorted(gov_map.keys())


def split_big_gouvernorat_if_needed(colis_gov, vehicle_capacity):
    colis_gov = sorted(
        colis_gov,
        key=lambda c: (
            c.get("latitude") or 0,
            c.get("longitude") or 0,
            c["id"],
        )
    )

    zones = []
    current_zone = []
    current_weight = 0

    for c in colis_gov:
        poids = float(c.get("poids") or 0)

        should_split = (
            current_zone
            and (
                len(current_zone) >= MAX_COLIS_PAR_TOURNEE
                or current_weight + poids > vehicle_capacity
            )
        )

        if should_split:
            zones.append(current_zone)
            current_zone = []
            current_weight = 0

        current_zone.append(c)
        current_weight += poids

    if current_zone:
        zones.append(current_zone)

    return zones

def creer_zones_par_adresses(colis, vehicle_capacity):
    colis_valides = [
        c for c in colis
        if c.get("latitude") is not None
        and c.get("longitude") is not None
        and float(c.get("poids") or 0) <= float(vehicle_capacity)
    ]

    if len(colis_valides) < MIN_COLIS_POUR_TOURNEE:
        print(
            f"STOP IA: seulement {len(colis_valides)} colis "
            f"(< {MIN_COLIS_POUR_TOURNEE})"
        )
        return []

    # 1. group by preferred group ثم gouvernorat
    groups = {}

    for c in colis_valides:
        gouvernorat = clean_region(c.get("gouvernorat"))

        group_key = get_preferred_group_key(gouvernorat)

        if group_key not in groups:
            groups[group_key] = {}

        if gouvernorat not in groups[group_key]:
            groups[group_key][gouvernorat] = []

        groups[group_key][gouvernorat].append(c)

    zones = []

    # 2. داخل كل preferred group، نبني tournées
    for group_key, gov_map in groups.items():
        ordered_govs = get_ordered_gouvernorats_for_group(
            group_key,
            gov_map,
        )

        units = []

        # كل gouvernorat يبقى وحدة واحدة، إلا إذا يفوت max/capacité
        for gov in ordered_govs:
            gov_units = split_big_gouvernorat_if_needed(
                gov_map[gov],
                vehicle_capacity,
            )

            units.extend(gov_units)

        current_zone = []

        for unit in units:
            if not current_zone:
                current_zone = list(unit)
                continue

            if can_merge_zones(current_zone, unit, vehicle_capacity):
                current_zone.extend(unit)
            else:
                if len(current_zone) >= MIN_COLIS_POUR_TOURNEE:
                    zones.append(current_zone)

                current_zone = list(unit)

        if current_zone and len(current_zone) >= MIN_COLIS_POUR_TOURNEE:
            zones.append(current_zone)

    zones = [
        z for z in zones
        if len(z) >= MIN_COLIS_POUR_TOURNEE
    ]

    zones.sort(
        key=lambda z: (
            -len(z),
            -poids_total_colis(z),
        )
    )

    return zones


def create_distance_matrix_from_gps(colis_zone, depot):
    points = [depot] + colis_zone
    matrix = []

    for i in range(len(points)):
        row = []

        for j in range(len(points)):
            if i == j:
                row.append(0)
            else:
                row.append(
                    haversine_distance_km(
                        points[i]["latitude"],
                        points[i]["longitude"],
                        points[j]["latitude"],
                        points[j]["longitude"],
                    )
                )

        matrix.append(row)

    return matrix


def optimize_cluster_with_ortools(colis_cluster, vehicle_capacity, depot):
    colis_cluster = [
        c for c in colis_cluster
        if c.get("latitude") is not None
        and c.get("longitude") is not None
    ]

    if len(colis_cluster) < MIN_COLIS_POUR_TOURNEE:
        return {
            "ids": [],
            "poids": 0,
            "distance": 0,
            "ordered_colis": [],
            "parcours_text": "Tournée refusée: moins de 30 colis",
        }

    colis_cluster.sort(
        key=lambda c: (
            0 if str(c.get("priorite", "")).lower() == "urgent" else 1,
            0 if str(c.get("sensibilite", "")).lower() == "fragile" else 1,
            c["id"],
        )
    )

    distance_matrix = create_distance_matrix_from_gps(colis_cluster, depot)

    demands = [0] + [
        max(1, int(round(float(c["poids"] or 0))))
        for c in colis_cluster
    ]

    manager = pywrapcp.RoutingIndexManager(
        len(distance_matrix),
        1,
        0,
    )

    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index, to_index):
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return distance_matrix[from_node][to_node]

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    def demand_callback(from_index):
        from_node = manager.IndexToNode(from_index)
        return demands[from_node]

    demand_callback_index = routing.RegisterUnaryTransitCallback(demand_callback)

    routing.AddDimensionWithVehicleCapacity(
        demand_callback_index,
        0,
        [int(vehicle_capacity)],
        True,
        "Capacity",
    )

    for node in range(1, len(colis_cluster) + 1):
        colis_item = colis_cluster[node - 1]

        priorite = str(colis_item.get("priorite", "")).lower()
        sensibilite = str(colis_item.get("sensibilite", "")).lower()

        if priorite == "urgent" and sensibilite == "fragile":
            penalty = 100000
        elif priorite == "urgent":
            penalty = 50000
        elif sensibilite == "fragile":
            penalty = 20000
        else:
            penalty = 1000

        routing.AddDisjunction([manager.NodeToIndex(node)], penalty)

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_parameters.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_parameters.time_limit.seconds = 2

    solution = routing.SolveWithParameters(search_parameters)

    if not solution:
        return {
            "ids": [],
            "poids": 0,
            "distance": 0,
            "ordered_colis": [],
            "parcours_text": "Aucune solution trouvée",
        }

    index = routing.Start(0)

    route_load = 0
    route_distance = 0
    ordered_colis = []
    ids = []
    parcours_parts = [depot["label"]]

    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)

        if node != 0:
            c = colis_cluster[node - 1]

            ordered_colis.append(c)
            ids.append(c["id"])
            route_load += float(c["poids"] or 0)

            parcours_parts.append(
                f"{c['adresse']} (1 colis, poids: {float(c['poids'] or 0)}kg)"
            )

        previous_index = index
        index = solution.Value(routing.NextVar(index))

        route_distance += routing.GetArcCostForVehicle(
            previous_index,
            index,
            0,
        )

    parcours_parts.append(depot["label"])

    if len(ordered_colis) < MIN_COLIS_POUR_TOURNEE:
        return {
            "ids": [],
            "poids": 0,
            "distance": 0,
            "ordered_colis": [],
            "parcours_text": "Tournée refusée après optimisation: moins de 30 colis",
        }

    return {
        "ids": ids,
        "poids": route_load,
        "distance": route_distance,
        "ordered_colis": ordered_colis,
        "parcours_text": " -> ".join(parcours_parts),
    }


def prepare_colis_data(db: Session):
    colis_rows = (
        db.query(Colis)
        .join(User, Colis.shipper_id == User.id)
        .filter(
            Colis.statut == "en_attente",
            User.role == "shipper",
            User.email != "admin@mz.com",
        )
        .order_by(Colis.id)
        .all()
    )

    colis = []

    for c in colis_rows:
        delegation = getattr(c, "delegation", None)
        gouvernorat = getattr(c, "gouvernorat", None)

        zone_label = (
            delegation
            or gouvernorat
            or getattr(c, "zone", None)
            or "Sans Région"
        )

        zone_label = clean_region(zone_label)
        gouvernorat_clean = clean_region(gouvernorat)
        delegation_clean = clean_region(delegation)

        latitude = c.latitude
        longitude = c.longitude

        if latitude is None or longitude is None:
            continue

            

        depot_depart = str(getattr(c, "depot_depart", None) or "").lower().strip()

        if depot_depart not in DEPOTS:
            depot_depart = "kairouan"

        colis.append({
            "id": c.id,
            "adresse": c.adresse_livraison,
            "poids": float(c.poids or 0),
            "zone": zone_label,
            "gouvernorat": gouvernorat_clean,
            "delegation": delegation_clean,
            "latitude": latitude,
            "longitude": longitude,
            "depot_depart": depot_depart,
            "priorite": getattr(c, "priorite_colis", None) or "normal",
            "sensibilite": getattr(c, "sensibilite_colis", None) or "standard",
        })

    return colis


def prepare_livreurs(db: Session):
    livreurs_rows = (
        db.query(User)
        .filter(
            User.role == "courier",
            User.is_active == True,
            User.is_approved == True,
        )
        .order_by(User.id)
        .all()
    )

    livreurs = []

    for l in livreurs_rows:
        livreurs.append({
            "id": l.id,
            "name": l.name,
            "assigned_region": clean_region(getattr(l, "assigned_region", None)),
            "assigned_depot": str(getattr(l, "assigned_depot", "") or "").lower().strip(),
        })

    return livreurs


def prepare_vehicles(db: Session):
    vehicles_rows = (
        db.query(Vehicle)
        .filter(Vehicle.status == "actif")
        .order_by(Vehicle.id)
        .all()
    )

    vehicles = []

    for v in vehicles_rows:
        max_capacity = float(v.max_length or 0)

        if max_capacity <= 0:
            continue

        vehicles.append({
            "id": v.id,
            "name": v.name,
            "matricule": v.matricule,
            "min_capacity": float(v.min_length or 0),
            "max_capacity": max_capacity,
        })

    return vehicles


def choose_livreur_for_region(
    livreurs,
    used_livreur_ids,
    region_name,
    depot_key,
    allow_autre_depot=False,
):
    region_name = clean_region(region_name)
    depot_key = str(depot_key or "").lower().strip()

    for l in livreurs:
        if l["id"] in used_livreur_ids:
            continue

        if (
            l.get("assigned_depot") == depot_key
            and clean_region(l["assigned_region"]) == region_name
        ):
            return l, "region_depot"

    livreurs_meme_depot = [
        l for l in livreurs
        if l["id"] not in used_livreur_ids
        and l.get("assigned_depot") == depot_key
    ]

    if livreurs_meme_depot:
        livreurs_meme_depot.sort(
            key=lambda l: distance_between_regions(
                clean_region(l["assigned_region"]),
                region_name,
            )
        )
        return livreurs_meme_depot[0], "meme_depot_hors_region"

    if not allow_autre_depot:
        return None, None

    available_livreurs = [
        l for l in livreurs
        if l["id"] not in used_livreur_ids
    ]

    if not available_livreurs:
        return None, None

    available_livreurs.sort(
        key=lambda l: distance_between_regions(
            clean_region(l["assigned_region"]),
            region_name,
        )
    )

    return available_livreurs[0], "autre_depot"


def build_tournee_map_points(ordered_colis, depot):
    points = [
        {
            "type": "depot",
            "label": depot["label"],
            "adresse": depot["adresse"],
            "latitude": depot["latitude"],
            "longitude": depot["longitude"],
            "ordre": 0,
        }
    ]

    ordre = 1

    for c in ordered_colis:
        points.append({
            "type": "colis",
            "colis_id": c["id"],
            "label": c["adresse"],
            "adresse": c["adresse"],
            "latitude": c["latitude"],
            "longitude": c["longitude"],
            "ordre": ordre,
        })
        ordre += 1

    points.append({
        "type": "depot",
        "label": depot["label"],
        "adresse": depot["adresse"],
        "latitude": depot["latitude"],
        "longitude": depot["longitude"],
        "ordre": ordre,
    })

    return points


def build_gouvernorat_label(gouvernorats):
    gouvernorats = sorted(set(clean_region(g) for g in gouvernorats if g))
    return " + ".join(gouvernorats)


def generate_tournees_ai(db: Session):
    colis = prepare_colis_data(db)
    livreurs = prepare_livreurs(db)
    vehicles = prepare_vehicles(db)

    if not colis or not livreurs or not vehicles:
        return []

    results = []
    assigned_colis_ids = set()
    used_livreur_ids = set()

    numero_tournee = 1
    vehicle_index = 0

    while True:
        colis_disponibles = [
            c for c in colis
            if c["id"] not in assigned_colis_ids
            and c.get("latitude") is not None
            and c.get("longitude") is not None
        ]

        if len(colis_disponibles) < MIN_COLIS_POUR_TOURNEE:
            print(
                f"STOP IA: {len(colis_disponibles)} colis restants "
                f"(< {MIN_COLIS_POUR_TOURNEE})"
            )
            break

        vehicle = vehicles[vehicle_index % len(vehicles)]
        vehicle_min_capacity = vehicle["min_capacity"]
        vehicle_capacity = vehicle["max_capacity"]

        zones = creer_zones_par_adresses(
            colis=colis_disponibles,
            vehicle_capacity=vehicle_capacity,
        )

        zones = [
            z for z in zones
            if len(z) >= MIN_COLIS_POUR_TOURNEE
        ]

        if not zones:
            print(f"STOP IA: aucune zone avec au moins {MIN_COLIS_POUR_TOURNEE} colis")
            break

        zones.sort(
            key=lambda z: (
                -len(z),
                -poids_total_colis(z),
            )
        )

        colis_zone = zones[0]
        depot_key, depot = choose_depot_intelligent(colis_zone)

        resultat = optimize_cluster_with_ortools(
            colis_zone,
            vehicle_capacity,
            depot,
        )

        ordered_colis = [
            c for c in resultat["ordered_colis"]
            if c["id"] not in assigned_colis_ids
        ]

        if len(ordered_colis) < MIN_COLIS_POUR_TOURNEE:
            print(
                f"TOURNEE REFUSÉE: {len(ordered_colis)} colis "
                f"(< {MIN_COLIS_POUR_TOURNEE})"
            )
            break

        poids_total = round(
            sum(float(c["poids"] or 0) for c in ordered_colis),
            1,
        )

        zones_dans_tournee = sorted(
            set(clean_region(c.get("zone")) for c in ordered_colis)
        )

        gouvernorats_dans_tournee = sorted(
            set(clean_region(c.get("gouvernorat")) for c in ordered_colis)
        )

        region_label = " + ".join(zones_dans_tournee)
        gouvernorat_label = build_gouvernorat_label(gouvernorats_dans_tournee)

        livreur_region = (
            gouvernorats_dans_tournee[0]
            if gouvernorats_dans_tournee
            else zones_dans_tournee[0]
        )

        livreur, affectation_type = choose_livreur_for_region(
            livreurs=livreurs,
            used_livreur_ids=used_livreur_ids,
            region_name=livreur_region,
            depot_key=depot_key,
            allow_autre_depot=True,
        )

        if livreur is None:
            print("Aucun livreur disponible pour cette zone")
            break

        used_livreur_ids.add(livreur["id"])

        distance_km = round(float(resultat["distance"] or 0), 1)

        map_points = build_tournee_map_points(
            ordered_colis=ordered_colis,
            depot=depot,
        )

        tournee = {
            "nom": f"Tournée IA GPS {numero_tournee} - {gouvernorat_label}",
            "region": region_label,
            "depot_depart": depot_key,
            "depot_label": depot["label"],
            "depot_adresse": depot["adresse"],
            "livreur_id": livreur["id"],
            "vehicle_id": vehicle["id"],
            "vehicle_min_capacity": vehicle_min_capacity,
            "vehicle_capacity": vehicle_capacity,
            "cluster_ia": numero_tournee,
            "nombre_colis": len(ordered_colis),
            "distance_km": distance_km,
            "poids_total": poids_total,
            "parcours_text": resultat.get("parcours_text", ""),
            "map_points": map_points,
            "colis": [],
        }

        ordre = 1

        for c in ordered_colis:
            tournee["colis"].append({
                "colis_id": c["id"],
                "ordre": ordre,
                "distance_depuis_precedent": 0,
                "latitude": c["latitude"],
                "longitude": c["longitude"],
                "adresse": c["adresse"],
            })

            assigned_colis_ids.add(c["id"])
            ordre += 1

        results.append(tournee)

        print(
            f"TOURNEE IA CREEE: {tournee['nom']} | "
            f"{len(ordered_colis)} colis | "
            f"{poids_total}kg | "
            f"depot={depot_key} | "
            f"livreur={livreur['name']}"
        )

        numero_tournee += 1
        vehicle_index += 1

    return results