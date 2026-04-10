from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from app.api.routes.admin_courier_leaves import router as admin_courier_leaves_router
from app.api.routes.admin_couriers import router as admin_couriers_router
from app.api.routes.courier_leaves import router as courier_leaves_router
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.config import settings
from app.core.security import hash_password

from app.models.user import User
from app.models.colis import Colis
from app.models.courier_leave_request import CourierLeaveRequest

from app.api.routes.auth import router as auth_router
from app.api.routes.admin_shippers import router as admin_shippers_router
from app.api.routes.admin_stats import router as admin_stats_router
from app.api.routes.admin_colis import router as admin_colis_router
from app.api.routes.colis import router as colis_router

app = FastAPI(title="MZ Logistic API")


def ensure_user_courier_columns():
    inspector = inspect(engine)
    existing_columns = {column["name"] for column in inspector.get_columns("users")}

    statements = []
    if "assigned_region" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN assigned_region VARCHAR(120)")
    if "courier_status" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN courier_status VARCHAR(30)")
    if "manual_courier_status" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN manual_courier_status VARCHAR(30)")
    if "contract_end_date" not in existing_columns:
        statements.append("ALTER TABLE users ADD COLUMN contract_end_date DATE")

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
        connection.execute(
            text(
                "UPDATE users "
                "SET manual_courier_status = COALESCE(courier_status, 'active') "
                "WHERE role = 'courier' AND manual_courier_status IS NULL"
            )
        )
        connection.execute(
            text(
                "UPDATE users "
                "SET courier_status = 'active' "
                "WHERE role = 'courier' AND is_approved = true AND courier_status IS NULL"
            )
        )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_user_courier_columns()

    if settings.SEED_ADMIN_ENABLED:
        db = SessionLocal()
        try:
            exists = db.query(User).filter(User.email == settings.SEED_ADMIN_EMAIL).first()
            if not exists:
                admin = User(
                    name=settings.SEED_ADMIN_NAME,
                    email=settings.SEED_ADMIN_EMAIL,
                    phone=None,
                    password_hash=hash_password(settings.SEED_ADMIN_PASSWORD),
                    role="admin",
                    is_approved=True,
                    is_active=True,
                )
                db.add(admin)
                db.commit()
        finally:
            db.close()


app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(admin_shippers_router, prefix="/admin/shippers", tags=["admin-shippers"])
app.include_router(admin_stats_router, prefix="/admin/stats", tags=["admin-stats"])
app.include_router(admin_colis_router, tags=["admin-colis"])
app.include_router(admin_courier_leaves_router, tags=["admin-courier-leaves"])

app.include_router(colis_router)
app.include_router(courier_leaves_router, tags=["courier-leaves"])
app.include_router(admin_couriers_router, prefix="/admin/couriers", tags=["admin-couriers"])


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/")
def root():
    return {"message": "MZ Logistic API. Go to /docs"}
