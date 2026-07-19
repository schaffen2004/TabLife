from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

from services.settings_service import load_settings, write_settings
from services.telegram_notification_settings import sync_telegram_notification_settings
from services.telegram_notifications import TIMEZONE

from .utils import payload_data

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    notification: bool | None = None
    deadline: bool | None = None
    routine: bool | None = None
    finance: bool | None = None
    deadline_day_time: str | None = None
    deadline_hour_time: str | None = None
    routine_time: str | None = None
    finance_time: str | None = None
    language: str | None = None
    chat_id: int | str | None = None
    token: str | None = None

@router.get("")
def get_settings():
    now = datetime.now(TIMEZONE)
    return {
        "setting": load_settings(),
        "current_time": now.isoformat(timespec="seconds"),
        "timezone": str(TIMEZONE),
    }


@router.patch("")
def update_settings(payload: SettingsUpdate):
    current = load_settings()
    data = payload_data(payload, exclude_unset=True)
    previous = current.copy()
    current.update(data)
    write_settings(current)
    sync_telegram_notification_settings(previous, data)

    return {"setting": current}
