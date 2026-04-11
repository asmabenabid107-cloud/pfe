from pydantic import BaseModel, field_validator
from app.models.vehicle import VehicleStatus
from datetime import datetime

class VehicleCreate(BaseModel):
    matricule: str
    status: VehicleStatus = VehicleStatus.actif
    min_length: int = 20
    max_length: int = 40

    @field_validator("matricule")
    @classmethod
    def check_matricule(cls, v, info):
        min_l = info.data.get("min_length", 20)
        max_l = info.data.get("max_length", 40)
        if len(v) < min_l or len(v) > max_l:
            raise ValueError(f"Le matricule doit avoir entre {min_l} et {max_l} caractères")
        return v

class VehicleUpdate(BaseModel):
    matricule: str | None = None
    status: VehicleStatus | None = None
    min_length: int = 20
    max_length: int = 40

    @field_validator("matricule")
    @classmethod
    def check_matricule(cls, v, info):
        if v is not None:
            min_l = info.data.get("min_length", 20)
            max_l = info.data.get("max_length", 40)
            if len(v) < min_l or len(v) > max_l:
                raise ValueError(f"Le matricule doit avoir entre {min_l} et {max_l} caractères")
        return v

class VehicleOut(BaseModel):
    id: int
    matricule: str
    status: VehicleStatus
    min_length: int
    max_length: int
    created_at: datetime

    model_config = {"from_attributes": True}