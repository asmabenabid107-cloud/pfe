from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.vehicle import Vehicle
from app.schemas.vehicle import VehicleCreate, VehicleUpdate, VehicleOut
from typing import List

router = APIRouter(prefix="/admin/vehicles", tags=["admin-vehicles"])

@router.get("/", response_model=List[VehicleOut])
def list_vehicles(db: Session = Depends(get_db)):
    return db.query(Vehicle).order_by(Vehicle.id).all()

@router.post("/", response_model=VehicleOut)
def create_vehicle(data: VehicleCreate, db: Session = Depends(get_db)):
    existing = db.query(Vehicle).filter(Vehicle.matricule == data.matricule).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ce matricule existe déjà")
    v = Vehicle(
        matricule=data.matricule,
        status=data.status,
        min_length=data.min_length,
        max_length=data.max_length,
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v

@router.put("/{vehicle_id}", response_model=VehicleOut)
def update_vehicle(vehicle_id: int, data: VehicleUpdate, db: Session = Depends(get_db)):
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")
    if data.matricule is not None:
        v.matricule = data.matricule
    if data.status is not None:
        v.status = data.status
    if data.min_length is not None:
        v.min_length = data.min_length
    if data.max_length is not None:
        v.max_length = data.max_length
    db.commit()
    db.refresh(v)
    return v
    
@router.delete("/{vehicle_id}")
def delete_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    v = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Véhicule introuvable")
    db.delete(v)
    db.commit()
    return {"detail": "Véhicule supprimé"}