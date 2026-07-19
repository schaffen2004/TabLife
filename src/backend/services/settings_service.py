from __future__ import annotations

from pathlib import Path
from typing import Any


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


def parse_scalar(value: str) -> Any:
    normalized = value.strip()
    lowered = normalized.lower()

    if lowered == "true":
        return True
    if lowered == "false":
        return False
    if normalized.isdigit():
        return int(normalized)
    return normalized.strip('"').strip("'")


def load_settings() -> dict[str, Any]:
    settings: dict[str, Any] = {}
    in_setting_block = False

    if not SETTINGS_FILE.exists():
        return settings

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
            settings[key.strip()] = parse_scalar(value)

    return settings


def format_scalar(value: Any) -> str:
    if isinstance(value, bool):
        return "True" if value else "False"
    return str(value)


def write_settings(settings: dict[str, Any]) -> None:
    keys = [key for key in SETTINGS_ORDER if key in settings]
    keys.extend(key for key in settings.keys() if key not in keys)

    content = ["setting:"]
    content.extend(f"  {key}: {format_scalar(settings[key])}" for key in keys)
    SETTINGS_FILE.write_text("\n".join(content) + "\n", encoding="utf-8")

