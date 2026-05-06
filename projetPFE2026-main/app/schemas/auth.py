from typing import Literal, Optional

import re

from pydantic import BaseModel, EmailStr, Field, field_validator

GenderType = Literal["masculin", "feminin"]
OpenColisType = Literal["oui", "non"]


def validate_register_password(value: str) -> str:
    password = (value or "").strip()
    if not re.fullmatch(r"[A-Za-z]{6,}", password):
        raise ValueError("Le mot de passe doit contenir au moins 6 lettres")
    return password


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    phone: str
    phone2: Optional[str] = None
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=120)
    gender: Optional[GenderType] = None
    ouvrir_colis_par_defaut: OpenColisType = "non"

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        return validate_register_password(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class VerifyOTPRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(min_length=6, max_length=6)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=6, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    phone2: Optional[str] = None
    address: Optional[str] = Field(default=None, max_length=255)
    city: Optional[str] = Field(default=None, max_length=120)
    gender: Optional[GenderType] = None
    ouvrir_colis_par_defaut: Optional[OpenColisType] = None
