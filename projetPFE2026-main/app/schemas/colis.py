import random
import string
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


def generate_tracking_number():
    return "MZ-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=10))


class ColisBase(BaseModel):
    adresse_livraison: str
    nom_destinataire: str
    telephone_destinataire: str
    email_destinataire: Optional[str] = None
    poids: float
    statut: Optional[str] = "en_attente"
    prix: float
    prix_free: Optional[float] = None
    produits: Optional[list[Any]] = None


class ColisCreate(ColisBase):
    numero_suivi: Optional[str] = None


class ColisUpdate(BaseModel):
    adresse_livraison: Optional[str] = None
    nom_destinataire: Optional[str] = None
    telephone_destinataire: Optional[str] = None
    email_destinataire: Optional[str] = None
    poids: Optional[float] = None
    statut: Optional[str] = None
    prix: Optional[float] = None
    prix_free: Optional[float] = None
    produits: Optional[list[Any]] = None


class ColisResponse(ColisBase):
    id: int
    numero_suivi: str
    shipper_id: int
    admin_note: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
