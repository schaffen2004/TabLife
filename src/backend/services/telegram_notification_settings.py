from __future__ import annotations

from typing import Any

from services.telegram_notifications import (
    suppress_finance_notification_if_due,
    suppress_routine_notification_if_due,
    suppress_today_tasks_notification_if_due,
)


def sync_telegram_notification_settings(
    previous_settings: dict[str, Any],
    changed_settings: dict[str, Any],
) -> None:
    previous_deadline_day_time = previous_settings.get("deadline_day_time")
    previous_routine_time = previous_settings.get("routine_time")
    previous_finance_time = previous_settings.get("finance_time")

    if (
        "deadline_day_time" in changed_settings
        and str(changed_settings["deadline_day_time"]) != str(previous_deadline_day_time)
    ):
        suppress_today_tasks_notification_if_due(changed_settings["deadline_day_time"])

    if (
        "routine_time" in changed_settings
        and str(changed_settings["routine_time"]) != str(previous_routine_time)
    ):
        suppress_routine_notification_if_due(changed_settings["routine_time"])

    if (
        "finance_time" in changed_settings
        and str(changed_settings["finance_time"]) != str(previous_finance_time)
    ):
        suppress_finance_notification_if_due(changed_settings["finance_time"])

