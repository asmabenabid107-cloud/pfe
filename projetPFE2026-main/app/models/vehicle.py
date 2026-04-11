from sqlalchemy import Column, Integer, String, Enum as SAEnum, DateTime
from datetime import datetime
from app.db.base import Base
import enum

class VehicleStatus(str, enum.Enum):
    actif = "actif"
    inactif = "inactif"
    maintenance = "maintenance"

class Vehicle(Base):
    __tablename__ = "vehicles"

    id         = Column(Integer, primary_key=True, index=True, autoincrement=True)
    matricule  = Column(String(40), nullable=False, unique=True)
    status     = Column(SAEnum(VehicleStatus), nullable=False, default=VehicleStatus.actif)
    min_length = Column(Integer, nullable=False, default=20)
    max_length = Column(Integer, nullable=False, default=40)
    created_at = Column(DateTime, default=datetime.utcnow)