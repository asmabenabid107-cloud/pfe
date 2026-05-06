from datetime import datetime, timedelta

from app.models.colis_event import ColisEvent


STATUS_EVENT_META = {
    "en_attente": ("pending", "Statut actuel: En attente", "Dernier etat connu du colis."),
    "a_relivrer": ("rescheduled", "Statut actuel: A relivrer", "Le colis est au depot pour une nouvelle tentative."),
    "annule": ("cancelled", "Statut actuel: Annule", "Le colis a ete annule."),
    "retour": ("returned", "Statut actuel: Retour", "Le colis est en retour."),
}


def normalize_status_key(value: str | None) -> str:
    raw = str(value or "").strip().lower()
    if "attente" in raw:
        return "en_attente"
    if "relivr" in raw or "report" in raw:
        return "a_relivrer"
    if "transit" in raw:
        return "en_transit"
    if "livr" in raw:
        return "livre"
    if "annul" in raw:
        return "annule"
    if "retour" in raw:
        return "retour"
    return raw


def add_colis_event(
    db,
    colis,
    *,
    kind: str,
    title: str,
    note: str | None = None,
    event_at: datetime | None = None,
    is_notification: bool = False,
    expires_at: datetime | None = None,
    read_at: datetime | None = None,
):
    event = ColisEvent(
        colis=colis,
        kind=kind,
        title=title,
        note=note,
        event_at=event_at or datetime.utcnow(),
        is_notification=is_notification,
        expires_at=expires_at,
        read_at=read_at,
    )
    db.add(event)
    return event


def add_created_event(db, colis, event_at: datetime | None = None):
    return add_colis_event(
        db,
        colis,
        kind="created",
        title="Colis ajoute au systeme",
        note="Bordereau enregistre par l expediteur.",
        event_at=event_at,
    )


def add_admin_decision_event(db, colis, *, approved: bool, event_at: datetime | None = None):
    happened_at = event_at or datetime.utcnow()
    return add_colis_event(
        db,
        colis,
        kind="approved" if approved else "rejected",
        title="Validation admin" if approved else "Refus admin",
        note="Le colis a ete accepte." if approved else "Le colis a ete refuse.",
        event_at=happened_at,
        is_notification=True,
        expires_at=happened_at + timedelta(hours=48),
    )


def add_status_event(db, colis, status: str | None, *, event_at: datetime | None = None, note: str | None = None):
    normalized = normalize_status_key(status)
    meta = STATUS_EVENT_META.get(normalized)
    if not meta:
        return None

    kind, title, default_note = meta
    return add_colis_event(
        db,
        colis,
        kind=kind,
        title=title,
        note=note or default_note,
        event_at=event_at,
    )


def add_pickup_event(db, colis, *, courier_name: str | None = None, event_at: datetime | None = None):
    courier_suffix = f" par {courier_name}" if courier_name else ""
    return add_colis_event(
        db,
        colis,
        kind="pickup",
        title="Colis recupere chez l expediteur",
        note=f"Le colis a ete pris en charge{courier_suffix}.",
        event_at=event_at,
    )


def add_warehouse_received_event(db, colis, *, courier_name: str | None = None, event_at: datetime | None = None):
    courier_suffix = f" par {courier_name}" if courier_name else ""
    return add_colis_event(
        db,
        colis,
        kind="warehouse_in",
        title="Colis depose au depot",
        note=f"Le colis est arrive au depot{courier_suffix}.",
        event_at=event_at,
    )


def add_out_for_delivery_event(db, colis, *, courier_name: str | None = None, event_at: datetime | None = None):
    courier_suffix = f" par {courier_name}" if courier_name else ""
    return add_colis_event(
        db,
        colis,
        kind="warehouse_out",
        title="Colis sorti du depot",
        note=f"Le colis a quitte le depot pour la livraison{courier_suffix}.",
        event_at=event_at,
    )


def add_delivery_event(db, colis, *, courier_name: str | None = None, event_at: datetime | None = None):
    courier_suffix = f" par {courier_name}" if courier_name else ""
    return add_colis_event(
        db,
        colis,
        kind="delivered",
        title="Colis arrive a destination",
        note=f"La livraison a ete confirmee{courier_suffix}.",
        event_at=event_at,
    )


def add_delivery_issue_event(
    db,
    colis,
    *,
    reason: str,
    courier_name: str | None = None,
    day_number: int,
    max_days: int,
    event_at: datetime | None = None,
):
    courier_suffix = f" par {courier_name}" if courier_name else ""
    note = (
        f"La livraison est reportee{courier_suffix}. "
        f"Le colis revient au depot pour demain. Motif renseigne: {reason}. "
        f"Tentative {day_number}/{max_days}."
    )
    return add_colis_event(
        db,
        colis,
        kind="delivery_issue",
        title="Livraison reportee",
        note=note,
        event_at=event_at,
        is_notification=True,
        expires_at=(event_at or datetime.utcnow()) + timedelta(hours=72),
    )


def add_return_pending_event(
    db,
    colis,
    *,
    courier_name: str | None = None,
    reason: str | None = None,
    automatic: bool = False,
    event_at: datetime | None = None,
):
    happened_at = event_at or datetime.utcnow()
    courier_suffix = f" par {courier_name}" if courier_name else ""
    clean_reason = (reason or "").strip()
    if clean_reason:
        note = (
            f"Le colis a ete depose au depot{courier_suffix} pour retour expediteur. "
            f"Motif: {clean_reason}."
        )
    elif automatic:
        note = (
            "Le colis a atteint 3 tentatives reportees et attend maintenant "
            "le retour expediteur."
        )
    else:
        note = f"Le colis a ete depose au depot{courier_suffix} pour retour expediteur."
    return add_colis_event(
        db,
        colis,
        kind="return_pending",
        title="Retour expediteur a confirmer",
        note=note,
        event_at=happened_at,
        is_notification=True,
        expires_at=happened_at + timedelta(hours=72),
    )


def add_return_to_shipper_event(
    db,
    colis,
    *,
    courier_name: str | None = None,
    event_at: datetime | None = None,
):
    happened_at = event_at or datetime.utcnow()
    courier_suffix = f" par {courier_name}" if courier_name else ""
    return add_colis_event(
        db,
        colis,
        kind="returned",
        title="Colis retourne a l expediteur",
        note=f"Le colis a ete remis a l expediteur{courier_suffix}.",
        event_at=happened_at,
        is_notification=True,
        expires_at=happened_at + timedelta(hours=72),
    )
