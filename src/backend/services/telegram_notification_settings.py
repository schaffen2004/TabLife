from __future__ import annotations

from typing import Any

def sync_telegram_notification_settings(
    previous_settings: dict[str, Any],
    changed_settings: dict[str, Any],
) -> None:
    del previous_settings, changed_settings
    return None
