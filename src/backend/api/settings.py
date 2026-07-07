from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

from services.telegram_notifications import (
    suppress_finance_notification_if_due,
    suppress_routine_notification_if_due,
    suppress_today_tasks_notification_if_due,
)

from .utils import payload_data

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_FILE = Path(__file__).resolve().parents[1] / "config" / "setting.yaml"
SETTINGS_ORDER = [
    "notification",
    "deadline",
    "routine",
    "finance",
    "deadline_day_time",
    "deadline_hour_time",
    "routine_time",
    "finance_time",
    "language",
    "chat_id",
    "token",
]


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


def _parse_scalar(value: str) -> Any:
    normalized = value.strip()
    lowered = normalized.lower()

    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if normalized.isdigit():
        return int(normalized)
    return normalized


def _load_settings() -> dict[str, Any]:
    settings: dict[str, Any] = {}
    in_setting_block = False

    for raw_line in SETTINGS_FILE.read_text(encoding="utf-8").splitlines():
        if not raw_line.strip() or raw_line.lstrip().startswith("#"):
            continue

        if raw_line.strip() == "setting:":
            in_setting_block = True
            continue

        if not in_setting_block or not raw_line.startswith((" ", "\t")):
            continue

        key, separator, value = raw_line.strip().partition(":")
        if separator:
            settings[key.strip()] = _parse_scalar(value)

    return settings


def _format_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "True" if value else "False"
    return str(value)


def _write_settings(settings: dict[str, Any]) -> None:
    keys = [key for key in SETTINGS_ORDER if key in settings]
    keys.extend(key for key in settings.keys() if key not in keys)

    content = ["setting:"]
    content.extend(f"  {key}: {_format_scalar(settings[key])}" for key in keys)
    SETTINGS_FILE.write_text("\n".join(content) + "\n", encoding="utf-8")


@router.get("")
def get_settings():
    return {"setting": _load_settings()}


@router.patch("")
def update_settings(payload: SettingsUpdate):
    current = _load_settings()
    data = payload_data(payload, exclude_unset=True)
    previous_deadline_day_time = current.get("deadline_day_time")
    previous_routine_time = current.get("routine_time")
    previous_finance_time = current.get("finance_time")
    current.update(data)
    _write_settings(current)

    if (
        "deadline_day_time" in data
        and str(data["deadline_day_time"]) != str(previous_deadline_day_time)
    ):
        suppress_today_tasks_notification_if_due(data["deadline_day_time"])
    if "routine_time" in data and str(data["routine_time"]) != str(previous_routine_time):
        suppress_routine_notification_if_due(data["routine_time"])
    if "finance_time" in data and str(data["finance_time"]) != str(previous_finance_time):
        suppress_finance_notification_if_due(data["finance_time"])

    return {"setting": current}
