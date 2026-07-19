from __future__ import annotations

from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.settings_service import load_settings, write_settings
from services.telegram_notification_settings import sync_telegram_notification_settings
from services.telegram_notifications import get_timezone

from .utils import payload_data

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsUpdate(BaseModel):
    notification: bool | None = None
    today_task: bool | None = None
    daily_routine_report: bool | None = None
    finance_alert: bool | None = None
    schedule_for_tomorrow: bool | None = None
    today_task_time: str | None = None
    daily_routine_report_time: str | None = None
    finance_report_time: str | None = None
    schedule_for_tomorrow_time: str | None = None
    timezone: str | None = None
    language: str | None = None
    chat_id: int | str | None = None
    token: str | None = None


@router.get("")
def get_settings():
    timezone = get_timezone()
    now = datetime.now(timezone)
    settings = load_settings()
    settings["current_time"] = now.isoformat(timespec="seconds")
    settings["timezone"] = str(timezone)
    return settings


@router.patch("")
def update_settings(payload: SettingsUpdate):
    current = load_settings()
    data = payload_data(payload, exclude_unset=True)
    if "timezone" in data:
        try:
            data["timezone"] = str(data["timezone"]).strip()
            ZoneInfo(data["timezone"])
        except ZoneInfoNotFoundError as exc:
            raise HTTPException(status_code=400, detail="Invalid timezone") from exc
    previous = current.copy()
    current.update(data)
    write_settings(current)
    sync_telegram_notification_settings(previous, data)

    return current
