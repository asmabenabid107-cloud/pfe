from fastapi import APIRouter, Depends

from app.api.deps import require_admin
from app.core.config import settings
from app.models.user import User

router = APIRouter(prefix="/admin/settings", tags=["admin-settings"])


@router.get("/google-maps")
def get_google_maps_settings(_admin: User = Depends(require_admin)):
    return {"api_key": settings.GOOGLE_MAPS_API_KEY or ""}
