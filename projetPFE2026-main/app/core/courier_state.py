from datetime import date

from sqlalchemy.orm import Session

from app.models.courier_leave_request import CourierLeaveRequest
from app.models.user import User


def is_contract_ended(courier: User, today: date | None = None) -> bool:
    today = today or date.today()
    return bool(courier.contract_end_date and courier.contract_end_date < today)


def has_active_approved_leave(db: Session, courier_id: int, today: date | None = None) -> bool:
    today = today or date.today()
    return (
        db.query(CourierLeaveRequest.id)
        .filter(
            CourierLeaveRequest.courier_id == courier_id,
            CourierLeaveRequest.status == "approved",
            CourierLeaveRequest.start_date <= today,
            CourierLeaveRequest.end_date >= today,
        )
        .first()
        is not None
    )


def get_manual_courier_status(courier: User) -> str:
    return courier.manual_courier_status or "active"


def sync_courier_state(db: Session, courier: User, today: date | None = None) -> bool:
    if courier.role != "courier":
        return False

    today = today or date.today()
    manual_status = get_manual_courier_status(courier)

    if is_contract_ended(courier, today=today) or manual_status == "contract_ended":
        effective_status = "contract_ended"
        should_be_active = False
    elif manual_status == "temporary_leave" or has_active_approved_leave(db, courier.id, today=today):
        effective_status = "temporary_leave"
        should_be_active = True
    else:
        effective_status = "active"
        should_be_active = True

    changed = False
    if courier.manual_courier_status != manual_status:
        courier.manual_courier_status = manual_status
        changed = True
    if courier.courier_status != effective_status:
        courier.courier_status = effective_status
        changed = True
    if courier.is_active != should_be_active:
        courier.is_active = should_be_active
        changed = True

    return changed


def set_manual_courier_state(courier: User, status: str = "active"):
    courier.manual_courier_status = status
