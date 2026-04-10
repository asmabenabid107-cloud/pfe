from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.colis import Colis
from app.schemas.colis import ColisResponse

router = APIRouter(prefix="/admin/colis", tags=["admin-colis"])


def require_admin(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin requis")
    return current_user


@router.get("", response_model=list[ColisResponse])
def get_all_colis(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    return db.query(Colis).order_by(Colis.created_at.desc()).all()


@router.post("/{colis_id}/approve")
def approve_colis(colis_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    colis = db.query(Colis).filter(Colis.id == colis_id).first()
    if not colis:
        raise HTTPException(status_code=404, detail="Colis introuvable")
    colis.admin_note = "accepté"
    db.commit()
    return {"message": "Colis accepté", "id": colis_id}


@router.post("/{colis_id}/reject")
def reject_colis(colis_id: int, db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    colis = db.query(Colis).filter(Colis.id == colis_id).first()
    if not colis:
        raise HTTPException(status_code=404, detail="Colis introuvable")
    colis.statut = "annulé"
    colis.admin_note = "refusé"
    db.commit()
    return {"message": "Colis refusé", "id": colis_id}
