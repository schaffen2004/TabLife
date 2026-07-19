from __future__ import annotations

from typing import Any

from services.telegram_notifications import (
    suppress_finance_notification_if_due,
    suppress_routine_notification_if_due,
    suppress_tomorrow_tasks_notification_if_due,
    suppress_today_tasks_notification_if_due,
)


def sync_telegram_notification_settings(
    previous_settings: dict[str, Any],
    changed_settings: dict[str, Any],
) -> None:
    previous_today_task_time = previous_settings.get("today_task_time")
    previous_schedule_for_tomorrow_time = previous_settings.get("schedule_for_tomorrow_time")
    previous_daily_routine_report_time = previous_settings.get("daily_routine_report_time")
    previous_finance_alert_time = previous_settings.get("finance_alert_time")

    if (
        "today_task_time" in changed_settings
        and str(changed_settings["today_task_time"]) != str(previous_today_task_time)
    ):
        suppress_today_tasks_notification_if_due(changed_settings["today_task_time"])

    if (
        "schedule_for_tomorrow_time" in changed_settings
        and str(changed_settings["schedule_for_tomorrow_time"])
        != str(previous_schedule_for_tomorrow_time)
    ):
        suppress_tomorrow_tasks_notification_if_due(changed_settings["schedule_for_tomorrow_time"])

    if (
        "daily_routine_report_time" in changed_settings
        and str(changed_settings["daily_routine_report_time"])
        != str(previous_daily_routine_report_time)
    ):
        suppress_routine_notification_if_due(changed_settings["daily_routine_report_time"])

    if (
        "finance_alert_time" in changed_settings
        and str(changed_settings["finance_alert_time"]) != str(previous_finance_alert_time)
    ):
        suppress_finance_notification_if_due(changed_settings["finance_alert_time"])
