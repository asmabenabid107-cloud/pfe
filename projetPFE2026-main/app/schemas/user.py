from datetime import date
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

CourierStatus = Literal["active", "contract_ended", "temporary_leave"]

class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    phone: Optional[str] = None
    phone2: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    ouvrir_colis_par_defaut: Optional[str] = None
    role: str
    is_approved: bool
    is_active: bool
    assigned_region: Optional[str] = None
    courier_status: Optional[CourierStatus] = None
    manual_courier_status: Optional[CourierStatus] = None
    contract_end_date: Optional[date] = None

    class Config:
        from_attributes = True


class CourierApproveRequest(BaseModel):
    assigned_region: str = Field(min_length=2, max_length=120)
    contract_end_date: date


class CourierAdminUpdateRequest(BaseModel):
    assigned_region: Optional[str] = Field(default=None, min_length=2, max_length=120)
    courier_status: Optional[CourierStatus] = None
    contract_end_date: Optional[date] = None
