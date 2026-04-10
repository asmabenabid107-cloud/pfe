from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.db.session import get_db
from app.api.deps import get_current_user
from app.core.courier_state import sync_courier_state
from app.core.security import hash_password, verify_password, create_access_token
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    VerifyOTPRequest,
    ResetPasswordRequest,
    UpdateProfileRequest,
)
from app.core.email_service import send_password_reset_otp, verify_otp, otp_storage

import re

router = APIRouter()


def _clean_phone(phone: str) -> str:
    return (phone or "").replace(" ", "")


def _validate_tn_phone(clean_phone: str):
    if not re.match(r"^\+216\d{8}$", clean_phone):
        raise HTTPException(
            status_code=422,
            detail="Format téléphone invalide. Exemple: +21612345678"
        )


def _create_user(db: Session, payload: RegisterRequest, role: str) -> User:
    clean_phone = _clean_phone(payload.phone)
    _validate_tn_phone(clean_phone)

    # unicité email
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email déjà utilisé")

    # unicité phone
    if db.query(User).filter(User.phone == clean_phone).first():
        raise HTTPException(status_code=400, detail="Téléphone déjà utilisé")

    u = User(
        name=payload.full_name,
        email=payload.email,
        phone=clean_phone,
        password_hash=hash_password(payload.password),
        role=role,
        is_approved=False,
        is_active=True,
    )

    try:
        db.add(u)
        db.commit()
        db.refresh(u)
    except IntegrityError:
        db.rollback()
        # au cas où une contrainte unique déclenche malgré les checks
        raise HTTPException(status_code=400, detail="Email ou téléphone déjà utilisé")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")

    return u


# -----------------------
# ADMIN LOGIN
# POST /auth/login
# -----------------------
@router.post("/login", response_model=TokenResponse)
def admin_login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or user.role != "admin":
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


# -----------------------
# SHIPPER REGISTER
# POST /auth/shipper/register
# -----------------------
@router.post("/shipper/register")
def register_shipper(payload: RegisterRequest, db: Session = Depends(get_db)):
    _create_user(db, payload, role="shipper")
    return {"ok": True, "message": "Inscription reçue. En attente de confirmation admin."}


# -----------------------
# SHIPPER LOGIN
# POST /auth/shipper/login
# -----------------------
@router.post("/shipper/login", response_model=TokenResponse)
def login_shipper(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or user.role != "shipper":
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Compte en attente de confirmation admin")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


# -----------------------
# COURIER REGISTER
# POST /auth/courier/register
# -----------------------
@router.post("/courier/register")
def register_courier(payload: RegisterRequest, db: Session = Depends(get_db)):
    _create_user(db, payload, role="courier")
    return {"ok": True, "message": "I   nscription reçue. En attente de confirmation admin."}


# -----------------------
# COURIER LOGIN
# POST /auth/courier/login
# -----------------------
@router.post("/courier/login", response_model=TokenResponse)
def login_courier(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()

    if not user or user.role != "courier":
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    if not user.is_approved:
        raise HTTPException(status_code=403, detail="Compte en attente de confirmation admin")

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou mot de passe invalide")

    if sync_courier_state(db, user):
        db.commit()
        db.refresh(user)

    if user.courier_status == "temporary_leave":
        raise HTTPException(status_code=403, detail="Compte en conge temporaire")

    if user.courier_status == "contract_ended":
        raise HTTPException(status_code=403, detail="Contrat termine")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


# -----------------------
# FORGOT PASSWORD
# POST /auth/forgot-password
# -----------------------
@router.post("/forgot-password")
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": "Si cet email existe, un code a été envoyé"}

    send_password_reset_otp(user.email)
    return {"message": "Code envoyé à votre email"}


# -----------------------
# VERIFY OTP
# POST /auth/verify-otp
# -----------------------
@router.post("/verify-otp")
def verify_otp_code(payload: VerifyOTPRequest, db: Session = Depends(get_db)):
    if not verify_otp(payload.email, payload.otp_code):
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré")
    return {"message": "Code OTP vérifié avec succès"}


# -----------------------
# RESET PASSWORD
# POST /auth/reset-password
# -----------------------
@router.post("/reset-password")
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not verify_otp(payload.email, payload.otp_code):
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré")

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    user.password_hash = hash_password(payload.new_password)
    db.commit()

    if payload.email in otp_storage:
        del otp_storage[payload.email]

    return {"message": "Mot de passe réinitialisé avec succès"}


# -----------------------
# GET PROFIL
# GET /auth/me
# -----------------------
@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_approved": current_user.is_approved,
        "is_active": current_user.is_active,
        "assigned_region": current_user.assigned_region,
        "courier_status": current_user.courier_status,
        "manual_courier_status": current_user.manual_courier_status,
        "contract_end_date": current_user.contract_end_date.isoformat() if current_user.contract_end_date else None,
    }


# -----------------------
# UPDATE PROFIL
# PATCH /auth/me
# -----------------------
@router.patch("/me")
def update_me(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.full_name:
        current_user.name = payload.full_name.strip()

    if payload.email and payload.email != current_user.email:
        exists = db.query(User).filter(User.email == payload.email).first()
        if exists:
            raise HTTPException(status_code=400, detail="Email déjà utilisé")
        current_user.email = payload.email

    if payload.phone:
        clean_phone = _clean_phone(payload.phone)
        _validate_tn_phone(clean_phone)

        if clean_phone != current_user.phone:
            phone_exists = db.query(User).filter(User.phone == clean_phone).first()
            if phone_exists:
                raise HTTPException(status_code=400, detail="Téléphone déjà utilisé")

        current_user.phone = clean_phone

    db.commit()
    db.refresh(current_user)

    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "is_approved": current_user.is_approved,
        "is_active": current_user.is_active,
        "assigned_region": current_user.assigned_region,
        "courier_status": current_user.courier_status,
        "manual_courier_status": current_user.manual_courier_status,
        "contract_end_date": current_user.contract_end_date.isoformat() if current_user.contract_end_date else None,
    }
