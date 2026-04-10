# app/api/routes/colis.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.models.colis import Colis
from app.schemas.colis import ColisCreate, ColisUpdate, ColisResponse
from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/colis", tags=["colis"])


@router.get("", response_model=List[ColisResponse])
def get_all_colis(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Colis).filter(Colis.shipper_id == current_user.id).all()


@router.get("/{colis_id}", response_model=ColisResponse)
def get_colis(
    colis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    colis = db.query(Colis).filter(
        Colis.id == colis_id,
        Colis.shipper_id == current_user.id
    ).first()
    if not colis:
        raise HTTPException(status_code=404, detail="Colis non trouvé")
    return colis


@router.post("", response_model=ColisResponse, status_code=status.HTTP_201_CREATED)
def create_colis(
    colis_data: ColisCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.exc import IntegrityError
    from app.schemas.colis import generate_tracking_number

    numero = colis_data.numero_suivi or generate_tracking_number()

    for _ in range(5):
        exists = db.query(Colis).filter(Colis.numero_suivi == numero).first()
        if not exists:
            break
        numero = generate_tracking_number()
    else:
        raise HTTPException(status_code=500, detail="Impossible de générer un numéro de suivi unique")

    payload = colis_data.model_dump()
    payload["numero_suivi"] = numero

    colis = Colis(**payload, shipper_id=current_user.id)

    try:
        db.add(colis)
        db.commit()
        db.refresh(colis)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Numéro de suivi déjà utilisé")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

    return colis


@router.put("/{colis_id}", response_model=ColisResponse)
def update_colis(
    colis_id: int,
    colis_data: ColisUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    colis = db.query(Colis).filter(
        Colis.id == colis_id,
        Colis.shipper_id == current_user.id
    ).first()
    if not colis:
        raise HTTPException(status_code=404, detail="Colis non trouvé")

    update_data = colis_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(colis, key, value)

    db.commit()
    db.refresh(colis)
    return colis


@router.delete("/{colis_id}", status_code=status.HTTP_200_OK)
def delete_colis(
    colis_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    colis = db.query(Colis).filter(
        Colis.id == colis_id,
        Colis.shipper_id == current_user.id
    ).first()
    if not colis:
        raise HTTPException(status_code=404, detail="Colis non trouvé")

    db.delete(colis)
    db.commit()
    return {"message": "Deleted"}
