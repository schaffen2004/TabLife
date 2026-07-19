from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from services.settings_service import load_settings


BACKEND_DIR = Path(__file__).resolve().parents[1]
STATE_FILE = BACKEND_DIR / "config" / "telegram_notification_state.json"
DEFAULT_TIMEZONE = os.environ.get("TABLIFE_TIMEZONE", "Asia/Ho_Chi_Minh")
DEFAULT_DEADLINE_DAY_TIME = time(9, 0)
DEFAULT_ROUTINE_TIME = time(23, 0)
DEFAULT_FINANCE_TIME = time(20, 0)

logger = logging.getLogger(__name__)


@dataclass
class TelegramSettings:
    notification: bool = False
    today_task: bool = False
    daily_routine_report: bool = False
    finance_alert: bool = False
    schedule_for_tomorrow: bool = False
    today_task_time: time = DEFAULT_DEADLINE_DAY_TIME
    daily_routine_report_time: time = DEFAULT_ROUTINE_TIME
    finance_report_time: time = DEFAULT_FINANCE_TIME
    schedule_for_tomorrow_time: time = DEFAULT_ROUTINE_TIME
    timezone: ZoneInfo = ZoneInfo(DEFAULT_TIMEZONE)
    chat_id: str = ""
    token: str = ""


def get_timezone(settings: dict[str, Any] | None = None) -> ZoneInfo:
    raw_settings = settings or load_settings()
    timezone_name = str(raw_settings.get("timezone") or DEFAULT_TIMEZONE).strip()
    try:
        return ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError:
        return ZoneInfo(DEFAULT_TIMEZONE)

def _parse_time(value: Any, fallback: time) -> time:
    if isinstance(value, time):
        return value
    if value is None:
        return fallback

    try:
        parsed = datetime.strptime(str(value).strip(), "%H:%M")
    except ValueError:
        return fallback

    return time(parsed.hour, parsed.minute)


def load_telegram_settings() -> TelegramSettings:
    raw = load_settings()

    return TelegramSettings(
        notification=bool(raw.get("notification", False)),
        today_task=bool(raw.get("today_task", False)),
        daily_routine_report=bool(raw.get("daily_routine_report", False)),
        finance_alert=bool(raw.get("finance_alert", False)),
        schedule_for_tomorrow=bool(raw.get("schedule_for_tomorrow", False)),
        today_task_time=_parse_time(raw.get("today_task_time"), DEFAULT_DEADLINE_DAY_TIME),
        daily_routine_report_time=_parse_time(
            raw.get("daily_routine_report_time"),
            DEFAULT_ROUTINE_TIME,
        ),
        finance_report_time=_parse_time(raw.get("finance_report_time"), DEFAULT_FINANCE_TIME),
        schedule_for_tomorrow_time=_parse_time(
            raw.get("schedule_for_tomorrow_time"),
            DEFAULT_ROUTINE_TIME,
        ),
        timezone=get_timezone(raw),
        chat_id=str(os.environ.get("TELEGRAM_CHAT_ID") or raw.get("chat_id", "")),
        token=str(os.environ.get("TELEGRAM_BOT_TOKEN") or raw.get("token", "")),
    )


def _load_state() -> dict[str, str]:
    if not STATE_FILE.exists():
        return {}

    try:
        data = json.loads(STATE_FILE.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return {}

    return data if isinstance(data, dict) else {}


def _save_state(state: dict[str, str]) -> None:
    STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _today_reminder_time(now: datetime, notify_time: time) -> datetime:
    return datetime.combine(now.date(), notify_time, tzinfo=now.tzinfo or get_timezone())


def _today_tasks_state_key(target_date: date, notify_time: time) -> str:
    return f"task-today:{target_date.isoformat()}:{notify_time.strftime('%H:%M')}"


def _routine_state_key(target_date: date, notify_time: time) -> str:
    return f"routine-daily:{target_date.isoformat()}:{notify_time.strftime('%H:%M')}"


def _tomorrow_tasks_state_key(target_date: date, notify_time: time) -> str:
    return f"deadline-tomorrow:{target_date.isoformat()}:{notify_time.strftime('%H:%M')}"


def _mark_suppressed_if_due(state_key: str, notify_time: time) -> None:
    now = datetime.now(get_timezone())
    if now < _today_reminder_time(now, notify_time):
        return

    state = _load_state()
    state.setdefault(state_key, f"suppressed-after-settings-save:{now.isoformat(timespec='seconds')}")
    _save_state(state)


def suppress_today_tasks_notification_if_due(notify_time_value: Any) -> None:
    notify_time = _parse_time(notify_time_value, DEFAULT_DEADLINE_DAY_TIME)
    now = datetime.now(get_timezone())
    _mark_suppressed_if_due(_today_tasks_state_key(now.date(), notify_time), notify_time)


def suppress_routine_notification_if_due(notify_time_value: Any) -> None:
    notify_time = _parse_time(notify_time_value, DEFAULT_ROUTINE_TIME)
    now = datetime.now(get_timezone())
    _mark_suppressed_if_due(_routine_state_key(now.date(), notify_time), notify_time)


def suppress_tomorrow_tasks_notification_if_due(notify_time_value: Any) -> None:
    notify_time = _parse_time(notify_time_value, DEFAULT_ROUTINE_TIME)
    now = datetime.now(get_timezone())
    _mark_suppressed_if_due(
        _tomorrow_tasks_state_key(now.date() + timedelta(days=1), notify_time),
        notify_time,
    )


def suppress_finance_notification_if_due(notify_time_value: Any) -> None:
    notify_time = _parse_time(notify_time_value, DEFAULT_FINANCE_TIME)
    now = datetime.now(get_timezone())
    _mark_suppressed_if_due(_finance_state_key_for_date(now.date(), notify_time), notify_time)


def _get_today_unfinished_tasks(target_date: date) -> list[dict[str, Any]]:
    from db.connection import get_conn

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT task_id, goal, priority, start_at, deadline
                FROM tasks
                WHERE start_at <= %s
                  AND deadline >= %s
                  AND status NOT IN ('done', 'cancel')
                ORDER BY
                    CASE priority
                        WHEN 'high' THEN 1
                        WHEN 'medium' THEN 2
                        ELSE 3
                    END,
                    deadline,
                    task_id
                """,
                (target_date, target_date),
            )
            return list(cur.fetchall())


def _get_tomorrow_tasks(target_date: date) -> list[dict[str, Any]]:
    from db.connection import get_conn

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT task_id, goal, priority, start_at, deadline
                FROM tasks
                WHERE deadline = %s
                  AND status NOT IN ('done', 'cancel')
                ORDER BY
                    CASE priority
                        WHEN 'high' THEN 1
                        WHEN 'medium' THEN 2
                        ELSE 3
                    END,
                    start_at,
                    task_id
                """,
                (target_date,),
            )
            return list(cur.fetchall())


def _get_incomplete_routines(target_date: date) -> list[dict[str, Any]]:
    from db.connection import get_conn

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT r.routine_id, r.name
                FROM routines r
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM routine_checkins c
                    WHERE c.routine_id = r.routine_id
                      AND c.completed_on = %s
                )
                ORDER BY r.name
                """,
                (target_date,),
            )
            return list(cur.fetchall())


def _finance_state_key_for_date(target_date: date, notify_time: time) -> str:
    return f"finance-daily:{target_date.isoformat()}:{notify_time.strftime('%H:%M')}"


def _get_daily_finance(target_date: date) -> dict[str, int]:
    from db.connection import get_conn

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM income
                WHERE income_date = %s
                """,
                (target_date,),
            )
            total_income = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM expense
                WHERE expense_date = %s
                """,
                (target_date,),
            )
            total_expense = int(cur.fetchone()["total"])

    return {"total_income": total_income, "total_expense": total_expense}


def _format_money(amount: int) -> str:
    return f"{amount:,.0f} đ".replace(",", ".")


def _format_date_value(value: Any) -> str:
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _log_due_notification(
    notification_type: str,
    target_date: date,
    notify_time: time,
    message: str,
    item_count: int | None = None,
) -> None:
    suffix = f", item_count={item_count}" if item_count is not None else ""
    logger.info(
        "Notification due: type=%s, target_date=%s, notify_time=%s%s\n%s",
        notification_type,
        target_date.isoformat(),
        notify_time.strftime("%H:%M"),
        suffix,
        message,
    )


def _build_today_tasks_message(tasks: list[dict[str, Any]], target_date: date) -> str:
    lines = [
        "🧭 Today task",
        f"Date: {target_date.isoformat()}",
        f"Open tasks: {len(tasks)}",
        "",
    ]

    for index, task in enumerate(tasks[:10], start=1):
        lines.append(f"{index}. {task['goal']}")
        lines.append(f"   Priority: {task['priority']}")
        lines.append(f"   Start: {_format_date_value(task['start_at'])}")
        lines.append(f"   Deadline: {_format_date_value(task['deadline'])}")

    if not tasks:
        lines.append("No open tasks for today.")

    if len(tasks) > 10:
        lines.append(f"More tasks: {len(tasks) - 10}")

    return "\n".join(lines)


def _build_routine_message(routines: list[dict[str, Any]], target_date: date) -> str:
    lines = [
        "🔁 Daily routine report",
        f"Date: {target_date.isoformat()}",
        f"Incomplete routines: {len(routines)}",
        "",
    ]

    for index, routine in enumerate(routines[:15], start=1):
        lines.append(f"{index}. {routine['name']}")

    if not routines:
        lines.append("All routines are completed.")

    if len(routines) > 15:
        lines.append(f"More routines: {len(routines) - 15}")

    return "\n".join(lines)


def _build_tomorrow_tasks_message(tasks: list[dict[str, Any]], target_date: date) -> str:
    lines = [
        "📅 Schedule for tomorrow",
        f"Date: {target_date.isoformat()}",
        f"Planned tasks: {len(tasks)}",
        "",
    ]

    for index, task in enumerate(tasks[:10], start=1):
        lines.append(f"{index}. {task['goal']}")
        lines.append(f"   Priority: {task['priority']}")
        lines.append(f"   Start: {_format_date_value(task['start_at'])}")
        lines.append(f"   Deadline: {_format_date_value(task['deadline'])}")

    if not tasks:
        lines.append("No planned tasks for tomorrow.")

    if len(tasks) > 10:
        lines.append(f"More tasks: {len(tasks) - 10}")

    return "\n".join(lines)


def _build_finance_message(target_date: date, total_income: int, total_expense: int) -> str:
    remaining = total_income - total_expense
    return "\n".join(
        [
            "💰 Finance alert",
            f"Date: {target_date.isoformat()}",
            "",
            f"So tien dung hom nay: {_format_money(total_expense)}",
            f"Doanh thu hom nay: {_format_money(total_income)}",
            f"So tien con lai: {_format_money(remaining)}",
        ],
    )


def build_test_message(note: str | None = None, settings: TelegramSettings | None = None) -> str:
    settings = settings or load_telegram_settings()
    now = datetime.now(settings.timezone)

    lines = [
        "🚀 TabLife test notification",
        f"Date: {now.date().isoformat()}",
        f"Time: {now.strftime('%H:%M')}",
        f"Timezone: {settings.timezone.key}",
        "",
        "Telegram connection is working normally.",
    ]

    cleaned_note = (note or "").strip()
    if cleaned_note:
        lines.extend(["", f"Note: {cleaned_note}"])

    lines.extend(
        [
            "",
            "Status:",
            "• Bot token is configured",
            "• Chat ID is configured",
            "• Backend can send Telegram messages",
        ]
    )

    return "\n".join(lines)


def send_telegram_message(message: str, settings: TelegramSettings | None = None) -> None:
    settings = settings or load_telegram_settings()
    if not settings.token:
        raise ValueError("Missing Telegram bot token")
    if not settings.chat_id:
        raise ValueError("Missing Telegram chat_id")

    payload = json.dumps(
        {"chat_id": settings.chat_id, "text": message},
        ensure_ascii=False,
    ).encode("utf-8")
    request = urllib.request.Request(
        f"https://api.telegram.org/bot{settings.token}/sendMessage",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            response.read()
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram API error {exc.code}: {detail}") from exc


def run_today_tasks_notification(now: datetime | None = None) -> int:
    settings = load_telegram_settings()
    if not settings.notification or not settings.today_task:
        return 0
    if not settings.token or not settings.chat_id:
        return 0

    now = now or datetime.now(settings.timezone)
    if now < _today_reminder_time(now, settings.today_task_time):
        return 0

    target_date = now.date()
    state_key = _today_tasks_state_key(target_date, settings.today_task_time)
    state = _load_state()
    if state.get(state_key, "").startswith("sent:"):
        return 0

    tasks = _get_today_unfinished_tasks(target_date)

    message = _build_today_tasks_message(tasks, target_date)
    _log_due_notification(
        "today_task",
        target_date,
        settings.today_task_time,
        message,
        item_count=len(tasks),
    )
    send_telegram_message(message, settings)
    state[state_key] = f"sent:{now.isoformat(timespec='seconds')}"
    _save_state(state)
    return 1


def run_routine_notification(now: datetime | None = None) -> int:
    settings = load_telegram_settings()
    if not settings.notification or not settings.daily_routine_report:
        return 0
    if not settings.token or not settings.chat_id:
        return 0

    now = now or datetime.now(settings.timezone)
    if now < _today_reminder_time(now, settings.daily_routine_report_time):
        return 0

    target_date = now.date()
    state_key = _routine_state_key(target_date, settings.daily_routine_report_time)
    state = _load_state()
    if state.get(state_key, "").startswith("sent:"):
        return 0

    routines = _get_incomplete_routines(target_date)

    message = _build_routine_message(routines, target_date)
    _log_due_notification(
        "daily_routine_report",
        target_date,
        settings.daily_routine_report_time,
        message,
        item_count=len(routines),
    )
    send_telegram_message(message, settings)
    state[state_key] = f"sent:{now.isoformat(timespec='seconds')}"
    _save_state(state)
    return 1


def run_tomorrow_tasks_notification(now: datetime | None = None) -> int:
    settings = load_telegram_settings()
    if not settings.notification or not settings.schedule_for_tomorrow:
        return 0
    if not settings.token or not settings.chat_id:
        return 0

    now = now or datetime.now(settings.timezone)
    if now < _today_reminder_time(now, settings.schedule_for_tomorrow_time):
        return 0

    target_date = now.date() + timedelta(days=1)
    state_key = _tomorrow_tasks_state_key(target_date, settings.schedule_for_tomorrow_time)
    state = _load_state()
    if state.get(state_key, "").startswith("sent:"):
        return 0

    tasks = _get_tomorrow_tasks(target_date)

    message = _build_tomorrow_tasks_message(tasks, target_date)
    _log_due_notification(
        "schedule_for_tomorrow",
        target_date,
        settings.schedule_for_tomorrow_time,
        message,
        item_count=len(tasks),
    )
    send_telegram_message(message, settings)
    state[state_key] = f"sent:{now.isoformat(timespec='seconds')}"
    _save_state(state)
    return 1


def run_finance_notification(now: datetime | None = None) -> int:
    settings = load_telegram_settings()
    if not settings.notification or not settings.finance_alert:
        return 0
    if not settings.token or not settings.chat_id:
        return 0

    now = now or datetime.now(settings.timezone)
    if now < _today_reminder_time(now, settings.finance_report_time):
        return 0

    target_date = now.date()
    state_key = _finance_state_key_for_date(target_date, settings.finance_report_time)
    state = _load_state()
    if state.get(state_key, "").startswith("sent:"):
        return 0

    summary = _get_daily_finance(target_date)
    total_income = summary["total_income"]
    total_expense = summary["total_expense"]

    message = _build_finance_message(target_date, total_income, total_expense)
    _log_due_notification(
        "finance_alert",
        target_date,
        settings.finance_report_time,
        message,
    )
    send_telegram_message(message, settings)
    state[state_key] = f"sent:{now.isoformat(timespec='seconds')}"
    _save_state(state)
    return 1


def run_all_notifications(now: datetime | None = None) -> int:
    return (
        run_today_tasks_notification(now)
        + run_tomorrow_tasks_notification(now)
        + run_routine_notification(now)
        + run_finance_notification(now)
    )


async def telegram_notification_worker(interval_seconds: int = 10) -> None:
    logger.info("Telegram notification worker started with interval=%ss", max(interval_seconds, 1))
    while True:
        try:
            sent_count = await asyncio.to_thread(run_all_notifications)
            if sent_count:
                logger.info("Notification cycle completed: sent_count=%s", sent_count)
        except Exception as exc:
            logger.exception("Telegram notification error: %s", exc)

        await asyncio.sleep(max(interval_seconds, 1))
