from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from app.db.session import get_db

from app.models.colis import Colis
from app.models.user import User

from app.models.tournee import (
    Tournee,
    TourneeColis
)

from app.services.tournee_ai_service import (
    DEPOTS,
    generate_tournees_ai
)

router = APIRouter(
    prefix="/admin/tournees",
    tags=["Admin Tournees"]
)


def serialize_tournee(t: Tournee):
    depot = DEPOTS.get(str(t.depot_depart or "").lower().strip()) or {}
    ordered_links = sorted(
        t.colis_items or [],
        key=lambda link: (link.ordre or 0, link.id or 0),
    )

    stops = []
    for link in ordered_links:
        colis = link.colis
        if not colis:
            continue

        stops.append({
            "ordre": link.ordre,
            "colis_id": colis.id,
            "numero_suivi": colis.numero_suivi,
            "adresse": colis.adresse_livraison,
            "latitude": colis.latitude,
            "longitude": colis.longitude,
            "poids": colis.poids,
            "nom_destinataire": colis.nom_destinataire,
            "telephone_destinataire": colis.telephone_destinataire,
            "distance_depuis_precedent": link.distance_depuis_precedent,
        })

    return {
        "id": t.id,
        "nom": t.nom,
        "region": t.region,
        "status": t.status,
        "cluster_ia": t.cluster_ia,
        "distance_km": t.distance_km,
        "poids_total": t.poids_total,
        "nombre_colis": t.nombre_colis,
        "parcours_text": t.parcours_text,
        "livreur_name": t.livreur.name if t.livreur else "-",
        "vehicle_name": t.vehicle.name if t.vehicle else "-",
        "vehicle_min_capacity": t.vehicle_min_capacity,
        "vehicle_capacity": t.vehicle_capacity,
        "depot_depart": t.depot_depart,
        "depot_label": t.depot_label,
        "depot_adresse": t.depot_adresse,
        "depot_latitude": depot.get("latitude"),
        "depot_longitude": depot.get("longitude"),
        "stops": stops,
    }


@router.post("/generate-ai")
@router.post("/generate-ai/")
def generate_ai_tournees(db: Session = Depends(get_db)):
    try:
        
        results = generate_tournees_ai(db)

        print("RESULTATS IA:", len(results))

        if not results:
            return {
                "message": "Aucune tournée générée",
                "count": 0
            }

        old_tournees = db.query(Tournee).filter(
            Tournee.status != "accepted"
        ).all()

        for old in old_tournees:
            db.delete(old)

        db.flush()

        
        for t in results:
            tournee = Tournee(
                nom=t["nom"],
                region=t["region"],
                status="proposed",
                generated_by="ia",
                distance_km=t["distance_km"],
                poids_total=t["poids_total"],
                livreur_id=t["livreur_id"],
                vehicle_id=t["vehicle_id"],
                cluster_ia=t.get("cluster_ia", 0),
                nombre_colis=t.get("nombre_colis", len(t["colis"])),
                parcours_text=t.get("parcours_text", ""),
                vehicle_min_capacity=t.get("vehicle_min_capacity", 0),
                vehicle_capacity=t.get("vehicle_capacity", 300),
                depot_depart=t.get("depot_depart"),
                depot_label=t.get("depot_label"),
                depot_adresse=t.get("depot_adresse"),
            )

            db.add(tournee)
            db.flush()

            for c in t["colis"]:
                db.add(TourneeColis(
                    tournee_id=tournee.id,
                    colis_id=c["colis_id"],
                    ordre=c["ordre"],
                    distance_depuis_precedent=c.get("distance_depuis_precedent", 0),
                ))

        db.commit()

        return {
            "message": "Tournées IA générées",
            "count": len(results)
        }

    except Exception as e:
        db.rollback()
        print("ERREUR GENERATION IA:", e)
        raise HTTPException(
            status_code=500,
            detail=f"Erreur génération IA: {str(e)}"
        )

@router.get("")
@router.get("/")
def get_tournees(db: Session = Depends(get_db)):

    tournees = db.query(Tournee).all()

    result = []

    for t in tournees:
        result.append(serialize_tournee(t))

    return result



@router.get("/restants")
@router.get("/restants/")
def get_restants_colis(db: Session = Depends(get_db)):
    colis_lies_ids = (
        db.query(TourneeColis.colis_id)
        .join(Tournee, Tournee.id == TourneeColis.tournee_id)
        .filter(Tournee.status != "refused")
        .subquery()
    )

    restants = (
        db.query(Colis)
        .join(User, Colis.shipper_id == User.id)
        .filter(
            Colis.statut == "en_attente",
            User.role == "shipper",
            User.email != "admin@mz.com",
            ~Colis.id.in_(colis_lies_ids),
        )
        .order_by(Colis.gouvernorat, Colis.delegation, Colis.id)
        .all()
    )

    grouped = {}

    for c in restants:
        region = c.gouvernorat or c.zone or "Sans Région"

        if region not in grouped:
            grouped[region] = {
                "region": region,
                "count": 0,
                "poids_total": 0,
                "colis": [],
            }

        grouped[region]["count"] += 1
        grouped[region]["poids_total"] += float(c.poids or 0)

        grouped[region]["colis"].append({
            "id": c.id,
            "numero_suivi": c.numero_suivi,
            "nom_destinataire": c.nom_destinataire,
            "telephone_destinataire": c.telephone_destinataire,
            "adresse_livraison": c.adresse_livraison,
            "gouvernorat": c.gouvernorat,
            "delegation": c.delegation,
            "rue": c.rue,
            "poids": c.poids,
        })

    result = []

    for item in grouped.values():
        item["poids_total"] = round(item["poids_total"], 1)
        result.append(item)

    return result

    
@router.post("/{tournee_id}/accept")
def accept_tournee(tournee_id: int, db: Session = Depends(get_db)):
    tournee = db.query(Tournee).filter(Tournee.id == tournee_id).first()

    if not tournee:
        raise HTTPException(status_code=404, detail="Tournée introuvable")

    now = datetime.utcnow()
    tournee.status = "accepted"

    for link in tournee.colis_items:
        if link.colis:
            link.colis.admin_note = "accepte"
            link.colis.admin_note_at = now
            link.colis.statut = "en_transit"

    db.commit()

    return {"message": "Tournée acceptée"}

@router.post("/{tournee_id}/refuse")
def refuse_tournee(tournee_id: int, db: Session = Depends(get_db)):
    tournee = db.query(Tournee).filter(Tournee.id == tournee_id).first()

    if not tournee:
        return {"message": "Tournée introuvable"}

    tournee.status = "refused"

    db.commit()

    return {"message": "Tournée refusée"}

@router.get("/accepted")
@router.get("/accepted/")
def get_accepted_tournees(db: Session = Depends(get_db)):
    tournees = db.query(Tournee).filter(Tournee.status == "accepted").all()

    result = []

    for t in tournees:
        result.append(serialize_tournee(t))

    return result
