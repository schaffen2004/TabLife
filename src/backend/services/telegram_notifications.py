from __future__ import annotations

import asyncio
import json
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
FINANCE_WARNING_RATIO = 0.8


@dataclass
class TelegramSettings:
    notification: bool = False
    today_task: bool = False
    daily_routine_report: bool = False
    finance_alert: bool = False
    schedule_for_tomorrow: bool = False
    today_task_time: time = DEFAULT_DEADLINE_DAY_TIME
    daily_routine_report_time: time = DEFAULT_ROUTINE_TIME
    finance_alert_time: time = DEFAULT_FINANCE_TIME
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
        finance_alert_time=_parse_time(raw.get("finance_alert_time"), DEFAULT_FINANCE_TIME),
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


def _finance_state_key(year: int, month: int, notify_time: time) -> str:
    return f"finance-80-percent:{year}-{month:02d}:{notify_time.strftime('%H:%M')}"


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
    _mark_suppressed_if_due(_finance_state_key(now.year, now.month, notify_time), notify_time)


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


def _get_monthly_finance(year: int, month: int) -> dict[str, int]:
    from db.connection import get_conn

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM income
                WHERE EXTRACT(YEAR FROM income_date) = %s
                  AND EXTRACT(MONTH FROM income_date) = %s
                """,
                (year, month),
            )
            total_income = int(cur.fetchone()["total"])

            cur.execute(
                """
                SELECT COALESCE(SUM(amount), 0) AS total
                FROM expense
                WHERE EXTRACT(YEAR FROM expense_date) = %s
                  AND EXTRACT(MONTH FROM expense_date) = %s
                """,
                (year, month),
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

    if len(tasks) > 10:
        lines.append(f"More tasks: {len(tasks) - 10}")

    return "\n".join(lines)


def _build_finance_message(total_income: int, total_expense: int, ratio: float) -> str:
    remaining = total_income - total_expense
    return "\n".join(
        [
            "💰 Finance alert",
            f"Month: {datetime.now(get_timezone()).strftime('%Y-%m')}",
            f"Spent ratio: {ratio:.0%}",
            "",
            f"Total income: {_format_money(total_income)}",
            f"Total expense: {_format_money(total_expense)}",
            f"Remaining balance: {_format_money(remaining)}",
        ],
    )


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
    if state_key in state:
        return 0

    tasks = _get_today_unfinished_tasks(target_date)
    if not tasks:
        return 0

    send_telegram_message(_build_today_tasks_message(tasks, target_date), settings)
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
    if state_key in state:
        return 0

    routines = _get_incomplete_routines(target_date)
    if not routines:
        return 0

    send_telegram_message(_build_routine_message(routines, target_date), settings)
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
    if state_key in state:
        return 0

    tasks = _get_tomorrow_tasks(target_date)
    if not tasks:
        return 0

    send_telegram_message(_build_tomorrow_tasks_message(tasks, target_date), settings)
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
    if now < _today_reminder_time(now, settings.finance_alert_time):
        return 0

    state_key = _finance_state_key(now.year, now.month, settings.finance_alert_time)
    state = _load_state()
    if state_key in state:
        return 0

    summary = _get_monthly_finance(now.year, now.month)
    total_income = summary["total_income"]
    total_expense = summary["total_expense"]
    if total_income <= 0:
        return 0

    ratio = total_expense / total_income
    if ratio < FINANCE_WARNING_RATIO:
        return 0

    send_telegram_message(_build_finance_message(total_income, total_expense, ratio), settings)
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
    while True:
        try:
            await asyncio.to_thread(run_all_notifications)
        except Exception as exc:
            print(f"Telegram notification error: {exc}")

        await asyncio.sleep(max(interval_seconds, 1))
