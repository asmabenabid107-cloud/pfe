from datetime import datetime

from sqlalchemy import JSON, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.base import Base


class Colis(Base):
    __tablename__ = "colis"

    id = Column(Integer, primary_key=True, index=True)
    numero_suivi = Column(String, unique=True, nullable=False)
    adresse_livraison = Column(String, nullable=False)
    nom_destinataire = Column(String, nullable=False)
    telephone_destinataire = Column(String, nullable=False)
    email_destinataire = Column(String, nullable=True)
    poids = Column(Float, nullable=False)
    statut = Column(String, default="en_attente")
    prix = Column(Float, nullable=False)
    prix_free = Column(Float, nullable=True)
    produits = Column(JSON, nullable=True)
    admin_note = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    shipper_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    shipper = relationship("User", back_populates="colis")
